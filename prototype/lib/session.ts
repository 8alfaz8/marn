import { cookies } from 'next/headers';

/* Lightweight identity cookie so real Next.js routes (app/(member), app/(coach),
   app/admin) know who's "logged in" without a full auth system. This is NOT
   authorization — no password, no session validation, anyone can set any
   identity via POST /api/session. It exists purely so server components can
   read a role without prop-drilling from a single client root, matching the
   prototype's existing no-password persona picker. Real server-side
   authorization (per CLAUDE.md) is a follow-up once the blueprint's phone-OTP
   auth phase lands — see docs/adr/0002-prototype-auth-gap.md. */

export const SESSION_COOKIE = 'marn_who';

export type Identity = { kind: 'member' | 'coach' | 'admin'; id: string };

export async function getIdentity(): Promise<Identity | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const who = JSON.parse(raw);
    if (who?.kind && who?.id) return who;
  } catch {}
  return null;
}
