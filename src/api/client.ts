export const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  if (!API) throw new Error('Set VITE_API_BASE_URL in AquaAlert/.env to connect the Lambda API.');
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status})`);
  return body as T;
};

export const date = (value?: string) => (value ? new Date(value).toLocaleString() : 'Not recorded');

export const paramLabel = (value: string) => value.replace(/^./, c => c.toUpperCase());
