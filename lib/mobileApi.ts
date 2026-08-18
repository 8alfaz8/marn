import { NextResponse } from 'next/server';
import { UnauthorizedError } from '@/lib/memberAuth';

/**
 * Shared error-to-status mapping for app/api/mobile/*\/route.ts (docs/adr/0017).
 * Every route wraps its handler in this so the mobile app gets a
 * consistent JSON error shape instead of each route reimplementing the
 * same try/catch. Authorization itself is unchanged — each route still
 * calls `requireMember()` (lib/memberAuth.ts), which already works for a
 * bearer-token request because better-auth's bearer plugin converts the
 * `Authorization` header into the same session `auth.api.getSession`
 * reads for a cookie-based web request.
 */
export async function withMobileAuth<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Something went wrong.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
