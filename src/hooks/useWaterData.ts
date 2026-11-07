import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { API, api } from '../api/client';
import { allApiRecords } from '../api/adminRecords';
import { DEMO_ALERTS, DEMO_SOURCES, GWALIOR_AREAS } from '../data/demoDataset';
import type { Alert, ComplaintPreview, Reading, Source } from '../types/water';

export const useWaterData = (activePage: string = 'Overview') => {
  const [sources, setSources] = useState<Source[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [selected, setSelected] = useState('');

  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingReadings, setLoadingReadings] = useState(false);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('All areas');
  const [busy, setBusy] = useState(false);
  const [complaints, setComplaints] = useState<ComplaintPreview[]>([]);

  const loadedSourcesRef = useRef(false);
  const loadedAlertsRef = useRef(false);

  const fetchSources = useCallback(async (force = false) => {
    if (loadedSourcesRef.current && !force) return;
    setLoadingSources(true);
    try {
      const res = await api<Source[]>('/sources');
      const items = Array.isArray(res) ? res : [];
      setSources(items);
      setSelected(s => s || items[0]?.sourceId || '');
      loadedSourcesRef.current = true;
    } catch (err) {
      setSources(DEMO_SOURCES);
      setSelected(s => s || DEMO_SOURCES[0]?.sourceId || '');
      setError(`Showing local Gwalior demo dataset. API unavailable: ${(err as Error).message}`);
    } finally {
      setLoadingSources(false);
    }
  }, []);

  const fetchAlerts = useCallback(async (force = false) => {
    if (loadedAlertsRef.current && !force) return;
    setLoadingAlerts(true);
    try {
      const res = await allApiRecords('/alerts');
      setAlerts(res as Alert[]);
      loadedAlertsRef.current = true;
    } catch (err) {
      setAlerts(DEMO_ALERTS);
      setError(e => (e ? `${e} · Showing illustrative Gwalior demo notices.` : `Showing illustrative Gwalior demo notices. ${(err as Error).message}`));
    } finally {
      setLoadingAlerts(false);
    }
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
      case 'Reports':
        void fetchSources();
        void fetchAlerts();
        break;
      default:
        break;
    }
  }, [activePage, fetchSources, fetchAlerts]);

  const reload = useCallback(async () => {
    loadedSourcesRef.current = false;
    loadedAlertsRef.current = false;
    setError('');
    await Promise.all([fetchSources(true), fetchAlerts(true)]);
  }, [fetchSources, fetchAlerts]);

  // Fetch readings for the currently selected water source on-demand
  useEffect(() => {
    if (!selected) {
      setReadings([]);
      return;
    }
    setLoadingReadings(true);
    api<Reading[]>(`/sources/${encodeURIComponent(selected)}/readings`)
      .then(r => setReadings(Array.isArray(r) ? r : []))
      .catch(e => setError((e as Error).message))
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

  const submitComplaint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const photo = form.get('photo') as File;
    if (photo.size > 5 * 1024 * 1024) {
      setError('Choose a photo smaller than 5 MB.');
      return;
    }
    if (photo.size && !photo.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    const reference = `AA-PREVIEW-${Date.now().toString(36).toUpperCase()}`;
    const report: ComplaintPreview = {
      reference,
      category: String(form.get('category')),
      wardNumber: Number(form.get('wardNumber')),
      details: String(form.get('details')).trim(),
      photoName: photo.size ? photo.name : undefined,
      createdAt: new Date().toISOString(),
    };
    setComplaints(current => [report, ...current]);
    setNotice(`${reference} added to this session preview. It has not been sent to the municipality.`);
    event.currentTarget.reset();
  };

  const loading = loadingSources || loadingAlerts || loadingReadings;

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
