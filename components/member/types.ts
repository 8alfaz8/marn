import type { getMemberPortalData } from '@/lib/actions/memberPortal';
import type { getActiveCoachesAtSite, getMemberOwnBookings } from '@/lib/actions/bookings';

/* Derived from the action return types, matching the coach/studio consoles'
   own convention — a schema change shows up here as a type error instead of
   a silently stale shape. */
export type MemberPortalData = NonNullable<Awaited<ReturnType<typeof getMemberPortalData>>>;
export type ActiveCoach = Awaited<ReturnType<typeof getActiveCoachesAtSite>>[number];
export type OwnBooking = Awaited<ReturnType<typeof getMemberOwnBookings>>[number];
