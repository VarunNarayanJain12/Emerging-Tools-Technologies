import { supabase } from '@/lib/supabase';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Centalized fetch wrapper for FastAPI backend.
 * Automatically attaches Supabase JWT Bearer token and handles response errors.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise(resolve => 
    setTimeout(() => resolve({ data: { session: null } }), 3000)
  );

  const { data } = await Promise.race([
    sessionPromise, 
    timeoutPromise
  ]) as any;
  const token = data?.session?.access_token;

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `API Error [${response.status}] at ${path}: ${errorBody || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
