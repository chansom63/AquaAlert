import type { ComplaintRecord, ComplaintStatus } from '../types/water';
import { api } from '../api/client';
import { allApiRecords, type ApiRecord } from '../api/adminRecords';
import { DEMO_COMPLAINTS } from '../data/demoComplaintsData';

const DISMISSED_STORAGE_KEY = 'aquaalert_dismissed_complaints';
const OVERRIDES_STORAGE_KEY = 'aquaalert_complaint_overrides';
const SUBMITTED_STORAGE_KEY = 'aquaalert_submitted_complaints';

/**
 * Get the set of complaint IDs that have been dismissed / deleted by admin
 */
export const getDismissedComplaintIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map(String));
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return new Set<string>();
};

/**
 * Record a dismissed complaint ID in localStorage and notify all active listeners
 */
export const recordDismissedComplaintId = (complaintId: string): void => {
  try {
    const current = getDismissedComplaintIds();
    current.add(complaintId);
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(current)));

    // Also remove from locally submitted complaints if present
    const submitted = getLocallySubmittedComplaints().filter(
      c => c.complaintId !== complaintId && c.reference !== complaintId
    );
    localStorage.setItem(SUBMITTED_STORAGE_KEY, JSON.stringify(submitted));

    // Dispatch custom event for real-time sync across React components in the same window
    window.dispatchEvent(
      new CustomEvent('aquaalert:complaint-dismissed', { detail: { complaintId } })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get status / detail overrides for complaints updated by admin
 */
export const getComplaintOverrides = (): Record<string, Partial<ComplaintRecord>> => {
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
};

/**
 * Record an update override for a complaint and notify all active listeners
 */
export const recordComplaintOverride = (
  complaintId: string,
  updates: Partial<ComplaintRecord>
): void => {
  try {
    const current = getComplaintOverrides();
    current[complaintId] = { ...(current[complaintId] || {}), ...updates };
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(current));

    // Also update locally submitted complaints if present
    const submitted = getLocallySubmittedComplaints().map(c =>
      c.complaintId === complaintId || c.reference === complaintId
        ? { ...c, ...updates, updatedAt: new Date().toISOString() }
        : c
    );
    localStorage.setItem(SUBMITTED_STORAGE_KEY, JSON.stringify(submitted));

    window.dispatchEvent(
      new CustomEvent('aquaalert:complaint-updated', { detail: { complaintId, updates } })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get locally submitted complaints (to guarantee they persist even across reloads)
 */
export const getLocallySubmittedComplaints = (): ComplaintRecord[] => {
  try {
    const raw = localStorage.getItem(SUBMITTED_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr;
      }
    }
  } catch {
    // Ignore
  }
  return [];
};

/**
 * Save a newly submitted complaint to localStorage
 */
export const recordLocallySubmittedComplaint = (complaint: ComplaintRecord): void => {
  try {
    const current = getLocallySubmittedComplaints();
    const updated = [complaint, ...current.filter(c => c.complaintId !== complaint.complaintId)];
    localStorage.setItem(SUBMITTED_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
    window.dispatchEvent(
      new CustomEvent('aquaalert:complaint-created', { detail: { complaint } })
    );
  } catch {
    // Ignore
  }
};

/**
 * Normalize and filter a list of complaints:
 * 1. Seed baseline DEMO_COMPLAINTS so demo data always remains available alongside new submissions
 * 2. Filter out dismissed complaints
 * 3. Apply status and resolution overrides
 * 4. Merge remote items and locally submitted complaints
 */
export const sanitizeAndFilterComplaints = (
  items: ComplaintRecord[] = [],
  includeBaselineDemo: boolean = true
): ComplaintRecord[] => {
  const dismissed = getDismissedComplaintIds();
  const overrides = getComplaintOverrides();
  const localItems = getLocallySubmittedComplaints();

  // Combine items and locally submitted, deduplicating by complaintId / reference
  const map = new Map<string, ComplaintRecord>();

  // 1. Seed baseline demo complaints first (so baseline data is never wiped out)
  if (includeBaselineDemo) {
    for (const demo of DEMO_COMPLAINTS) {
      const id = demo.complaintId || demo.reference;
      if (!id || dismissed.has(id) || (demo.reference && dismissed.has(demo.reference))) {
        continue;
      }
      const override = overrides[id] || (demo.reference ? overrides[demo.reference] : undefined);
      map.set(id, override ? { ...demo, ...override } : demo);
    }
  }

  // 2. Add remote items
  for (const item of items) {
    const id = item.complaintId || item.reference;
    if (!id || dismissed.has(id) || (item.reference && dismissed.has(item.reference))) {
      continue;
    }
    const override = overrides[id] || (item.reference ? overrides[item.reference] : undefined);
    map.set(id, override ? { ...item, ...override } : item);
  }

  // 3. Overlay local items (highest priority for newly created complaints)
  for (const item of localItems) {
    const id = item.complaintId || item.reference;
    if (!id || dismissed.has(id) || (item.reference && dismissed.has(item.reference))) {
      continue;
    }
    const override = overrides[id] || (item.reference ? overrides[item.reference] : undefined);
    map.set(id, override ? { ...item, ...override } : item);
  }

  const result = Array.from(map.values());
  // Sort newest first
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * Helper to fetch complaints with complete dual-route fallback (/complaints -> /reports -> demo)
 * and automatic synchronization with dismissal / override storage.
 */
export const fetchSyncedComplaints = async (): Promise<ComplaintRecord[]> => {
  let remoteRecords: ComplaintRecord[] = [];

  // 1. First attempt dedicated /complaints endpoint
  try {
    const res = await api<ComplaintRecord[]>('/complaints');
    if (Array.isArray(res) && res.length > 0) {
      remoteRecords = res;
    }
  } catch {
    // /complaints route not yet available on remote, fall through to /reports
  }

  // 2. Fallback: check /reports table for citizen grievances
  if (remoteRecords.length === 0) {
    try {
      const res = await allApiRecords('/reports');
      const citizenItems = (res || []).filter((r: ApiRecord) => {
        const typeStr = String(r.reportType || '').toLowerCase();
        const titleStr = String(r.title || '').toLowerCase();
        return (
          typeStr.includes('citizen') ||
          typeStr.includes('complaint') ||
          titleStr.includes('citizen') ||
          titleStr.includes('complaint')
        );
      });

      if (citizenItems.length > 0) {
        remoteRecords = citizenItems.map((r: ApiRecord) => {
          const id = String(r.reportId || `AA-CMP-${r.id || Date.now()}`);
          const rawStatus = String(r.status || r.verificationStatus || 'PENDING').toUpperCase();
          let status: ComplaintStatus = 'PENDING';
          if (rawStatus === 'RESOLVED') status = 'RESOLVED';
          else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'INVESTIGATING') status = 'IN_PROGRESS';
          else if (rawStatus === 'ASSIGNED') status = 'ASSIGNED';
          else if (rawStatus === 'REJECTED' || rawStatus === 'DISMISSED' || rawStatus.includes('REJECT')) {
            status = 'REJECTED';
          }

          const rawPriority = String(r.priority || 'HIGH').toUpperCase();
          const priority = rawPriority === 'CRITICAL' ? 'CRITICAL' : rawPriority === 'LOW' ? 'LOW' : 'HIGH';

          return {
            complaintId: id,
            reference: id,
            sourceId: r.sourceId ? String(r.sourceId) : undefined,
            sourceName: r.sourceName ? String(r.sourceName) : undefined,
            category: String(r.category || r.title || 'Water quality concern'),
            wardNumber: Number(r.wardNumber || (String(r.sourceId || '').match(/\d+/)?.[0] ?? 14)),
            details: String(r.notes || r.details || ''),
            citizenName: String(r.citizenName || r.uploadedBy || 'Citizen Reporter'),
            citizenPhone: r.citizenPhone ? String(r.citizenPhone) : undefined,
            status,
            priority,
            photoName: r.filename ? String(r.filename) : undefined,
            photoUrl: r.downloadUrl ? String(r.downloadUrl) : undefined,
            s3Key: r.s3Key ? String(r.s3Key) : undefined,
            s3Bucket: r.s3Bucket ? String(r.s3Bucket) : 'waterq-dev-evidence-files',
            createdAt: String(r.uploadedAt || r.createdAt || new Date().toISOString()),
            updatedAt: String(r.updatedAt || r.uploadedAt || new Date().toISOString()),
          };
        });
      }
    } catch (err) {
      console.warn('Fallback reports fetch warning:', err);
    }
  }

  // Always merge remote records with baseline DEMO_COMPLAINTS and local submissions!
  return sanitizeAndFilterComplaints(remoteRecords, true);
};

/**
 * Execute comprehensive backend dismissal: deletes from /complaints and /reports
 * and updates local tracking immediately.
 */
export const dismissComplaintEverywhere = async (complaintId: string): Promise<void> => {
  // Immediately persist dismissal locally so UI removes it without waiting for network
  recordDismissedComplaintId(complaintId);

  // 1. Attempt DELETE /complaints/{id}
  try {
    await api(`/complaints/${encodeURIComponent(complaintId)}`, { method: 'DELETE' });
  } catch {
    // Expected if route not deployed yet
  }

  // 2. Also attempt DELETE /reports/{id} (in case complaint was registered in reports table)
  try {
    await api(`/reports/${encodeURIComponent(complaintId)}`, { method: 'DELETE' });
  } catch {
    // Ignore
  }
};

/**
 * Execute comprehensive backend update: updates /complaints and /reports
 * and updates local tracking immediately.
 */
export const updateComplaintEverywhere = async (
  complaintId: string,
  updates: Partial<ComplaintRecord>
): Promise<void> => {
  recordComplaintOverride(complaintId, updates);

  // If status is REJECTED / DISMISSED, also treat as dismissed if requested
  if (updates.status === 'REJECTED') {
    // Still kept in storage override so if displayed, shows DISMISSED
  }

  // 1. Attempt PUT /complaints/{id}
  try {
    await api(`/complaints/${encodeURIComponent(complaintId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } catch {
    // Ignore
  }

  // 2. Attempt PUT /reports/{id}
  try {
    const verificationStatus =
      updates.status === 'REJECTED'
        ? 'REJECTED_ANOMALY'
        : updates.status === 'RESOLVED'
        ? 'LAB_VERIFIED'
        : updates.status || 'PENDING';

    await api(`/reports/${encodeURIComponent(complaintId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...updates,
        verificationStatus,
        status: updates.status,
      }),
    });
  } catch {
    // Ignore
  }
};

// Cross-tab synchronization via standard browser 'storage' events
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === DISMISSED_STORAGE_KEY && e.newValue) {
      try {
        const arr = JSON.parse(e.newValue);
        if (Array.isArray(arr)) {
          for (const id of arr) {
            window.dispatchEvent(
              new CustomEvent('aquaalert:complaint-dismissed', { detail: { complaintId: id } })
            );
          }
        }
      } catch {
        // Ignore parse error
      }
    } else if (e.key === OVERRIDES_STORAGE_KEY && e.newValue) {
      try {
        const overrides = JSON.parse(e.newValue);
        if (typeof overrides === 'object' && overrides !== null) {
          for (const [complaintId, updates] of Object.entries(overrides)) {
            window.dispatchEvent(
              new CustomEvent('aquaalert:complaint-updated', {
                detail: { complaintId, updates: updates as Partial<ComplaintRecord> },
              })
            );
          }
        }
      } catch {
        // Ignore parse error
      }
    } else if (e.key === SUBMITTED_STORAGE_KEY && e.newValue) {
      try {
        const submitted = JSON.parse(e.newValue);
        if (Array.isArray(submitted) && submitted.length > 0) {
          for (const item of submitted) {
            window.dispatchEvent(
              new CustomEvent('aquaalert:complaint-created', { detail: { complaint: item } })
            );
          }
        }
      } catch {
        // Ignore parse error
      }
    }
  });
}

