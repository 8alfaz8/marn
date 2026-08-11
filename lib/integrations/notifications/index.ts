/* ---------------------------------------------------------------------------
   Notification anti-corruption layer (docs/adr/0015). One port, one
   working implementation, real-channel implementations stubbed — same
   shape as lib/integrations/bodymap/index.ts and lib/integrations/payments.
   Blueprint §9.3 names real vendors (Expo/APNs/FCM for push, a WhatsApp
   Business Solution Provider — Twilio/360dialog/Unifonic) that this
   environment has no accounts for. `notifyRecorded` is what every trigger
   point in this codebase actually calls: it writes a `notifications` row
   instead of sending anything. This is a Postgres write, not a
   console.log — the Iron Rule against member identifiers in logs applies
   to notification records exactly as it does to any other log-adjacent
   surface.
--------------------------------------------------------------------------- */

import { db, schema } from '@/db';

export type NotificationInput = {
  memberId: string;
  template: string;
  channel: 'push' | 'whatsapp';
  payload: Record<string, unknown>;
};

/** Records what a real send would have carried. Never member health data
 *  in `payload` — callers pass only booking/schedule-shaped data. */
export async function notifyRecorded(input: NotificationInput): Promise<void> {
  await db.insert(schema.notifications).values(input);
}

/** Not implemented — awaiting Expo push token registration, which only
 *  exists once a mobile client (lib/integrations/notifications sibling
 *  work, the mobile app) has asked a device to register one. */
export function notifyExpoPush(_input: unknown): never {
  throw new Error('Expo push adapter not implemented — awaiting device push token registration');
}

/** Not implemented — awaiting a WhatsApp Business Solution Provider
 *  account and approved message templates (blueprint §9.3: template
 *  approval takes days to weeks, a common launch-blocker). */
export function notifyWhatsApp(_input: unknown): never {
  throw new Error('WhatsApp adapter not implemented — awaiting a BSP account and approved templates (blueprint §9.3)');
}
