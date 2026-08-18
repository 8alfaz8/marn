import { withMobileAuth } from '@/lib/mobileApi';
import { getMyPortalData } from '@/lib/actions/memberSelf';

export async function GET() {
  return withMobileAuth(() => getMyPortalData());
}
