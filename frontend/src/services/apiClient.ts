import { supabase } from '@/lib/supabase';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Centralized fetch wrapper for FastAPI backend.
 * Automatically attaches Supabase JWT Bearer token, handles response errors,
 * and retries on failure (crucial for Render cold-starts).
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retries = 3
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[apiFetch] ${options.method || 'GET'} ${url} (Attempt ${i + 1}/${retries})`);
      
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise(resolve => 
        setTimeout(() => resolve({ data: { session: null } }), 12000)
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
    } catch (error: any) {
      console.warn(`[apiFetch] Attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) {
        console.error(`[apiFetch] All ${retries} attempts failed.`);
        throw error;
      }
      
      // Exponential backoff: wait 2s, 4s before retrying
      const delay = Math.pow(2, i + 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Unexpected end of apiFetch loop');
}
