import { withMobileAuth } from '@/lib/mobileApi';
import { markProgramComplete } from '@/lib/actions/programs';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withMobileAuth(async () => {
    await markProgramComplete(id);
    return { ok: true };
  });
}
