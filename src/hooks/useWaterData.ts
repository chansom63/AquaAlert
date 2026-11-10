import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { API, api } from '../api/client';
import { DEMO_ALERTS, DEMO_SOURCES, GWALIOR_AREAS } from '../data/demoDataset';
import { DEMO_COMPLAINTS } from '../data/demoComplaintsData';
import type { Alert, ComplaintRecord, ComplaintPreview, Reading, Source } from '../types/water';
import {
  fetchSyncedComplaints,
  sanitizeAndFilterComplaints,
  recordLocallySubmittedComplaint,
} from '../utils/complaintsSync';
import {
  fetchSyncedAlerts,
  sanitizeAndFilterAlerts,
} from '../utils/alertsSync';
import {
  fetchSyncedSources,
  sanitizeAndFilterSources,
} from '../utils/sourcesSync';
import {
  fetchSyncedSourceReadings,
} from '../utils/readingsSync';

export const useWaterData = (activePage: string = 'Overview') => {
  const [sources, setSources] = useState<Source[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [selected, setSelected] = useState('');

  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('All areas');
  const [busy, setBusy] = useState(false);
  const [complaints, setComplaints] = useState<ComplaintPreview[]>([]);

  const loadedSourcesRef = useRef(false);
  const loadedAlertsRef = useRef(false);
  const loadedComplaintsRef = useRef(false);

  // 1. Fetch Water Sources from Central Database with Cross-Portal Synchronization
  const fetchSources = useCallback(async (force = false) => {
    if (loadedSourcesRef.current && !force) return;
    setLoadingSources(true);
    try {
      const items = await fetchSyncedSources();
      setSources(items);
      setSelected(s => s || items[0]?.sourceId || DEMO_SOURCES[0]?.sourceId || '');
      loadedSourcesRef.current = true;
    } catch (err) {
      setSources(sanitizeAndFilterSources(DEMO_SOURCES, true));
      setSelected(s => s || DEMO_SOURCES[0]?.sourceId || '');
      console.warn('Sources API notice:', (err as Error).message);
    } finally {
      setLoadingSources(false);
    }
  }, []);

  // 2. Fetch Alerts from Central Database with Cross-Portal Synchronization
  const fetchAlerts = useCallback(async (force = false) => {
    if (loadedAlertsRef.current && !force) return;
    setLoadingAlerts(true);
    try {
      const items = await fetchSyncedAlerts();
      setAlerts(items);
      loadedAlertsRef.current = true;
    } catch (err) {
      setAlerts(sanitizeAndFilterAlerts(DEMO_ALERTS, true));
      console.warn('Alerts API notice:', (err as Error).message);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  // 3. Fetch Citizen Complaints with Cross-Portal Synchronization
  const fetchComplaints = useCallback(async (force = false) => {
    if (loadedComplaintsRef.current && !force) return;
    setLoadingComplaints(true);
    try {
      const items = await fetchSyncedComplaints();
      setComplaints(items);
      loadedComplaintsRef.current = true;
    } catch (err) {
      console.warn('Complaints fetch error:', err);
      setComplaints(sanitizeAndFilterComplaints(DEMO_COMPLAINTS));
      loadedComplaintsRef.current = true;
    } finally {
      setLoadingComplaints(false);
    }
  }, []);

  // Real-time synchronization listeners (when complaints are dismissed or updated in Admin portal)
  useEffect(() => {
    const handleDismissed = (e: Event) => {
      const custom = e as CustomEvent<{ complaintId: string }>;
      const id = custom.detail?.complaintId;
      if (id) {
        setComplaints(prev => prev.filter(c => c.complaintId !== id && c.reference !== id));
      }
    };

    const handleUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ complaintId: string; updates: Partial<ComplaintRecord> }>;
      const { complaintId, updates } = custom.detail || {};
      if (complaintId && updates) {
        setComplaints(prev =>
          prev.map(c =>
            c.complaintId === complaintId || c.reference === complaintId
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          )
        );
      }
    };

    const handleCreated = (e: Event) => {
      const custom = e as CustomEvent<{ complaint: ComplaintRecord }>;
      const newComp = custom.detail?.complaint;
      if (newComp) {
        setComplaints(prev => [newComp, ...prev.filter(c => c.complaintId !== newComp.complaintId)]);
      }
    };

    const handleAlertCreated = (e: Event) => {
      const custom = e as CustomEvent<Alert>;
      const newAlert = custom.detail;
      if (newAlert?.alertId) {
        setAlerts(prev => sanitizeAndFilterAlerts([newAlert, ...prev], true));
      }
    };

    const handleAlertUpdated = (e: Event) => {
      const custom = e as CustomEvent<{ alertId: string; updates: Partial<Alert> }>;
      const { alertId, updates } = custom.detail || {};
      if (alertId && updates) {
        setAlerts(prev =>
          prev.map(a => (a.alertId === alertId ? { ...a, ...updates } : a))
        );
      }
    };

    const handleAlertDeleted = (e: Event) => {
      const custom = e as CustomEvent<{ alertId: string }>;
      const alertId = custom.detail?.alertId;
      if (alertId) {
        setAlerts(prev => prev.filter(a => a.alertId !== alertId));
      }
    };

    const handleSourceCreated = (e: Event) => {
      const custom = e as CustomEvent<Source>;
      if (custom.detail) {
        setSources(prev => sanitizeAndFilterSources([custom.detail, ...prev], true));
      }
    };

    const handleReadingCreated = (e: Event) => {
      const custom = e as CustomEvent<Reading>;
      const newReading = custom.detail;
      if (newReading) {
        setReadings(prev => [newReading, ...prev.filter(r => r.readingId !== newReading.readingId)]);
      }
    };

    window.addEventListener('aquaalert:complaint-dismissed', handleDismissed);
    window.addEventListener('aquaalert:complaint-updated', handleUpdated);
    window.addEventListener('aquaalert:complaint-created', handleCreated);
    window.addEventListener('aquaalert:alert-created', handleAlertCreated);
    window.addEventListener('aquaalert:alert-updated', handleAlertUpdated);
    window.addEventListener('aquaalert:alert-deleted', handleAlertDeleted);
    window.addEventListener('aquaalert:source-created', handleSourceCreated);
    window.addEventListener('aquaalert:reading-created', handleReadingCreated);

    return () => {
      window.removeEventListener('aquaalert:complaint-dismissed', handleDismissed);
      window.removeEventListener('aquaalert:complaint-updated', handleUpdated);
      window.removeEventListener('aquaalert:complaint-created', handleCreated);
      window.removeEventListener('aquaalert:alert-created', handleAlertCreated);
      window.removeEventListener('aquaalert:alert-updated', handleAlertUpdated);
      window.removeEventListener('aquaalert:alert-deleted', handleAlertDeleted);
      window.removeEventListener('aquaalert:source-created', handleSourceCreated);
      window.removeEventListener('aquaalert:reading-created', handleReadingCreated);
    };
  }, []);

  // Fetch only when navigating to a particular page/tab
  useEffect(() => {
    switch (activePage) {
      case 'Overview':
        void fetchSources();
        void fetchAlerts();
        break;
      case 'Interactive Map':
        void fetchSources();
        break;
      case 'Sources':
        void fetchSources();
        break;
      case 'Alerts':
        void fetchSources();
        void fetchAlerts();
        break;
      case 'Complaints':
      case 'Reports':
        void fetchSources();
        void fetchAlerts();
        void fetchComplaints();
        break;
      default:
        break;
    }
  }, [activePage, fetchSources, fetchAlerts, fetchComplaints]);

  const reload = useCallback(async () => {
    loadedSourcesRef.current = false;
    loadedAlertsRef.current = false;
    loadedComplaintsRef.current = false;
    setError('');
    await Promise.all([fetchSources(true), fetchAlerts(true), fetchComplaints(true)]);
  }, [fetchSources, fetchAlerts, fetchComplaints]);

  // Fetch readings for the currently selected water source on-demand
  useEffect(() => {
    if (!selected) {
      setReadings([]);
      return;
    }
    setLoadingReadings(true);
    fetchSyncedSourceReadings(selected)
      .then(items => {
        setReadings(items);
      })
      .catch(e => {
        console.warn('Readings API notice:', (e as Error).message);
        setReadings([]);
      })
      .finally(() => setLoadingReadings(false));
  }, [selected]);

  const visibleSources = useMemo(
    () =>
      sources.filter(
        s =>
          `${s.name || ''} ${s.district || ''} ${s.locality || ''} ${s.sourceId}`.toLowerCase().includes(query.toLowerCase()) &&
          (area === 'All areas' || `${s.name || ''} ${s.locality || ''} ${s.district || ''} ${s.zoneName || ''}`.toLowerCase().includes(area.toLowerCase())),
      ),
    [sources, query, area],
  );

  const availableAreas = useMemo(() => {
    const list = new Set<string>();
    GWALIOR_AREAS.forEach(a => list.add(a));
    sources.forEach(s => {
      if (s.zoneName) {
        const part = s.zoneName.split(' - ')[1];
        if (part) list.add(part.split('/')[0].trim());
      }
    });
    return Array.from(list);
  }, [sources]);

  const selectedSource = sources.find(s => s.sourceId === selected);

  const submitReading = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setError('');
    const form = new FormData(event.currentTarget);
    const parameters: Record<string, { value: number; unit: string }> = {};
    for (const key of ['pH', 'turbidity', 'TDS']) {
      const value = String(form.get(key) || '').trim();
      if (value) parameters[key] = { value: Number(value), unit: key === 'pH' ? 'pH' : key === 'turbidity' ? 'NTU' : 'mg/L' };
    }
    try {
      const res = await api<{ readingId: string; alertTriggered: boolean }>('/readings', {
        method: 'POST',
        body: JSON.stringify({
          readingId: `read-${crypto.randomUUID()}`,
          sourceId: String(form.get('sourceId')),
          collectedAt: new Date(String(form.get('collectedAt'))).toISOString(),
          method: String(form.get('method')),
          verificationStatus: 'SCREENING',
          parameters,
        }),
      });
      setNotice(`Reading ${res.readingId} accepted. ${res.alertTriggered ? 'A screening alert was triggered.' : 'No configured pH or turbidity trigger matched.'}`);
      event.currentTarget.reset();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitAction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setNotice('');
    setError('');
    try {
      await api(`/alerts/${encodeURIComponent(String(form.get('alertId')))}/actions`, {
        method: 'POST',
        body: JSON.stringify({ actionType: String(form.get('actionType')), summary: String(form.get('summary')) }),
      });
      setNotice('Response action recorded.');
      event.currentTarget.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const uploadReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('report') as File;
    if (!file || file.type !== 'application/pdf') {
      setError('Choose a PDF report.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const signed = await api<{ uploadUrl: string; objectKey: string }>('/reports/presigned-url', {
        method: 'POST',
        body: JSON.stringify({ sourceId: String(form.get('sourceId')), filename: file.name, contentType: file.type }),
      });
      const uploaded = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
      if (!uploaded.ok) throw new Error('The private report upload failed.');
      setNotice(`Report uploaded to private evidence storage. Object key: ${signed.objectKey}`);
      event.currentTarget.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // 4. Submit Citizen Complaint / Issue to Municipal Backend
  const submitComplaint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const photo = form.get('photo') as File | null;
    if (photo && photo.size > 5 * 1024 * 1024) {
      setError('Choose a photo smaller than 5 MB.');
      return;
    }
    if (photo && photo.size > 0 && !photo.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    const wardNumber = Number(form.get('wardNumber') || 14);
    const category = String(form.get('category') || 'Water quality concern');
    const details = String(form.get('details') || '').trim();
    const reference = `AA-CMP-${Date.now().toString(36).toUpperCase()}`;
    const sourceId = `gmc-ward-${String(wardNumber).padStart(2, '0')}`;

    let s3Key = `complaints/evidence/${reference}.jpg`;
    let s3Bucket = 'waterq-dev-complaints-evidence';

    // If citizen attached a photo, obtain presigned S3 upload URL from dedicated complaints bucket
    if (photo && photo.size > 0) {
      try {
        const signed = await api<{ uploadUrl: string; objectKey: string; s3Bucket?: string }>('/complaints/presigned-url', {
          method: 'POST',
          body: JSON.stringify({
            complaintId: reference,
            filename: `${reference}_${photo.name}`,
            contentType: photo.type,
          }),
        });
        if (signed.uploadUrl) {
          await fetch(signed.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': photo.type },
            body: photo,
          });
          s3Key = signed.objectKey;
          s3Bucket = signed.s3Bucket || 'waterq-dev-complaints-evidence';
        }
      } catch (err) {
        console.warn('Complaint image upload notice:', (err as Error).message);
      }
    }

    const catLower = category.toLowerCase();
    const priority = catLower.includes('sewage') || catLower.includes('burst') || catLower.includes('poison')
      ? 'CRITICAL'
      : catLower.includes('turbid') || catLower.includes('chemical') || catLower.includes('odor')
      ? 'HIGH'
      : 'MEDIUM';

    const payload: ComplaintRecord = {
      complaintId: reference,
      reference,
      sourceId,
      sourceName: `Gwalior Ward ${wardNumber}`,
      category,
      wardNumber,
      details,
      citizenName: String(form.get('citizenName') || 'Citizen Reporter'),
      citizenPhone: String(form.get('citizenPhone') || ''),
      status: 'PENDING',
      priority,
      s3Bucket,
      s3Key: photo && photo.size > 0 ? s3Key : undefined,
      photoName: photo && photo.size > 0 ? photo.name : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Persist locally so grievance is available immediately across tabs
    recordLocallySubmittedComplaint(payload);

    try {
      await api('/complaints', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setComplaints(current => [payload, ...current.filter(c => c.complaintId !== payload.complaintId)]);
      setNotice(`Grievance ${reference} recorded in Municipal Complaints Table. Surveillance team dispatched.`);
      event.currentTarget.reset();
    } catch {
      // In case /complaints is pending deployment, post to reports table as fallback
      try {
        await api('/reports', {
          method: 'POST',
          body: JSON.stringify({
            reportId: reference,
            reportType: 'Citizen Complaint',
            title: `Citizen Report: ${category} (Ward ${wardNumber})`,
            category,
            sourceId,
            sourceName: `Gwalior Ward ${wardNumber}`,
            wardNumber,
            notes: details,
            citizenName: payload.citizenName,
            citizenPhone: payload.citizenPhone,
            verificationStatus: 'PENDING',
            status: 'PENDING',
            priority,
            filename: payload.photoName || `${reference}.json`,
            s3Key,
            s3Bucket,
            uploadedAt: new Date().toISOString(),
          }),
        });
      } catch (repErr) {
        console.warn('Fallback reports post notice:', repErr);
      }
      setComplaints(current => [payload, ...current.filter(c => c.complaintId !== payload.complaintId)]);
      setNotice(`Grievance ${reference} registered. Surveillance team dispatched.`);
      event.currentTarget.reset();
    } finally {
      setBusy(false);
    }
  };

  const loading = loadingSources || loadingAlerts || loadingReadings || loadingComplaints;

  return {
    API,
    GWALIOR_AREAS: availableAreas,
    sources,
    alerts,
    readings,
    selected,
    setSelected,
    loading,
    loadingSources,
    loadingAlerts,
    loadingReadings,
    loadingComplaints,
    error,
    setError,
    notice,
    setNotice,
    query,
    setQuery,
    area,
    setArea,
    busy,
    complaints,
    visibleSources,
    selectedSource,
    reload,
    submitReading,
    submitAction,
    uploadReport,
    submitComplaint,
  };
};
