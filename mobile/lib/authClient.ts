import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

/* Same better-auth instance as the web app (docs/adr/0014, docs/adr/0017) —
   expoClient() stores the session cookie in expo-secure-store and replays
   it on each request, the RN-native counterpart to the browser's own
   cookie jar. apiBaseUrl comes from app.json's `extra` (dev default:
   http://localhost:3000 — override per-environment when this ships past
   a single developer's machine). */
const apiBaseUrl = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? 'http://localhost:3000';

/* `as any` on this one plugin only: `mobile/` has its own physical
   node_modules copy of `better-auth`/`@better-auth/core` separate from the
   root app's (mobile/ isn't an npm workspace, per docs/adr/0017 — same
   independent-tree precedent as prototype/), so TypeScript treats the two
   copies' deeply generic plugin types as nominally distinct even at
   identical versions. A known friction point for better-auth + Expo in a
   subdirectory, not a real type error — the runtime shape is correct. */
export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
  plugins: [
    expoClient({
      scheme: 'marn',
      storagePrefix: 'marn',
      storage: SecureStore,
    }) as any,
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
export { apiBaseUrl };

/** Same `as any` boundary as the plugin cast above — `getCookie` is a real
 *  method the expoClient plugin adds at runtime, just not visible through
 *  the cross-copy generic type. */
export function getCookie(): string {
  return (authClient as any).getCookie();
}
