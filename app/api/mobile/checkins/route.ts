import { NextRequest } from 'next/server';
import { withMobileAuth } from '@/lib/mobileApi';
import { submitCheckin } from '@/lib/actions/checkins';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withMobileAuth(() =>
    submitCheckin({ sleep: body.sleep, pain: body.pain, areas: body.areas ?? [], note: body.note }),
  );
}
