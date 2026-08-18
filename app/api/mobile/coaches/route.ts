import { NextRequest } from 'next/server';
import { withMobileAuth } from '@/lib/mobileApi';
import { getActiveCoachesAtSite } from '@/lib/actions/bookings';

/* `siteId` is now required (`docs/adr/0018` point 2 — coaches are
 *  site-dependent since a member can book at any studio, not just their
 *  own). The Expo client (`mobile/`) needs its own update to send it. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get('siteId') ?? '';
  return withMobileAuth(() => getActiveCoachesAtSite(siteId));
}
