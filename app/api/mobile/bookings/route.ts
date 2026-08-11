import { NextRequest } from 'next/server';
import { withMobileAuth } from '@/lib/mobileApi';
import { createSelfBooking, getMemberOwnBookings } from '@/lib/actions/bookings';

export async function GET() {
  return withMobileAuth(() => getMemberOwnBookings());
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withMobileAuth(() =>
    createSelfBooking({ coachId: body.coachId, serviceId: body.serviceId, date: body.date, time: body.time }),
  );
}
