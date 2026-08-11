import { Platform } from 'react-native';
import { getCookie, apiBaseUrl } from './authClient';

/**
 * Every app/api/mobile/* call goes through here. Session attachment is
 * platform-specific, not a single strategy — a real, confirmed difference
 * (found by direct reproduction during Expo-web verification, docs/adr/0017),
 * not a portability nicety:
 *
 * - **Web** (Expo web / react-native-web): browsers refuse to let script
 *   set a `Cookie` request header at all — it throws synchronously before
 *   the request is even sent. `credentials: 'include'` lets the browser's
 *   own cookie jar attach it instead, the same mechanism the web member
 *   console already relies on.
 * - **Native** (iOS/Android): React Native's fetch has no reliable
 *   persistent cookie jar, which is exactly why better-auth's Expo plugin
 *   exists — `getCookie()` reads the session back out of expo-secure-store
 *   and it's attached by hand. Native `fetch` has no browser-style
 *   forbidden-header restriction, so this works there.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) };
  const requestInit: RequestInit = { ...init, headers };
  if (Platform.OS === 'web') {
    requestInit.credentials = 'include';
  } else {
    headers.Cookie = getCookie();
  }
  const res = await fetch(`${apiBaseUrl}${path}`, requestInit);
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? 'Something went wrong.');
  return body as T;
}

export const api = {
  sites: () => request<{ id: string; name: string; city: string }[]>('/api/mobile/sites'),
  session: () => request<{ name: string; parqCleared: boolean; referredToDoctor: boolean }>('/api/mobile/session'),
  register: (input: { phone: string; siteId: string }) =>
    request('/api/mobile/register', { method: 'POST', body: JSON.stringify(input) }),
  portal: () => request<any>('/api/mobile/portal'),
  bookings: () => request<any[]>('/api/mobile/bookings'),
  createBooking: (input: { coachId: string; serviceId: string; date: string; time: string }) =>
    request<string>('/api/mobile/bookings', { method: 'POST', body: JSON.stringify(input) }),
  cancelBooking: (id: string) => request<{ refunded: boolean }>(`/api/mobile/bookings/${id}/cancel`, { method: 'POST' }),
  availability: (coachId: string, date: string, serviceId: string) =>
    request<{ time: string; available: boolean }[]>(
      `/api/mobile/availability?coachId=${coachId}&date=${date}&serviceId=${serviceId}`,
    ),
  coaches: () => request<{ id: string; name: string }[]>('/api/mobile/coaches'),
  program: () => request<any>('/api/mobile/program'),
  completeProgram: (id: string) => request(`/api/mobile/program/${id}/complete`, { method: 'POST' }),
  checkin: (input: { sleep: number; pain: number; areas: string[]; note?: string }) =>
    request('/api/mobile/checkins', { method: 'POST', body: JSON.stringify(input) }),
};
