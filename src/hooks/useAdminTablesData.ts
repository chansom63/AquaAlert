import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { allApiRecords, recordsFrom, type ApiRecord } from '../api/adminRecords';
import type { Alert, Source } from '../types/water';
import { DEMO_SOURCES, DEMO_ALERTS } from '../data/demoDataset';
import { DEMO_ADMIN_READINGS, DEMO_ADMIN_ACTIONS } from '../data/demoAdminData';

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

  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState('');

  const loadedSourcesRef = useRef(false);
  const loadedReadingsRef = useRef(false);
  const loadedAlertsRef = useRef(false);
  const loadedActionsRef = useRef(false);
  const loadedReportsRef = useRef(false);

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

  useEffect(() => {
    // Lazy on-demand fetching: only fetch records required for the currently active tab/page!
    switch (activeNav) {
      case 'Admin Dashboard':
        void fetchSources();
        void fetchAlerts();
        void fetchReports();
        void fetchReadings();
        void fetchActions();
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
        // Users & Roles, Rules & Thresholds, Settings do not query remote database tables
        break;
    }
  }, [activeNav, fetchSources, fetchAlerts, fetchReadings, fetchActions, fetchReports]);

  const reloadAll = useCallback(async () => {
    loadedSourcesRef.current = false;
    loadedReadingsRef.current = false;
    loadedAlertsRef.current = false;
    loadedActionsRef.current = false;
    loadedReportsRef.current = false;

    if (activeNav === 'Readings') {
      await fetchReadings(true);
    } else if (activeNav === 'Response Actions') {
      await fetchActions(true);
    } else if (activeNav === 'Water Sources') {
      await fetchSources(true);
    } else if (activeNav === 'Reports' || activeNav === 'Upload Reports' || activeNav === 'Upload Document' || activeNav === 'Evidence Archive' || activeNav === 'Evidence (S3)') {
      await Promise.all([fetchSources(true), fetchReports(true)]);
    } else {
      await Promise.all([
        fetchSources(true),
        fetchAlerts(true),
        fetchReports(true),
        fetchReadings(true),
        fetchActions(true),
      ]);
    }
  }, [activeNav, fetchSources, fetchAlerts, fetchReadings, fetchActions, fetchReports]);

  const isFetching = loadingSources || loadingReadings || loadingAlerts || loadingActions || loadingReports;
  const loading = isFetching;

  return {
    sources,
    readings,
    alerts,
    actions,
    reports,
    loading,
    loadingSources,
    loadingReadings,
    loadingAlerts,
    loadingActions,
    loadingReports,
    isFetching,
    error,
    setError,
    reloadAll,
    fetchSources,
    fetchReadings,
    fetchAlerts,
    fetchActions,
    fetchReports,
  };
};
