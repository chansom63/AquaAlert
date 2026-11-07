export const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

export const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  if (!API) throw new Error('Set VITE_API_BASE_URL in AquaAlert/.env to connect the Lambda API.');

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API}${cleanPath}`;

  const headers: Record<string, string> = {};
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach AWS Cognito JWT token if session exists
  try {
    const rawSession = localStorage.getItem('aquaalert_cognito_session');
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session.idToken && !headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${session.idToken}`;
      }
    }
  } catch {
    // Ignore parse or storage errors
  }
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((val, key) => {
        headers[key] = val;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, val]) => {
        headers[key] = val;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const serverMsg = (body as { error?: { message?: string }; message?: string })?.error?.message
        || (body as { message?: string })?.message
        || `Request failed (${response.status})`;
      throw new Error(serverMsg);
    }
    return body as T;
  } catch (err) {
    const message = (err as Error).message || '';
    if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('Load failed')) {
      throw new Error(`Failed to fetch from ${cleanPath}. Please check network connectivity to the central API gateway.`);
    }
    throw err;
  }
};

export const date = (value?: string) => (value ? new Date(value).toLocaleString() : 'Not recorded');
export const paramLabel = (value: string) => value.replace(/^./, c => c.toUpperCase());
