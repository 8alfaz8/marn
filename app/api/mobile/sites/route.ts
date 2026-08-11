import { withMobileAuth } from '@/lib/mobileApi';
import { getActiveSites } from '@/lib/actions/memberAuth';

export async function GET() {
  return withMobileAuth(() => getActiveSites());
}
