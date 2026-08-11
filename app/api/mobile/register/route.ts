import { NextRequest } from 'next/server';
import { withMobileAuth } from '@/lib/mobileApi';
import { completeMemberRegistration } from '@/lib/actions/memberAuth';

/* The RN app calls better-auth's own POST /api/auth/sign-up/email directly
   first (unchanged, existing route) to create the identity and receive a
   bearer token (docs/adr/0017), then this route to finish the
   domain-specific part — same two-step split as app/join/page.tsx's
   client-then-server flow, just over two HTTP calls instead of one client
   call + one server action call. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return withMobileAuth(() => completeMemberRegistration({ phone: body.phone, siteId: body.siteId }));
}
