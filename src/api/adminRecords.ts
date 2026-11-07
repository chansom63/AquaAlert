import { api } from './client';

export type ApiRecord = Record<string, unknown>;

export const recordsFrom = (value: unknown): ApiRecord[] => {
  if (Array.isArray(value)) return value.filter((item): item is ApiRecord => !!item && typeof item === 'object');
  if (value && typeof value === 'object') {
    const body = value as Record<string, unknown>;
    for (const key of ['items', 'records', 'results', 'data']) {
      if (Array.isArray(body[key])) return (body[key] as unknown[]).filter((item): item is ApiRecord => !!item && typeof item === 'object');
    }
  }
  return [];
};

export const allApiRecords = async (path: string, limit = 100): Promise<ApiRecord[]> => {
  const collected: ApiRecord[] = [];
  let nextToken = '';
  const seenTokens = new Set<string>();
  do {
    const query = new URLSearchParams({ limit: String(limit) });
    if (nextToken) query.set('nextToken', nextToken);
    const separator = path.includes('?') ? '&' : '?';
    const response = await api<unknown>(`${path}${separator}${query.toString()}`);
    collected.push(...recordsFrom(response));
    const token = response && typeof response === 'object'
      ? (response as Record<string, unknown>).nextToken
      : undefined;
    nextToken = typeof token === 'string' ? token : '';
    if (nextToken && seenTokens.has(nextToken)) throw new Error(`Pagination token repeated while loading ${path}.`);
    if (nextToken) seenTokens.add(nextToken);
  } while (nextToken);
  return collected;
};

export const stringValue = (value: unknown, fallback = '—') =>
  value === undefined || value === null || value === '' ? fallback : String(value);

export const displayDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export const humanize = (value: unknown) => stringValue(value).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
