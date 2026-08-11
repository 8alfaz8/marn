'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { startImpersonation, stopImpersonation } from '@/lib/actions/impersonation';
import { shellCopy } from '@/lib/copy';

/* Superadmin-only account switcher, rendered in the shared chrome so it is
   reachable from whichever console the borrowed identity lands in
   (docs/adr/0012). Module scope, per CLAUDE.md's known trap.

   After switching, `router.push('/')` rather than `refresh()`: the effective
   role has changed, and `/` re-routes to whichever console that role owns —
   the same redirect the three role-gated pages already use, so there is one
   routing rule, not two. */

export type ImpersonationOption = {
  staffId: string;
  name: string;
  role: 'coach' | 'studio_manager';
  siteName: string | null;
};

export default function ImpersonationSwitcher({
  options,
  activeStaffId,
}: {
  options: ImpersonationOption[];
  activeStaffId: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setPending(true);
    setError(false);
    try {
      await action();
      router.push('/');
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  };

  const onChange = (value: string) => {
    if (value === activeStaffId) return;
    run(value === '' ? stopImpersonation : () => startImpersonation(value));
  };

  return (
    <>
      <TextField
        select
        size="small"
        label={shellCopy.impersonation.label}
        value={activeStaffId ?? ''}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        sx={{ minInlineSize: 220 }}
      >
        <MenuItem value="">{shellCopy.impersonation.self}</MenuItem>
        {options.map((o) => (
          <MenuItem key={o.staffId} value={o.staffId}>
            {shellCopy.impersonation.option(o.name, shellCopy.chrome.roleLabel[o.role], o.siteName)}
          </MenuItem>
        ))}
      </TextField>
      {error && (
        <Alert severity="error" onClose={() => setError(false)} sx={{ py: 0 }}>
          {shellCopy.impersonation.failed}
        </Alert>
      )}
    </>
  );
}

/** The persistent "you are not yourself right now" banner. Separate from the
 *  switcher because it belongs below the AppBar, full width — a borrowed
 *  identity should never be something you have to go looking for. */
export function ImpersonationBanner({ name }: { name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <Alert
      severity="warning"
      square
      action={
        <Button
          size="small"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await stopImpersonation();
            router.push('/');
            router.refresh();
          }}
        >
          {shellCopy.impersonation.stop}
        </Button>
      }
    >
      {shellCopy.impersonation.bannerPrefix} <strong>{name}</strong>. {shellCopy.impersonation.bannerSuffix}
    </Alert>
  );
}
