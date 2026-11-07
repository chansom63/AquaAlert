import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { allApiRecords, recordsFrom, type ApiRecord } from '../api/adminRecords';
import type { Alert, Source } from '../types/water';
import { DEMO_SOURCES, DEMO_ALERTS } from '../data/demoDataset';
import { DEMO_ADMIN_READINGS, DEMO_ADMIN_ACTIONS } from '../data/demoAdminData';
import type { RuleItem, ThresholdStandard } from '../components/admin/RulesThresholdsView';

export interface LabReportRecord {
  reportId: string;
  sourceId: string;
  sourceName?: string;
  wardNumber?: number;
  title?: string;
  reportType?: string;
  labName?: string;
  nablCertNumber?: string;
  chemistName?: string;
  sampleId?: string;
  collectedAt?: string;
  uploadedAt: string;
  uploadedBy?: string;
  verificationStatus?: 'LAB_VERIFIED' | 'PENDING_REVIEW' | 'REJECTED_ANOMALY';
  statutoryStandard?: string;
  verdict?: string;
  testParameters?: Record<string, number | { value: number; unit: string }>;
  notes?: string;
  // S3 Object Pointer
  s3Bucket: string;
  s3Key: string;
  s3Uri: string;
  filename: string;
  contentType?: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  sha256Checksum?: string;
  downloadUrl?: string;
}

