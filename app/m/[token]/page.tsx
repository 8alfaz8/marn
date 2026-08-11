import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { getMemberPortalData } from '@/lib/actions/memberPortal';
import MemberPortal from '@/components/member/MemberPortal';
import { copy } from '@/components/member/copy';

/* No staff session, no better-auth involvement — the token in the URL is
   checked live against member_access_tokens on every load (docs/adr/0013).
   A missing or revoked token renders the same "not valid" state rather than
   a 404 or an error boundary, so a member with a stale bookmark gets a
   plain-language explanation instead of a broken page. */
export default async function MemberPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getMemberPortalData(token);

  if (!data) {
    return (
      <Box sx={{ maxWidth: 480, marginInline: 'auto', p: 3, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ marginBlockEnd: 1 }}>{copy.invalidLink.heading}</Typography>
        <Typography variant="body2" color="text.secondary">{copy.invalidLink.body}</Typography>
      </Box>
    );
  }

  return <MemberPortal data={data} />;
}
