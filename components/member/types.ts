import type { getMemberPortalData } from '@/lib/actions/memberPortal';
import type { getActiveCoachesAtSite, getMemberOwnBookings } from '@/lib/actions/bookings';
import type { getActiveSites } from '@/lib/actions/memberAuth';

/* Derived from the action return types, matching the coach/studio consoles'
   own convention — a schema change shows up here as a type error instead of
   a silently stale shape. */
export type MemberPortalData = NonNullable<Awaited<ReturnType<typeof getMemberPortalData>>>;
export type ActiveCoach = Awaited<ReturnType<typeof getActiveCoachesAtSite>>[number];
export type ActiveSite = Awaited<ReturnType<typeof getActiveSites>>[number];
export type OwnBooking = Awaited<ReturnType<typeof getMemberOwnBookings>>[number];
