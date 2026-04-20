import { supabase } from '../services/supabaseClient';

export const fetchWithAuth = async (url: string, options?: RequestInit) => {
  let token = null;
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  }
  
  const headers = new Headers(options?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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
