import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { API, api } from '../api/client';
import { DEMO_ALERTS, DEMO_SOURCES, GWALIOR_AREAS } from '../data/demoDataset';
import type { Alert, ComplaintPreview, Reading, Source } from '../types/water';

export const useWaterData = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('All areas');
  const [busy, setBusy] = useState(false);
  const [complaints, setComplaints] = useState<ComplaintPreview[]>([]);

  const reload = async () => {
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([api<Source[]>('/sources'), api<Alert[]>('/alerts')]);
    if (results[0].status === 'fulfilled') {
      const items = Array.isArray(results[0].value) ? results[0].value : [];
      setSources(items);
      setSelected(s => s || items[0]?.sourceId || '');
    } else {
      setSources(DEMO_SOURCES);
      setSelected(s => s || DEMO_SOURCES[0]?.sourceId || '');
      setError(`Showing the local Gwalior demo dataset. API unavailable: ${results[0].reason.message}`);
    }
    if (results[1].status === 'fulfilled') {
      setAlerts(Array.isArray(results[1].value) ? results[1].value : []);
    } else {
      setAlerts(DEMO_ALERTS);
      const message = (results[1] as PromiseRejectedResult).reason?.message || 'Alerts request failed';
      setError(e => (e ? `${e} · Showing illustrative Gwalior demo notices.` : `Showing illustrative Gwalior demo notices. ${message}`));
    }
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (!selected) {
      setReadings([]);
      return;
    }
    api<Reading[]>(`/sources/${encodeURIComponent(selected)}/readings`)
      .then(r => setReadings(Array.isArray(r) ? r : []))
      .catch(e => setError(e.message));
  }, [selected]);

  const visibleSources = useMemo(
    () =>
      sources.filter(
        s =>
          `${s.name || ''} ${s.district || ''} ${s.locality || ''} ${s.sourceId}`.toLowerCase().includes(query.toLowerCase()) &&
          (area === 'All areas' || `${s.name || ''} ${s.locality || ''} ${s.district || ''}`.toLowerCase().includes(area.toLowerCase())),
      ),
    [sources, query, area],
  );

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

  return {
    API,
    GWALIOR_AREAS,
    sources,
    alerts,
    readings,
    selected,
    setSelected,
    loading,
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
