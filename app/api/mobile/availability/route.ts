import { NextRequest } from 'next/server';
import { withMobileAuth } from '@/lib/mobileApi';
import { getMemberAvailability } from '@/lib/actions/bookings';

/* `siteId` is now required (`docs/adr/0018` point 2 — a member can book at
 *  any studio, not just their own). The Expo client (`mobile/`) needs its
 *  own update to send it; unrelated to this REST layer's shape. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coachId = searchParams.get('coachId') ?? '';
  const date = searchParams.get('date') ?? '';
  const serviceId = searchParams.get('serviceId') ?? '';
  const siteId = searchParams.get('siteId') ?? '';
  return withMobileAuth(() => getMemberAvailability(coachId, date, serviceId, siteId));
}
