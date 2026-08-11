import type { getMemberPortalData } from '@/lib/actions/memberPortal';

/* Derived from the action's return type, matching the coach/studio consoles'
   own convention — a schema change shows up here as a type error instead of
   a silently stale shape. */
export type MemberPortalData = NonNullable<Awaited<ReturnType<typeof getMemberPortalData>>>;
