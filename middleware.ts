import { NextRequest, NextResponse } from 'next/server';

/* CORS for app/api/mobile/* and app/api/auth/* only (docs/adr/0017) — the
   RN app's Expo web target runs on its own dev-server origin (Metro, a
   different port than this app), so its fetch calls are cross-origin even
   in local development, including its direct calls to better-auth's own
   sign-up/sign-in endpoints (the mobile app authenticates against the
   same instance staff and web members use, docs/adr/0014). Staff/web-member
   routes are same-origin and untouched. The real mobile app (device/
   simulator) isn't subject to browser CORS at all; this exists
   specifically for the `expo start --web` verification path (docs/adr/0017's
   stated verification constraint) — confirmed necessary by direct
   reproduction, not a defensive guess (see docs/decisions.md, 2026-08-12). */
function corsHeaders(origin: string | null) {
  // Credentialed cross-origin requests (cookies) can't use a wildcard
  // origin per the CORS spec — echo the request's own origin instead,
  // scoped to this middleware's own matcher (mobile API only).
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
  };
}

export function middleware(request: NextRequest) {
  const headers = corsHeaders(request.headers.get('origin'));
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }
  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: ['/api/mobile/:path*', '/api/auth/:path*'],
};
