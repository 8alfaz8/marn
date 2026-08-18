import { NextRequest } from 'next/server';
import { withMobileAuth } from '@/lib/mobileApi';
import { createSelfBooking, getMemberOwnBookings } from '@/lib/actions/bookings';

export async function GET() {
  return withMobileAuth(() => getMemberOwnBookings());
}

/* `siteId` is now required in the body (`docs/adr/0018` point 2 — a member
 *  can book at any studio). The Expo client (`mobile/`) needs its own
 *  update to send it; unrelated to this REST layer's shape. */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return withMobileAuth(() =>
    createSelfBooking({ siteId: body.siteId, coachId: body.coachId, serviceId: body.serviceId, date: body.date, time: body.time }),
  );
}
