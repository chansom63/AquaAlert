import { allApiRecords, type ApiRecord } from '../api/adminRecords';
import { DEMO_ADMIN_ACTIONS } from '../data/demoAdminData';

const LOCAL_ACTIONS_KEY = 'aquaalert_local_actions';

/**
 * Extracts a numeric timestamp from a response action record for reliable descending sorting.
 */
export const getActionTimestamp = (action: ApiRecord): number => {
  const val = action.createdAt || action.recordedAt || action.timestamp;
  if (!val) return 0;
  const ms = new Date(String(val)).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Sorts response actions descending by timestamp (newest first).
 */
export const sortActionsDesc = (actions: ApiRecord[]): ApiRecord[] => {
  return [...actions].sort((a, b) => getActionTimestamp(b) - getActionTimestamp(a));
};

export const getLocallyCreatedActions = (): ApiRecord[] => {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIONS_KEY);
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

export const recordLocallyCreatedAction = (action: ApiRecord): void => {
  try {
    const key = String(action.actionId || action.actionKey || '');
    const current = getLocallyCreatedActions().filter(
      a => String(a.actionId || a.actionKey || '') !== key
    );
    const updated = [action, ...current];
    localStorage.setItem(LOCAL_ACTIONS_KEY, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent('aquaalert:action-created', { detail: action })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Normalizes, merges, and sorts response actions:
 * 1. Seeds baseline DEMO_ADMIN_ACTIONS so demo intervention history is never wiped out.
 * 2. Overlays remote items from Central Database.
 * 3. Overlays locally recorded actions (highest priority).
 * 4. Sorts newest-first.
 */
export const sanitizeAndFilterActions = (
  items: ApiRecord[] = [],
  includeBaselineDemo: boolean = true
): ApiRecord[] => {
  const localItems = getLocallyCreatedActions();
  const map = new Map<string, ApiRecord>();

  // 1. Seed baseline demo actions
  if (includeBaselineDemo) {
    for (const demo of DEMO_ADMIN_ACTIONS) {
      const id = String(demo.actionId || demo.actionKey || `${demo.alertId}#${demo.createdAt}`);
      map.set(id, demo);
    }
  }

  // 2. Overlay remote items
  for (const item of items) {
    const id = String(item.actionId || item.actionKey || `${item.alertId}#${item.createdAt}`);
    map.set(id, item);
  }

  // 3. Overlay local submissions
  for (const item of localItems) {
    const id = String(item.actionId || item.actionKey || `${item.alertId}#${item.createdAt}`);
    map.set(id, item);
  }

  return sortActionsDesc(Array.from(map.values()));
};

/**
 * Fetches response actions from Central Database, merging with baseline demo data and local cache.
 */
export const fetchSyncedActions = async (): Promise<ApiRecord[]> => {
  let remoteRecords: ApiRecord[] = [];
  try {
    const res = await allApiRecords('/actions');
    if (Array.isArray(res) && res.length > 0) {
      remoteRecords = res;
    }
  } catch (err) {
    console.warn('Central Database actions fetch notice:', err);
  }
  return sanitizeAndFilterActions(remoteRecords, true);
};
