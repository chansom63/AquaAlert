import type { Reading } from '../types/water';
import { api } from '../api/client';
import { allApiRecords, recordsFrom, type ApiRecord } from '../api/adminRecords';
import { DEMO_ADMIN_READINGS } from '../data/demoAdminData';

const LOCAL_READINGS_KEY = 'aquaalert_local_readings';

/**
 * Extracts a numeric timestamp from a reading record for reliable descending sorting.
 */
export const getReadingTimestamp = (reading: ApiRecord | Reading): number => {
  const val =
    reading.collectedAt ||
    reading.receivedAt ||
    (reading as Record<string, unknown>).createdAt ||
    (reading as Record<string, unknown>).updatedAt;
  if (!val) return 0;
  const ms = new Date(String(val)).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Sorts readings descending by collection/receipt timestamp (newest first).
 */
export const sortReadingsDesc = <T extends ApiRecord | Reading>(readings: T[]): T[] => {
  return [...readings].sort((a, b) => getReadingTimestamp(b) - getReadingTimestamp(a));
};

/**
 * Retrieve readings submitted locally in this browser.
 */
export const getLocallySubmittedReadings = (): ApiRecord[] => {
  try {
    const raw = localStorage.getItem(LOCAL_READINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as ApiRecord[];
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
};

/**
 * Save a locally submitted reading and notify active cross-portal listeners.
 */
export const recordLocallySubmittedReading = (reading: ApiRecord): void => {
  try {
    const key = String(reading.readingKey || reading.readingId || '');
    const current = getLocallySubmittedReadings().filter(
      r => String(r.readingKey || r.readingId || '') !== key
    );
    const updated = [reading, ...current];
    localStorage.setItem(LOCAL_READINGS_KEY, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent('aquaalert:reading-created', { detail: reading })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Normalizes, merges, deduplicates, and sorts readings:
 * 1. Seeds baseline DEMO_ADMIN_READINGS so demo telemetry across Gwalior wards is never wiped out.
 * 2. Overlays remote items from Central Database.
 * 3. Overlays locally submitted readings (highest priority).
 * 4. Sorts newest-first.
 */
export const sanitizeAndFilterReadings = (
  items: ApiRecord[] = [],
  includeBaselineDemo: boolean = true
): ApiRecord[] => {
  const localItems = getLocallySubmittedReadings();
  const map = new Map<string, ApiRecord>();

  // 1. Seed baseline demo readings
  if (includeBaselineDemo) {
    for (const demo of DEMO_ADMIN_READINGS) {
      const id = String(demo.readingKey || demo.readingId || `${demo.sourceId}#${demo.collectedAt}`);
      map.set(id, demo);
    }
  }

  // 2. Overlay remote items
  for (const item of items) {
    const id = String(item.readingKey || item.readingId || `${item.sourceId}#${item.collectedAt}`);
    map.set(id, item);
  }

  // 3. Overlay local submissions
  for (const item of localItems) {
    const id = String(item.readingKey || item.readingId || `${item.sourceId}#${item.collectedAt}`);
    map.set(id, item);
  }

  return sortReadingsDesc(Array.from(map.values()));
};

/**
 * Fetches all readings from the Central Database, merging with baseline demo data and local storage.
 */
export const fetchSyncedReadings = async (): Promise<ApiRecord[]> => {
  let remoteRecords: ApiRecord[] = [];
  try {
    const res = await allApiRecords('/readings');
    if (Array.isArray(res) && res.length > 0) {
      remoteRecords = res;
    }
  } catch (err) {
    console.warn('Central Database readings fetch notice:', err);
  }
  return sanitizeAndFilterReadings(remoteRecords, true);
};

/**
 * Fetches readings for a specific water source, merging remote readings with baseline demo readings.
 */
export const fetchSyncedSourceReadings = async (sourceId: string): Promise<Reading[]> => {
  let remoteRecords: Reading[] = [];
  try {
    const res = await api<unknown>(`/sources/${encodeURIComponent(sourceId)}/readings`);
    const items = recordsFrom(res) as unknown as Reading[];
    if (Array.isArray(items) && items.length > 0) {
      remoteRecords = items;
    }
  } catch (err) {
    console.warn(`Readings fetch notice for source ${sourceId}:`, err);
  }

  const baselineDemoForSource = DEMO_ADMIN_READINGS.filter(
    r => String(r.sourceId) === sourceId
  ) as unknown as Reading[];

  const localForSource = getLocallySubmittedReadings().filter(
    r => String(r.sourceId) === sourceId
  ) as unknown as Reading[];

  const map = new Map<string, Reading>();
  for (const demo of baselineDemoForSource) {
    const id = String(demo.readingKey || demo.readingId || `${demo.sourceId}#${demo.collectedAt}`);
    map.set(id, demo);
  }
  for (const item of remoteRecords) {
    const id = String(item.readingKey || item.readingId || `${item.sourceId}#${item.collectedAt}`);
    map.set(id, item);
  }
  for (const item of localForSource) {
    const id = String(item.readingKey || item.readingId || `${item.sourceId}#${item.collectedAt}`);
    map.set(id, item);
  }

  return sortReadingsDesc(Array.from(map.values()));
};
