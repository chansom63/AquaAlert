import type { Alert } from '../types/water';
import { allApiRecords } from '../api/adminRecords';
import { DEMO_ALERTS } from '../data/demoDataset';

const LOCAL_ALERTS_KEY = 'aquaalert_local_alerts';
const DELETED_ALERTS_KEY = 'aquaalert_deleted_alerts';
const ALERT_OVERRIDES_KEY = 'aquaalert_alert_overrides';

/**
 * Extracts a numeric timestamp from an alert for reliable descending sorting.
 */
export const getAlertTimestamp = (alert: Partial<Alert>): number => {
  const val = alert.issuedAt || alert.createdAt || (alert as Record<string, unknown>).updatedAt;
  if (!val) return 0;
  const ms = new Date(String(val)).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Sort alerts descending by timestamp (newest alerts appear at the very top).
 */
export const sortAlertsDesc = (alerts: Alert[]): Alert[] => {
  return [...alerts].sort((a, b) => getAlertTimestamp(b) - getAlertTimestamp(a));
};

/**
 * Get the set of alert IDs that have been deleted / dismissed.
 */
export const getDeletedAlertIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_ALERTS_KEY);
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

/**
 * Record a deleted alert ID in localStorage and notify active listeners.
 */
export const recordDeletedAlertId = (alertId: string): void => {
  try {
    const current = getDeletedAlertIds();
    current.add(alertId);
    localStorage.setItem(DELETED_ALERTS_KEY, JSON.stringify(Array.from(current)));

    // Also remove from locally created alerts if present
    const local = getLocallyCreatedAlerts().filter(a => a.alertId !== alertId);
    localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(local));

    window.dispatchEvent(
      new CustomEvent('aquaalert:alert-deleted', { detail: { alertId } })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get status / detail overrides for alerts.
 */
export const getAlertOverrides = (): Record<string, Partial<Alert>> => {
  try {
    const raw = localStorage.getItem(ALERT_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as Record<string, Partial<Alert>>;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return {};
};

/**
 * Record an alert status / field override and notify active listeners.
 */
export const recordAlertOverride = (alertId: string, updates: Partial<Alert>): void => {
  try {
    const current = getAlertOverrides();
    current[alertId] = { ...(current[alertId] || {}), ...updates };
    localStorage.setItem(ALERT_OVERRIDES_KEY, JSON.stringify(current));

    window.dispatchEvent(
      new CustomEvent('aquaalert:alert-updated', { detail: { alertId, updates } })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Get alerts created locally in this browser.
 */
export const getLocallyCreatedAlerts = (): Alert[] => {
  try {
    const raw = localStorage.getItem(LOCAL_ALERTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as Alert[];
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return [];
};

/**
 * Record a locally created alert so it immediately reflects across all portals.
 */
export const recordLocallyCreatedAlert = (alert: Alert): void => {
  try {
    const current = getLocallyCreatedAlerts().filter(a => a.alertId !== alert.alertId);
    const updated = [alert, ...current];
    localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(updated));

    window.dispatchEvent(
      new CustomEvent('aquaalert:alert-created', { detail: alert })
    );
  } catch {
    // Ignore storage errors
  }
};

/**
 * Normalize, deduplicate, filter, and sort alerts:
 * 1. Seeds baseline DEMO_ALERTS so demo data always remains available
 * 2. Overlays remote items from Central Database
 * 3. Overlays locally created alerts (highest priority)
 * 4. Applies state overrides and filters deleted alerts
 * 5. Guarantees newest alerts appear first
 */
export const sanitizeAndFilterAlerts = (
  items: Alert[] = [],
  includeBaselineDemo: boolean = true
): Alert[] => {
  const deleted = getDeletedAlertIds();
  const overrides = getAlertOverrides();
  const localAlerts = getLocallyCreatedAlerts();

  const map = new Map<string, Alert>();

  // 1. Seed baseline demo alerts
  if (includeBaselineDemo) {
    for (const demo of DEMO_ALERTS) {
      if (!demo.alertId || deleted.has(demo.alertId)) continue;
      const override = overrides[demo.alertId];
      const merged: Alert = {
        ...demo,
        issuedAt: demo.issuedAt || (demo.createdAt as string) || new Date().toISOString(),
        createdAt: (demo.createdAt as string) || demo.issuedAt || new Date().toISOString(),
      };
      map.set(demo.alertId, override ? { ...merged, ...override } : merged);
    }
  }

  // 2. Add remote items
  for (const item of items) {
    if (!item.alertId || deleted.has(item.alertId)) continue;
    const override = overrides[item.alertId];
    const normalized: Alert = {
      ...item,
      issuedAt: item.issuedAt || (item.createdAt as string) || (item.updatedAt as string) || new Date().toISOString(),
      createdAt: (item.createdAt as string) || item.issuedAt || new Date().toISOString(),
    };
    map.set(item.alertId, override ? { ...normalized, ...override } : normalized);
  }

  // 3. Overlay local items (highest priority for newly created alerts)
  for (const item of localAlerts) {
    if (!item.alertId || deleted.has(item.alertId)) continue;
    const override = overrides[item.alertId];
    const normalized: Alert = {
      ...item,
      issuedAt: item.issuedAt || (item.createdAt as string) || (item.updatedAt as string) || new Date().toISOString(),
      createdAt: (item.createdAt as string) || item.issuedAt || new Date().toISOString(),
    };
    map.set(item.alertId, override ? { ...normalized, ...override } : normalized);
  }

  return sortAlertsDesc(Array.from(map.values()));
};

/**
 * Fetches alerts from the Central Database, merging with local storage
 * and baseline demo alerts with descending date sort.
 */
export const fetchSyncedAlerts = async (): Promise<Alert[]> => {
  let remoteRecords: Alert[] = [];

  try {
    const res = await allApiRecords('/alerts');
    if (Array.isArray(res) && res.length > 0) {
      remoteRecords = res as Alert[];
    }
  } catch (err) {
    console.warn('Central Database alerts fetch notice:', err);
  }

  return sanitizeAndFilterAlerts(remoteRecords, true);
};
