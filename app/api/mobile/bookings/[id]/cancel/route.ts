import { withMobileAuth } from '@/lib/mobileApi';
import { cancelSelfBooking } from '@/lib/actions/bookings';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withMobileAuth(() => cancelSelfBooking(id));
}
