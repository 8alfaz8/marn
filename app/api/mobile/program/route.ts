import { withMobileAuth } from '@/lib/mobileApi';
import { getMyProgram } from '@/lib/actions/programs';

export async function GET() {
  return withMobileAuth(() => getMyProgram());
}
