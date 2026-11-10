import type { Source } from '../types/water';
import { api } from '../api/client';
import { recordsFrom } from '../api/adminRecords';
import { DEMO_SOURCES } from '../data/demoDataset';

const LOCAL_SOURCES_KEY = 'aquaalert_local_sources';
const DELETED_SOURCES_KEY = 'aquaalert_deleted_sources';
const SOURCE_OVERRIDES_KEY = 'aquaalert_source_overrides';

export const getDeletedSourceIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_SOURCES_KEY);
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

export const recordDeletedSourceId = (sourceId: string): void => {
  try {
    const current = getDeletedSourceIds();
    current.add(sourceId);
    localStorage.setItem(DELETED_SOURCES_KEY, JSON.stringify(Array.from(current)));

    const local = getLocallyCreatedSources().filter(s => s.sourceId !== sourceId);
    localStorage.setItem(LOCAL_SOURCES_KEY, JSON.stringify(local));

    window.dispatchEvent(
      new CustomEvent('aquaalert:source-deleted', { detail: { sourceId } })
    );
  } catch {
    // Ignore storage errors
  }
};

export const getSourceOverrides = (): Record<string, Partial<Source>> => {
  try {
    const raw = localStorage.getItem(SOURCE_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, Partial<Source>>;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
};

export const recordSourceOverride = (sourceId: string, updates: Partial<Source>): void => {
  try {
    const current = getSourceOverrides();
    current[sourceId] = { ...(current[sourceId] || {}), ...updates };
    localStorage.setItem(SOURCE_OVERRIDES_KEY, JSON.stringify(current));

    window.dispatchEvent(
      new CustomEvent('aquaalert:source-updated', { detail: { sourceId, updates } })
    );
  } catch {
    // Ignore storage errors
  }
};

export const getLocallyCreatedSources = (): Source[] => {
  try {
    const raw = localStorage.getItem(LOCAL_SOURCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as Source[];
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
};

export const recordLocallyCreatedSource = (source: Source): void => {
  try {
    const current = getLocallyCreatedSources().filter(s => s.sourceId !== source.sourceId);
    const updated = [source, ...current];
    localStorage.setItem(LOCAL_SOURCES_KEY, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent('aquaalert:source-created', { detail: source })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Normalizes, merges, and deduplicates sources:
 * 1. Seeds baseline DEMO_SOURCES across Gwalior wards
 * 2. Overlays remote items from Central Database
 * 3. Overlays locally created/edited sources
 * 4. Filters out deleted sources
 */
export const sanitizeAndFilterSources = (
  items: Source[] = [],
  includeBaselineDemo: boolean = true
): Source[] => {
  const deleted = getDeletedSourceIds();
  const overrides = getSourceOverrides();
  const localItems = getLocallyCreatedSources();

  const map = new Map<string, Source>();

  // 1. Seed baseline demo sources
  if (includeBaselineDemo) {
    for (const demo of DEMO_SOURCES) {
      if (!demo.sourceId || deleted.has(demo.sourceId)) continue;
      const override = overrides[demo.sourceId];
      map.set(demo.sourceId, override ? { ...demo, ...override } : demo);
    }
  }

  // 2. Overlay remote items
  for (const item of items) {
    if (!item.sourceId || deleted.has(item.sourceId)) continue;
    const override = overrides[item.sourceId];
    map.set(item.sourceId, override ? { ...item, ...override } : item);
  }

  // 3. Overlay local items (highest priority)
  for (const item of localItems) {
    if (!item.sourceId || deleted.has(item.sourceId)) continue;
    const override = overrides[item.sourceId];
    map.set(item.sourceId, override ? { ...item, ...override } : item);
  }

  return Array.from(map.values());
};

/**
 * Fetches sources from Central Database, ensuring baseline demo sources are preserved.
 */
export const fetchSyncedSources = async (): Promise<Source[]> => {
  let remoteRecords: Source[] = [];
  try {
    const res = await api<unknown>('/sources');
    const items = recordsFrom(res) as Source[];
    if (Array.isArray(items) && items.length > 0) {
      remoteRecords = items;
    }
  } catch (err) {
    console.warn('Central Database sources fetch notice:', err);
  }
  return sanitizeAndFilterSources(remoteRecords, true);
};
