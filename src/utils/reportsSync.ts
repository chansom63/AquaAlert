import { allApiRecords } from '../api/adminRecords';
import { api } from '../api/client';
import type { LabReportRecord } from '../hooks/useAdminTablesData';

const LOCAL_REPORTS_KEY = 'aquaalert_local_reports';
const DELETED_REPORTS_KEY = 'aquaalert_deleted_reports';
const REPORT_OVERRIDES_KEY = 'aquaalert_report_overrides';

export const BASELINE_DEMO_REPORTS: LabReportRecord[] = [
  {
    reportId: 'REP-GWL-2026-001',
    title: 'Ward 14 Maharaj Bada Spectroscopic Chemical Assay',
    reportType: 'Lab Chemical Assay',
    sourceId: 'gmc-ward-14',
    sourceName: 'Maharaj Bada Distribution Reservoir',
    wardNumber: 14,
    labName: 'Central Public Health & Environmental Engineering Lab, Gwalior',
    nablCertNumber: 'NABL-TC-8491-2026',
    chemistName: 'Dr. S. Mukherjee (TC-8491)',
    sampleId: 'SMP-2026-W14-01',
    collectedAt: '2026-10-24T07:30:00Z',
    uploadedAt: '2026-10-24T10:24:00Z',
    uploadedBy: 'Dr. S. Mukherjee',
    verificationStatus: 'LAB_VERIFIED',
    s3Bucket: 'waterq-dev-evidence-files',
    s3Key: 'reports/lab-reports/gmc-ward-14/ward14_spectroscopic_assay_2026.pdf',
    s3Uri: 's3://waterq-dev-evidence-files/reports/lab-reports/gmc-ward-14/ward14_spectroscopic_assay_2026.pdf',
    filename: 'ward14_spectroscopic_assay_2026.pdf',
    downloadUrl: '/sample-reports/ward14_spectroscopic_assay_2026.pdf',
    fileSizeFormatted: '1.4 MB',
    notes: 'Consolidated water quality overview, key findings, alerts, and response actions for Maharaj Bada across Gwalior Municipal Water Grid.',
    verdict: 'Compliant with BIS IS 10500:2012 potable water parameters.',
    testParameters: {
      pH: { value: 7.18, unit: 'pH' },
      Turbidity: { value: 0.42, unit: 'NTU' },
      TDS: { value: 248, unit: 'mg/L' },
      Fluoride: { value: 0.72, unit: 'mg/L' },
    },
  },
  {
    reportId: 'REP-GWL-2026-002',
    title: 'Ward 28 Chlorine Depletion Investigative Field Report',
    reportType: 'Incident Investigation',
    sourceId: 'gmc-ward-28',
    sourceName: 'Thatipur Feeder Main',
    wardNumber: 28,
    labName: 'Gwalior Municipal Corporation Mobile Screening Unit',
    nablCertNumber: 'GMC-SURV-2026-08',
    chemistName: 'Zonal Inspector P. Sharma',
    sampleId: 'SMP-2026-W28-03',
    collectedAt: '2026-10-26T11:15:00Z',
    uploadedAt: '2026-10-26T14:10:00Z',
    uploadedBy: 'Zonal Inspector P. Sharma',
    verificationStatus: 'PENDING_REVIEW',
    s3Bucket: 'waterq-dev-evidence-files',
    s3Key: 'reports/inspection-sheets/gmc-ward-28/ward28_chlorine_depletion_investigation.pdf',
    s3Uri: 's3://waterq-dev-evidence-files/reports/inspection-sheets/gmc-ward-28/ward28_chlorine_depletion_investigation.pdf',
    filename: 'ward28_chlorine_depletion_investigation.pdf',
    downloadUrl: '/sample-reports/ward28_chlorine_depletion_investigation.pdf',
    fileSizeFormatted: '890 KB',
    notes: 'Emergency surveillance log documenting booster dosing response following residual chlorine dip.',
    testParameters: {
      'Residual Chlorine': { value: 0.08, unit: 'mg/L' },
      pH: { value: 7.82, unit: 'pH' },
      TDS: { value: 310, unit: 'mg/L' },
    },
  },
  {
    reportId: 'REP-GWL-2026-003',
    title: 'Ward 07 Feeder Turbidity Spectrophotometry Test',
    reportType: 'Lab Verification Report',
    sourceId: 'gmc-ward-07',
    sourceName: 'Hazira Distribution Tank',
    wardNumber: 7,
    labName: 'State Water & Sanitation Mission Regional Laboratory',
    nablCertNumber: 'NABL-TC-6102-2026',
    chemistName: 'NABL Analytical Chemist R. Verma',
    sampleId: 'SMP-2026-W07-02',
    collectedAt: '2026-10-28T09:40:00Z',
    uploadedAt: '2026-10-28T11:30:00Z',
    uploadedBy: 'R. Verma',
    verificationStatus: 'LAB_VERIFIED',
    s3Bucket: 'waterq-dev-evidence-files',
    s3Key: 'reports/lab-reports/gmc-ward-07/ward07_feeder_turbidity_spectrophotometry.pdf',
    s3Uri: 's3://waterq-dev-evidence-files/reports/lab-reports/gmc-ward-07/ward07_feeder_turbidity_spectrophotometry.pdf',
    filename: 'ward07_feeder_turbidity_spectrophotometry.pdf',
    downloadUrl: '/sample-reports/ward07_feeder_turbidity_spectrophotometry.pdf',
    fileSizeFormatted: '1.1 MB',
    notes: 'Statutory verification report validating clarity following sediment backwash.',
    testParameters: {
      Turbidity: { value: 0.95, unit: 'NTU' },
      TDS: { value: 420, unit: 'mg/L' },
      'Free Chlorine': { value: 0.45, unit: 'mg/L' },
    },
  },
  {
    reportId: 'REP-GWL-2026-004',
    title: 'Ward 01 Deep Tubewell Casing Sanitary Audit',
    reportType: 'Quarterly Sanitary Audit',
    sourceId: 'gmc-ward-01',
    sourceName: 'Morar Urban Health Centre Tubewell',
    wardNumber: 1,
    labName: 'GMC Groundwater Quality Monitoring Cell',
    nablCertNumber: 'GWL-GW-9021',
    chemistName: 'Dr. Anita Roy, Hydrogeologist',
    sampleId: 'SMP-2026-W01-04',
    collectedAt: '2026-10-30T08:00:00Z',
    uploadedAt: '2026-10-30T10:15:00Z',
    uploadedBy: 'Dr. Anita Roy',
    verificationStatus: 'LAB_VERIFIED',
    s3Bucket: 'waterq-dev-evidence-files',
    s3Key: 'reports/audit-certificates/gmc-ward-01/ward01_tubewell_casing_integrity.pdf',
    s3Uri: 's3://waterq-dev-evidence-files/reports/audit-certificates/gmc-ward-01/ward01_tubewell_casing_integrity.pdf',
    filename: 'ward01_tubewell_casing_integrity.pdf',
    downloadUrl: '/sample-reports/ward01_tubewell_casing_integrity.pdf',
    fileSizeFormatted: '1.8 MB',
    notes: 'Structural bore casing and microbiological ingress screening report for deep aquifer pump.',
    testParameters: {
      pH: { value: 7.24, unit: 'pH' },
      TDS: { value: 380, unit: 'mg/L' },
      Coliform: { value: 0, unit: 'MPN/100mL' },
    },
  },
  {
    reportId: 'REP-GWL-2026-005',
    title: 'Ward 58 Padav Sector Microbiological Clearance Test',
    reportType: 'Microbiology Culture Report',
    sourceId: 'gmc-ward-58',
    sourceName: 'Padav Commercial Junction Booster',
    wardNumber: 58,
    labName: 'Central Public Health & Environmental Engineering Lab, Gwalior',
    nablCertNumber: 'NABL-TC-8491-2026',
    chemistName: 'Microbiologist S. K. Gupta',
    sampleId: 'SMP-2026-W58-01',
    collectedAt: '2026-11-01T15:00:00Z',
    uploadedAt: '2026-11-01T17:30:00Z',
    uploadedBy: 'S. K. Gupta',
    verificationStatus: 'LAB_VERIFIED',
    s3Bucket: 'waterq-dev-evidence-files',
    s3Key: 'reports/lab-reports/gmc-ward-58/ward58_padav_post_flush_clearance.pdf',
    s3Uri: 's3://waterq-dev-evidence-files/reports/lab-reports/gmc-ward-58/ward58_padav_post_flush_clearance.pdf',
    filename: 'ward58_padav_post_flush_clearance.pdf',
    downloadUrl: '/sample-reports/ward58_padav_post_flush_clearance.pdf',
    fileSizeFormatted: '920 KB',
    notes: 'Membrane filter assay certifying zero E. coli colony formation post valve line flush.',
    testParameters: {
      'E. coli': { value: 0, unit: 'CFU/100mL' },
      Turbidity: { value: 0.45, unit: 'NTU' },
      'Residual Chlorine': { value: 0.52, unit: 'mg/L' },
    },
  },
];

