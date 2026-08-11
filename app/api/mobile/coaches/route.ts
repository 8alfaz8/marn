import { withMobileAuth } from '@/lib/mobileApi';
import { getActiveCoachesAtSite } from '@/lib/actions/bookings';

export async function GET() {
  return withMobileAuth(() => getActiveCoachesAtSite());
}
