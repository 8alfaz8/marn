import { NextRequest } from 'next/server';
import { withMobileAuth } from '@/lib/mobileApi';
import { getMemberAvailability } from '@/lib/actions/bookings';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coachId = searchParams.get('coachId') ?? '';
  const date = searchParams.get('date') ?? '';
  const serviceId = searchParams.get('serviceId') ?? '';
  return withMobileAuth(() => getMemberAvailability(coachId, date, serviceId));
}
