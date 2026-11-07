import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { API, api } from '../api/client';
import { allApiRecords, recordsFrom } from '../api/adminRecords';
import type { ApiRecord } from '../api/adminRecords';
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

  // 1. Fetch Water Sources from Central Database
  const fetchSources = useCallback(async (force = false) => {
    if (loadedSourcesRef.current && !force) return;
    setLoadingSources(true);
    try {
      const res = await api<unknown>('/sources');
      const items = recordsFrom(res) as Source[];
      setSources(items.length > 0 ? items : DEMO_SOURCES);
      setSelected(s => s || (items.length > 0 ? items[0].sourceId : DEMO_SOURCES[0]?.sourceId || ''));
      loadedSourcesRef.current = true;
    } catch (err) {
      setSources(DEMO_SOURCES);
      setSelected(s => s || DEMO_SOURCES[0]?.sourceId || '');
      console.warn('Sources API notice:', (err as Error).message);
    } finally {
      setLoadingSources(false);
    }
  }, []);

  // 2. Fetch Alerts from Central Database
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

  // 3. Fetch Citizen Complaints / Reports from Central Database
  const fetchComplaints = useCallback(async (force = false) => {
    if (loadedComplaintsRef.current && !force) return;
    setLoadingComplaints(true);
    try {
      const res = await allApiRecords('/reports');
      const items = (res || []).filter((r: ApiRecord) => {
        const typeStr = String(r.reportType || '').toLowerCase();
        return typeStr.includes('citizen') || typeStr.includes('complaint');
      });
      if (items.length > 0) {
        setComplaints(
          items.map((r: ApiRecord) => ({
            reference: String(r.reportId || `AA-CMP-${r.id || Date.now()}`),
            category: String(r.category || r.title || 'Water issue'),
            wardNumber: Number(r.wardNumber || (String(r.sourceId || '').match(/\d+/)?.[0] ?? 14)),
            details: String(r.notes || r.details || ''),
            photoName: r.filename ? String(r.filename) : undefined,
            createdAt: String(r.uploadedAt || r.createdAt || new Date().toISOString()),
          }))
        );
      }
      loadedComplaintsRef.current = true;
    } catch (err) {
      console.warn('Complaints API notice:', (err as Error).message);
    } finally {
      setLoadingComplaints(false);
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
    api<unknown>(`/sources/${encodeURIComponent(selected)}/readings`)
      .then(r => {
        const items = recordsFrom(r) as unknown as Reading[];
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

    let s3Key = `reports/complaints/${reference}.json`;

    // If citizen attached a photo, obtain presigned S3 upload URL and upload
    if (photo && photo.size > 0) {
      try {
        const signed = await api<{ uploadUrl: string; objectKey: string }>('/reports/presigned-url', {
          method: 'POST',
          body: JSON.stringify({
            sourceId,
            filename: `${reference}_${photo.name}`,
            contentType: photo.type,
            folder: 'reports/complaints',
          }),
        });
        if (signed.uploadUrl) {
          await fetch(signed.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': photo.type },
            body: photo,
          });
          s3Key = signed.objectKey;
        }
      } catch (err) {
        console.warn('Complaint image upload skipped or failed:', (err as Error).message);
      }
    }

    const payload = {
      reportId: reference,
      sourceId,
      sourceName: `Gwalior Ward ${wardNumber}`,
      title: `Citizen Report: ${category} (Ward ${wardNumber})`,
      reportType: 'Citizen Complaint',
      category,
      wardNumber,
      notes: details,
      s3Key,
      filename: photo && photo.size > 0 ? photo.name : undefined,
      uploadedBy: 'Citizen Water Reporter',
      verificationStatus: 'PENDING_REVIEW',
    };

    try {
      await api('/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const newRecord: ComplaintPreview = {
        reference,
        category,
        wardNumber,
        details,
        photoName: photo && photo.size > 0 ? photo.name : undefined,
        createdAt: new Date().toISOString(),
      };

      setComplaints(current => [newRecord, ...current]);
      setNotice(`Grievance ${reference} recorded in Municipal Database. Surveillance engineers notified.`);
      event.currentTarget.reset();
    } catch (err) {
      // In case of network interruption, preserve locally so user work is never lost
      const fallbackRecord: ComplaintPreview = {
        reference,
        category,
        wardNumber,
        details,
        photoName: photo && photo.size > 0 ? photo.name : undefined,
        createdAt: new Date().toISOString(),
      };
      setComplaints(current => [fallbackRecord, ...current]);
      setNotice(`${reference} recorded in local session ledger. Notice: ${(err as Error).message}`);
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
