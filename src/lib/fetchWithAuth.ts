import { authService } from '../services/authService';

export const fetchWithAuth = async (url: string, options?: RequestInit) => {
  let session = await authService.getSessionSafe();
  let token = session?.access_token || null;

  if (!token) {
    try {
      const refreshed = await authService.refreshSessionSafe();
      if (refreshed?.access_token) {
        session = refreshed;
        token = refreshed.access_token;
      }
    } catch {
      // ignore refresh failure
    }
  }

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Sessão não autenticada ou expirada' }),
      { status: 401, statusText: 'Unauthorized', headers: { 'Content-Type': 'application/json' } }
    );
  }

  const buildHeaders = (bearer?: string | null) => {
    const headers: Record<string, string> = {};
    if (options?.headers) {
      if (options.headers instanceof Headers) {
        options.headers.forEach((value, key) => {
          headers[key] = value;
        });
      } else if (Array.isArray(options.headers)) {
        options.headers.forEach(([key, value]) => {
          headers[key] = value;
        });
      } else {
        Object.entries(options.headers).forEach(([key, value]) => {
          headers[key] = value as string;
        });
      }
    }
    if (bearer) {
      headers['Authorization'] = `Bearer ${bearer}`;
    }
    return headers;
  };

  let response = await fetch(url, { ...options, headers: buildHeaders(token) });

  if (response.status === 401) {
    try {
      const refreshed = await authService.refreshSessionSafe();
      const newToken = refreshed?.access_token;
      if (newToken && newToken !== token) {
        response = await fetch(url, { ...options, headers: buildHeaders(newToken) });
      }
    } catch {
      // Keep original 401 response if refresh fails
    }
  }

  return response;
};

export const fetchJson = async (url: string, options?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  const externalSignal = options?.signal;
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value as string;
    });
  }

  try {
    const response = await fetchWithAuth(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch ${url} (Status: ${response.status}): ${errorText || response.statusText}`);
    }
    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error(`O servidor demorou demasiado tempo a responder (${url}). Verifique a sua ligação.`);
    }
    throw err;
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
};