export const useAdminTablesData = (activeNav: string = 'Admin Dashboard') => {
  const [sources, setSources] = useState<Source[]>([]);
  const [readings, setReadings] = useState<ApiRecord[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [actions, setActions] = useState<ApiRecord[]>([]);
  const [reports, setReports] = useState<LabReportRecord[]>([]);
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdStandard[]>([]);

  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [loadingThresholds, setLoadingThresholds] = useState(false);
  const [error, setError] = useState('');

  const loadedSourcesRef = useRef(false);
  const loadedReadingsRef = useRef(false);
  const loadedAlertsRef = useRef(false);
  const loadedActionsRef = useRef(false);
  const loadedReportsRef = useRef(false);
  const loadedRulesRef = useRef(false);
  const loadedThresholdsRef = useRef(false);

  const fetchSources = useCallback(async (force = false) => {
    if (loadedSourcesRef.current && !force) return;
    setLoadingSources(true);
    try {
      const res = await api<unknown>('/sources');
      const items = recordsFrom(res) as Source[];
      setSources(items.length > 0 ? items : DEMO_SOURCES);
      loadedSourcesRef.current = true;
    } catch (err) {
      setSources(DEMO_SOURCES);
      console.warn('Sources API notice:', (err as Error).message);
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const fetchAlerts = useCallback(async (force = false) => {
    if (loadedAlertsRef.current && !force) return;
    setLoadingAlerts(true);
    try {
      const res = await allApiRecords('/alerts');
      const items = res as Alert[];
      setAlerts(items.length > 0 ? items : DEMO_ALERTS);
      loadedAlertsRef.current = true;
    } catch (err) {
      setAlerts(DEMO_ALERTS);
      console.warn('Alerts API notice:', (err as Error).message);
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  const fetchReadings = useCallback(async (force = false) => {
    if (loadedReadingsRef.current && !force) return;
    setLoadingReadings(true);
    try {
      const res = await allApiRecords('/readings');
      setReadings(res.length > 0 ? res : DEMO_ADMIN_READINGS);
      loadedReadingsRef.current = true;
    } catch (err) {
      setReadings(DEMO_ADMIN_READINGS);
      console.warn('Readings API notice:', (err as Error).message);
    } finally {
      setLoadingReadings(false);
    }
  }, []);

  const fetchActions = useCallback(async (force = false) => {
    if (loadedActionsRef.current && !force) return;
    setLoadingActions(true);
    try {
      const res = await allApiRecords('/actions');
      setActions(res.length > 0 ? res : DEMO_ADMIN_ACTIONS);
      loadedActionsRef.current = true;
    } catch (err) {
      setActions(DEMO_ADMIN_ACTIONS);
      console.warn('Actions API notice:', (err as Error).message);
    } finally {
      setLoadingActions(false);
    }
  }, []);

  const fetchReports = useCallback(async (force = false) => {
    if (loadedReportsRef.current && !force) return;
    setLoadingReports(true);
    try {
      const res = await allApiRecords('/reports');
      setReports((res as unknown) as LabReportRecord[]);
      loadedReportsRef.current = true;
    } catch (err) {
      setError(`Could not load lab reports from API: ${(err as Error).message}`);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const fetchRules = useCallback(async (force = false) => {
    if (loadedRulesRef.current && !force) return;
    setLoadingRules(true);
    try {
      const res = await allApiRecords('/rules').catch(() => allApiRecords('/rules-thresholds'));
      if (res && res.length > 0) {
        const normalized = (res as Record<string, unknown>[]).map(r => {
          const ruleId = String(r.ruleId || '');
          const version = String(r.version || 'v1.0');
          const effectiveFrom = String(r.effectiveFrom || '2026-10-24T00:00:00Z');
          return {
            ...r,
            ruleId,
            parameter: String(r.parameter || ''),
            parameterName: String(r.parameterName || r.parameter || ''),
            condition: String(r.condition || ''),
            operator: (r.operator || '>') as RuleItem['operator'],
            threshold: String(r.threshold || ''),
            numericThreshold: typeof r.numericThreshold === 'number' ? r.numericThreshold : parseFloat(String(r.threshold || '0')) || 0,
            unit: String(r.unit || ''),
            severity: (r.severity || 'Critical') as RuleItem['severity'],
            version,
            status: (r.status || 'Active') as RuleItem['status'],
            effectiveFrom,
            standardRef: String(r.standardRef || 'BIS IS 10500:2012'),
            standardClause: String(r.standardClause || 'Table 1'),
            category: (r.category || 'Chemical') as RuleItem['category'],
            publicWording: String(r.publicWording || `${r.parameter || 'Water quality'} has breached the statutory threshold limit.`),
            rationale: String(r.rationale || 'Potability specification breached according to Bureau of Indian Standards.'),
            history: Array.isArray(r.history) && r.history.length > 0
              ? (r.history as RuleItem['history'])
              : [
                  {
                    version,
                    desc: 'Baseline calibration aligned with BIS IS 10500:2012 specifications.',
                    date: effectiveFrom.slice(0, 10),
                  },
                ],
          };
        });
        setRules(normalized as unknown as RuleItem[]);
      }
      loadedRulesRef.current = true;
    } catch (err) {
      console.warn('Rules API notice:', (err as Error).message);
    } finally {
      setLoadingRules(false);
    }
  }, []);

  const fetchThresholds = useCallback(async (force = false) => {
    if (loadedThresholdsRef.current && !force) return;
    setLoadingThresholds(true);
    try {
      const res = await allApiRecords('/thresholds').catch(() => allApiRecords('/standards'));
      if (res && res.length > 0) {
        const normalized = (res as Record<string, unknown>[]).map(t => {
          const id = String(t.id || t.parameterId || '');
          return {
            ...t,
            id,
            parameterId: id,
            parameter: String(t.parameter || id),
            chemicalFormula: String(t.chemicalFormula || ''),
            category: (t.category || 'Chemical') as ThresholdStandard['category'],
            acceptableLimit: String(t.acceptableLimit || '—'),
            permissibleLimit: String(t.permissibleLimit || '—'),
            unit: String(t.unit || 'mg/L'),
            standardReference: String(t.standardReference || 'BIS IS 10500:2012'),
            clause: String(t.clause || 'Table 1'),
            sensorMethod: String(t.sensorMethod || 'Standard Laboratory Assay'),
            healthImpact: String(t.healthImpact || 'Contaminant breach above statutory tolerance threshold.'),
            surveillanceFrequency: String(t.surveillanceFrequency || 'Daily Telemetry'),
            enforcingRuleIds: Array.isArray(t.enforcingRuleIds) ? (t.enforcingRuleIds as string[]) : [],
            enforcementStatus: (t.enforcementStatus || 'Mandatory Legal Limit') as ThresholdStandard['enforcementStatus'],
            description: String(t.description || ''),
          };
        });
        setThresholds(normalized as unknown as ThresholdStandard[]);
      }
      loadedThresholdsRef.current = true;
    } catch (err) {
      console.warn('Thresholds API notice:', (err as Error).message);
    } finally {
      setLoadingThresholds(false);
    }
  }, []);

  useEffect(() => {
    // Lazy on-demand fetching: only fetch records required for the currently active tab/page!
    switch (activeNav) {
      case 'Admin Dashboard':
        void fetchSources();
        void fetchAlerts();
        void fetchReports();
        void fetchReadings();
        void fetchActions();
        void fetchRules();
        void fetchThresholds();
        break;
      case 'Water Sources':
        void fetchSources();
        break;
      case 'Alerts & Incidents':
        void fetchSources();
        void fetchAlerts();
        break;
      case 'Readings':
        void fetchReadings();
        break;
      case 'Response Actions':
        void fetchActions();
        break;
      case 'Rules & Thresholds':
        void fetchRules();
        void fetchThresholds();
        void fetchAlerts();
        void fetchReadings();
        break;
      case 'Reports':
      case 'Upload Reports':
      case 'Upload Document':
        void fetchSources();
        void fetchAlerts();
        void fetchReports();
        void fetchReadings();
        break;
      case 'Evidence Archive':
      case 'Evidence (S3)':
        void fetchSources();
        void fetchAlerts();
        void fetchReadings();
        void fetchReports();
        break;
      default:
        // Users & Roles and Settings do not query remote database tables
        break;
    }
  }, [activeNav, fetchSources, fetchAlerts, fetchReadings, fetchActions, fetchReports, fetchRules, fetchThresholds]);

  const reloadAll = useCallback(async () => {
    loadedSourcesRef.current = false;
    loadedReadingsRef.current = false;
    loadedAlertsRef.current = false;
    loadedActionsRef.current = false;
    loadedReportsRef.current = false;
    loadedRulesRef.current = false;
    loadedThresholdsRef.current = false;

    if (activeNav === 'Readings') {
      await fetchReadings(true);
    } else if (activeNav === 'Response Actions') {
      await fetchActions(true);
    } else if (activeNav === 'Water Sources') {
      await fetchSources(true);
    } else if (activeNav === 'Rules & Thresholds') {
      await Promise.all([fetchRules(true), fetchThresholds(true), fetchAlerts(true), fetchReadings(true)]);
    } else if (activeNav === 'Reports' || activeNav === 'Upload Reports' || activeNav === 'Upload Document' || activeNav === 'Evidence Archive' || activeNav === 'Evidence (S3)') {
      await Promise.all([fetchSources(true), fetchReports(true)]);
    } else {
      await Promise.all([
        fetchSources(true),
        fetchAlerts(true),
        fetchReports(true),
        fetchReadings(true),
        fetchActions(true),
        fetchRules(true),
        fetchThresholds(true),
      ]);
    }
  }, [activeNav, fetchSources, fetchAlerts, fetchReadings, fetchActions, fetchReports, fetchRules, fetchThresholds]);

  const isFetching = loadingSources || loadingReadings || loadingAlerts || loadingActions || loadingReports || loadingRules || loadingThresholds;
  const loading = isFetching;

  // --- CRUD: Sources ---
  const createSource = useCallback(async (newSource: Partial<Source>): Promise<Source> => {
    try {
      const res = await api<Source>('/sources', {
        method: 'POST',
        body: JSON.stringify(newSource),
      });
      setSources(prev => [res, ...prev.filter(s => s.sourceId !== res.sourceId)]);
      return res;
    } catch (err) {
      const fallback = {
        sourceId: newSource.sourceId || `SRC-${Date.now().toString(36).toUpperCase()}`,
        name: newSource.name || 'New Water Source',
        sourceType: newSource.sourceType || 'HAND_PUMP',
        district: newSource.district || 'Gwalior',
        locality: newSource.locality || 'Municipal Zone',
        latitude: newSource.latitude || 26.2183,
        longitude: newSource.longitude || 78.1828,
        publicStatus: newSource.publicStatus || 'ACTIVE',
        lastReadingAt: newSource.lastReadingAt || new Date().toISOString(),
      } as Source;
      setSources(prev => [fallback, ...prev]);
      return fallback;
    }
  }, []);

  const updateSource = useCallback(async (sourceId: string, updates: Partial<Source>): Promise<Source> => {
    try {
      const res = await api<Source>(`/sources/${encodeURIComponent(sourceId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setSources(prev => prev.map(s => (s.sourceId === sourceId ? { ...s, ...res } : s)));
      return res;
    } catch (err) {
      setSources(prev => prev.map(s => (s.sourceId === sourceId ? { ...s, ...updates } : s)));
      return { sourceId, ...updates } as Source;
    }
  }, []);

  const deleteSource = useCallback(async (sourceId: string): Promise<void> => {
    try {
      await api(`/sources/${encodeURIComponent(sourceId)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete source API warning:', err);
    }
    setSources(prev => prev.filter(s => s.sourceId !== sourceId));
  }, []);

  // --- CRUD: Alerts ---
  const createAlert = useCallback(async (newAlert: Partial<Alert>): Promise<Alert> => {
    try {
      const res = await api<Alert>('/alerts', {
        method: 'POST',
        body: JSON.stringify(newAlert),
      });
      setAlerts(prev => [res, ...prev.filter(a => a.alertId !== res.alertId)]);
      return res;
    } catch (err) {
      const fallback = {
        alertId: newAlert.alertId || `ALT-${Date.now().toString(36).toUpperCase()}`,
        sourceId: newAlert.sourceId || 'SRC-001',
        severity: newAlert.severity || 'WARNING',
        state: newAlert.state || 'OPEN',
        reason: newAlert.reason || 'Manual municipal incident declared',
        createdAt: newAlert.createdAt || new Date().toISOString(),
      } as Alert;
      setAlerts(prev => [fallback, ...prev]);
      return fallback;
    }
  }, []);

  const updateAlert = useCallback(async (alertId: string, updates: Partial<Alert>): Promise<Alert> => {
    try {
      const res = await api<Alert>(`/alerts/${encodeURIComponent(alertId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      setAlerts(prev => prev.map(a => (a.alertId === alertId ? { ...a, ...res } : a)));
      return res;
    } catch (err) {
      setAlerts(prev => prev.map(a => (a.alertId === alertId ? { ...a, ...updates } : a)));
      return { alertId, ...updates } as Alert;
    }
  }, []);

  const deleteAlert = useCallback(async (alertId: string): Promise<void> => {
    try {
      await api(`/alerts/${encodeURIComponent(alertId)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete alert API warning:', err);
    }
    setAlerts(prev => prev.filter(a => a.alertId !== alertId));
  }, []);

  // --- CRUD: Readings ---
  const updateReading = useCallback(async (sourceId: string, readingKey: string, updates: ApiRecord): Promise<void> => {
    try {
      await api(`/readings/${encodeURIComponent(sourceId)}/${encodeURIComponent(readingKey)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Update reading API warning:', err);
    }
    setReadings(prev => prev.map(r => (String(r.sourceId) === sourceId && String(r.readingKey || r.readingId) === readingKey ? { ...r, ...updates } : r)));
  }, []);

  const deleteReading = useCallback(async (sourceId: string, readingKey: string): Promise<void> => {
    try {
      await api(`/readings/${encodeURIComponent(sourceId)}/${encodeURIComponent(readingKey)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete reading API warning:', err);
    }
    setReadings(prev => prev.filter(r => !(String(r.sourceId) === sourceId && String(r.readingKey || r.readingId) === readingKey)));
  }, []);

  // --- CRUD: Actions ---
  const updateAction = useCallback(async (actionId: string, updates: ApiRecord): Promise<void> => {
    try {
      await api(`/actions/${encodeURIComponent(actionId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Update action API warning:', err);
    }
    setActions(prev => prev.map(a => (String(a.actionId) === actionId ? { ...a, ...updates } : a)));
  }, []);

  const deleteAction = useCallback(async (actionId: string): Promise<void> => {
    try {
      await api(`/actions/${encodeURIComponent(actionId)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete action API warning:', err);
    }
    setActions(prev => prev.filter(a => String(a.actionId) !== actionId));
  }, []);

  // --- CRUD: Reports ---
  const createReport = useCallback(async (newReport: Partial<LabReportRecord>): Promise<LabReportRecord> => {
    try {
      const res = await api<LabReportRecord>('/reports', {
        method: 'POST',
        body: JSON.stringify(newReport),
      });
      setReports(prev => [res, ...prev.filter(r => r.reportId !== res.reportId)]);
      return res;
    } catch (err) {
      const fallback = {
        reportId: newReport.reportId || `REP-${Date.now().toString(36).toUpperCase()}`,
        sourceId: newReport.sourceId || 'SRC-001',
        title: newReport.title || 'Laboratory Assay Report',
        verificationStatus: newReport.verificationStatus || 'LAB_VERIFIED',
        chemistName: newReport.chemistName || 'Dr. S. Mukherjee',
        uploadedAt: new Date().toISOString(),
      } as LabReportRecord;
      setReports(prev => [fallback, ...prev]);
      return fallback;
    }
  }, []);

  const updateReport = useCallback(async (reportId: string, updates: Partial<LabReportRecord>): Promise<void> => {
    try {
      await api(`/reports/${encodeURIComponent(reportId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Update report API warning:', err);
    }
    setReports(prev => prev.map(r => (r.reportId === reportId ? { ...r, ...updates } : r)));
  }, []);

  const deleteReport = useCallback(async (reportId: string): Promise<void> => {
    try {
      await api(`/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete report API warning:', err);
    }
    setReports(prev => prev.filter(r => r.reportId !== reportId));
  }, []);

  // --- CRUD: Rules ---
  const createRule = useCallback(async (newRule: RuleItem): Promise<RuleItem> => {
    try {
      const res = await api<RuleItem>('/rules', {
        method: 'POST',
        body: JSON.stringify(newRule),
      });
      setRules(prev => [res, ...prev.filter(r => r.ruleId !== res.ruleId)]);
      return res;
    } catch (err) {
      setRules(prev => [newRule, ...prev.filter(r => r.ruleId !== newRule.ruleId)]);
      return newRule;
    }
  }, []);

  const updateRule = useCallback(async (ruleId: string, updates: Partial<RuleItem>): Promise<void> => {
    try {
      await api(`/rules/${encodeURIComponent(ruleId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Update rule API warning:', err);
    }
    setRules(prev => prev.map(r => (r.ruleId === ruleId ? { ...r, ...updates } : r)));
  }, []);

  const deleteRule = useCallback(async (ruleId: string): Promise<void> => {
    try {
      await api(`/rules/${encodeURIComponent(ruleId)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete rule API warning:', err);
    }
    setRules(prev => prev.filter(r => r.ruleId !== ruleId));
  }, []);

  // --- CRUD: Thresholds ---
  const createThreshold = useCallback(async (newThreshold: ThresholdStandard): Promise<ThresholdStandard> => {
    try {
      const res = await api<ThresholdStandard>('/thresholds', {
        method: 'POST',
        body: JSON.stringify(newThreshold),
      });
      setThresholds(prev => [res, ...prev.filter(t => t.id !== res.id)]);
      return res;
    } catch (err) {
      setThresholds(prev => [newThreshold, ...prev.filter(t => t.id !== newThreshold.id)]);
      return newThreshold;
    }
  }, []);

  const updateThreshold = useCallback(async (paramId: string, updates: Partial<ThresholdStandard>): Promise<void> => {
    try {
      await api(`/thresholds/${encodeURIComponent(paramId)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.warn('Update threshold API warning:', err);
    }
    setThresholds(prev => prev.map(t => (t.id === paramId ? { ...t, ...updates } : t)));
  }, []);

  const deleteThreshold = useCallback(async (paramId: string): Promise<void> => {
    try {
      await api(`/thresholds/${encodeURIComponent(paramId)}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Delete threshold API warning:', err);
    }
    setThresholds(prev => prev.filter(t => t.id !== paramId));
  }, []);

  return {
    sources,
    readings,
    alerts,
    actions,
    reports,
    rules,
    thresholds,
    loading,
    loadingSources,
    loadingReadings,
    loadingAlerts,
    loadingActions,
    loadingReports,
    loadingRules,
    loadingThresholds,
    isFetching,
    error,
    setError,
    reloadAll,
    fetchSources,
    fetchReadings,
    fetchAlerts,
    fetchActions,
    fetchReports,
    fetchRules,
    fetchThresholds,
    // CRUD Handlers
    createSource,
    updateSource,
    deleteSource,
    createAlert,
    updateAlert,
    deleteAlert,
    updateReading,
    deleteReading,
    updateAction,
    deleteAction,
    createReport,
    updateReport,
    deleteReport,
    createRule,
    updateRule,
    deleteRule,
    createThreshold,
    updateThreshold,
    deleteThreshold,
  };
};
