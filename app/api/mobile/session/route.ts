import { withMobileAuth } from '@/lib/mobileApi';
import { getMemberSession } from '@/lib/memberAuth';

/** Feeds the mobile Book screen's readiness gate — same
 *  parqCleared/referredToDoctor the web BookingForm reads off
 *  getMemberSession() server-side (app/member/page.tsx), exposed here for
 *  the mobile client since it can't call that directly. */
export async function GET() {
  return withMobileAuth(async () => {
    const session = await getMemberSession();
    if (!session) throw new Error('Not signed in');
    return { name: session.name, parqCleared: session.parqCleared, referredToDoctor: session.referredToDoctor };
  });
}