/**
 * Extracts a numeric timestamp from a report for reliable descending sorting.
 */
export const getReportTimestamp = (report: Partial<LabReportRecord>): number => {
  const val = report.uploadedAt || report.collectedAt || (report as Record<string, unknown>).createdAt;
  if (!val) return 0;
  const ms = new Date(String(val)).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Sorts reports descending by upload/generation timestamp (newest first).
 */
export const sortReportsDesc = (reports: LabReportRecord[]): LabReportRecord[] => {
  return [...reports].sort((a, b) => getReportTimestamp(b) - getReportTimestamp(a));
};

export const getDeletedReportIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_REPORTS_KEY);
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

export const recordDeletedReportId = (reportId: string): void => {
  try {
    const current = getDeletedReportIds();
    current.add(reportId);
    localStorage.setItem(DELETED_REPORTS_KEY, JSON.stringify(Array.from(current)));

    const local = getLocallyCreatedReports().filter(r => r.reportId !== reportId);
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(local));

    window.dispatchEvent(
      new CustomEvent('aquaalert:report-deleted', { detail: { reportId } })
    );
  } catch {
    // Ignore storage errors
  }
};

export const getReportOverrides = (): Record<string, Partial<LabReportRecord>> => {
  try {
    const raw = localStorage.getItem(REPORT_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, Partial<LabReportRecord>>;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
};

export const recordReportOverride = (reportId: string, updates: Partial<LabReportRecord>): void => {
  try {
    const current = getReportOverrides();
    current[reportId] = { ...(current[reportId] || {}), ...updates };
    localStorage.setItem(REPORT_OVERRIDES_KEY, JSON.stringify(current));

    window.dispatchEvent(
      new CustomEvent('aquaalert:report-updated', { detail: { reportId, updates } })
    );
  } catch {
    // Ignore storage errors
  }
};

export const getLocallyCreatedReports = (): LabReportRecord[] => {
  try {
    const raw = localStorage.getItem(LOCAL_REPORTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as LabReportRecord[];
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
};

export const recordLocallyUploadedReport = (report: LabReportRecord): void => {
  try {
    const current = getLocallyCreatedReports().filter(r => r.reportId !== report.reportId);
    const updated = [report, ...current];
    localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent('aquaalert:report-created', { detail: report })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Normalizes, merges, and sorts reports:
 * 1. Seeds BASELINE_DEMO_REPORTS so statutory certificates and assays are never wiped out
 * 2. Overlays remote records from DynamoDB /reports table
 * 3. Overlays locally uploaded documents (highest priority)
 * 4. Filters out deleted reports and applies overrides
 * 5. Sorts newest-first
 */
export const sanitizeAndFilterReports = (
  items: LabReportRecord[] = [],
  includeBaselineDemo: boolean = true
): LabReportRecord[] => {
  const deleted = getDeletedReportIds();
  const overrides = getReportOverrides();
  const localItems = getLocallyCreatedReports();

  const map = new Map<string, LabReportRecord>();

  // 1. Baseline demo reports
  if (includeBaselineDemo) {
    for (const demo of BASELINE_DEMO_REPORTS) {
      if (!demo.reportId || deleted.has(demo.reportId)) continue;
      const override = overrides[demo.reportId];
      map.set(demo.reportId, override ? { ...demo, ...override } : demo);
    }
  }

  // 2. Remote items from database
  for (const item of items) {
    if (!item.reportId || deleted.has(item.reportId)) continue;
    const override = overrides[item.reportId];
    const normalized: LabReportRecord = {
      ...item,
      s3Bucket: item.s3Bucket || 'waterq-dev-evidence-files',
      s3Key: item.s3Key || `reports/lab-reports/${item.sourceId || 'gmc'}/${item.reportId}.pdf`,
      s3Uri: item.s3Uri || `s3://waterq-dev-evidence-files/${item.s3Key || item.reportId}.pdf`,
      filename: item.filename || 'report.pdf',
    };
    map.set(item.reportId, override ? { ...normalized, ...override } : normalized);
  }

  // 3. Local items
  for (const item of localItems) {
    if (!item.reportId || deleted.has(item.reportId)) continue;
    const override = overrides[item.reportId];
    const normalized: LabReportRecord = {
      ...item,
      s3Bucket: item.s3Bucket || 'waterq-dev-evidence-files',
      s3Key: item.s3Key || `reports/lab-reports/${item.sourceId || 'gmc'}/${item.reportId}.pdf`,
      s3Uri: item.s3Uri || `s3://waterq-dev-evidence-files/${item.s3Key || item.reportId}.pdf`,
      filename: item.filename || 'report.pdf',
    };
    map.set(item.reportId, override ? { ...normalized, ...override } : normalized);
  }

  return sortReportsDesc(Array.from(map.values()));
};

/**
 * Fetches reports from Central Database, ensuring baseline demo reports are preserved.
 */
export const fetchSyncedReports = async (): Promise<LabReportRecord[]> => {
  let remoteRecords: LabReportRecord[] = [];
  try {
    const res = await allApiRecords('/reports');
    if (Array.isArray(res) && res.length > 0) {
      remoteRecords = (res as unknown) as LabReportRecord[];
    }
  } catch (err) {
    console.warn('Central Database reports fetch notice:', err);
  }
  return sanitizeAndFilterReports(remoteRecords, true);
};

/**
 * Checks whether an Amazon S3 presigned URL is expired or close to expiring (within 30s buffer).
 */
export const isPresignedUrlExpired = (urlStr?: string): boolean => {
  if (!urlStr) return true;
  if (urlStr.startsWith('blob:') || urlStr.startsWith('/sample-reports/')) {
    return false;
  }
  try {
    const u = new URL(urlStr);
    const dateStr = u.searchParams.get('X-Amz-Date');
    const expiresStr = u.searchParams.get('X-Amz-Expires');
    if (dateStr && expiresStr) {
      const year = parseInt(dateStr.slice(0, 4), 10);
      const month = parseInt(dateStr.slice(4, 6), 10) - 1;
      const day = parseInt(dateStr.slice(6, 8), 10);
      const hours = parseInt(dateStr.slice(9, 11), 10);
      const minutes = parseInt(dateStr.slice(11, 13), 10);
      const seconds = parseInt(dateStr.slice(13, 15), 10);
      const createdMs = Date.UTC(year, month, day, hours, minutes, seconds);
      const ttlMs = parseInt(expiresStr, 10) * 1000;
      return Date.now() > createdMs + ttlMs - 30000;
    }
  } catch {
    // Ignore URL parse error
  }
  return false;
};

/**
 * Requests a fresh presigned S3 download URL from the backend API for a given report ID or key.
 */
export const fetchFreshReportDownloadUrl = async (
  reportId?: string,
  s3Key?: string
): Promise<string | null> => {
  // 1. Direct fetch using reportId (e.g. REP-1794288247-54DE)
  if (reportId && !reportId.startsWith('EV-GWL-') && !reportId.startsWith('REP-GWL-DEMO')) {
    try {
      const res = await api<{ downloadUrl?: string }>(
        `/reports/${encodeURIComponent(reportId)}/download-url`
      );
      if (res?.downloadUrl) {
        return res.downloadUrl;
      }
    } catch (err) {
      console.warn(`Download URL lookup notice for report ${reportId}:`, err);
    }
  }

  // 2. Fetch using s3Key
  if (s3Key) {
    try {
      const res = await api<{ downloadUrl?: string }>(
        `/reports/${encodeURIComponent(s3Key)}/download-url`
      );
      if (res?.downloadUrl) {
        return res.downloadUrl;
      }
    } catch {}
  }

  return null;
};

/**
 * Downloads a file cleanly in the browser. Tries blob fetch first (for proper filename),
 * falls back to anchor download.
 */
export const triggerDirectFileDownload = async (
  url: string,
  filename: string
): Promise<boolean> => {
  if (!url) return false;
  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Local sample PDF or blob URL
  if (url.startsWith('/sample-reports/') || url.startsWith('blob:')) {
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  }

  // Remote URL (e.g. S3 presigned URL)
  try {
    const resp = await fetch(url);
    if (resp.ok) {
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 30000);
      return true;
    }
  } catch (err) {
    console.warn('Direct blob fetch failed, falling back to anchor download:', err);
  }

  // Fallback: trigger browser download directly via anchor
  const a = document.createElement('a');
  a.href = url;
  a.download = safeFilename;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
};
