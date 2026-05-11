import { supabase } from './supabase';

export const fetchWithAuth = async (url: string, options?: RequestInit) => {
  let token = null;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  }
  
  const headers: Record<string, string> = {};
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value as string;
    });
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
};

export const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetchWithAuth(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch ${url}: ${errorText || response.statusText}`);
  }
  return response.json();
};
