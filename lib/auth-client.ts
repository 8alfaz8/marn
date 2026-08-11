'use client';

import { createAuthClient } from 'better-auth/react';

/* Same-origin — app/api/auth/[...all]/route.ts serves this app's own
   better-auth instance, no baseURL needed. */
export const authClient = createAuthClient();
export const { signIn, signUp, signOut, useSession } = authClient;
