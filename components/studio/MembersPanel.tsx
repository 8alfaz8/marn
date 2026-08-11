'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import { createMember } from '@/lib/actions/members';
import { copy } from './copy';
import { EmptyState, SectionCard, formatDay, useFormSubmit } from './primitives';
import type { Member } from './types';

/* Roster and contact details only. Everything a member's record holds about
   their sessions — check-ins, measurements, readiness, flags — belongs to the
   coach console; this console is the front desk, not the floor. */
export default function MembersPanel({ members }: { members: Member[] }) {
  const { pending, error, notice, setError, setNotice, run } = useFormSubmit();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(
      copy.members.added,
      () => createMember({ name, phone, email: email || undefined }),
      () => {
        setName('');
        setPhone('');
        setEmail('');
      },
    );
  };

  return (
    <Stack spacing={3}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title={copy.members.heading} subtitle={copy.members.subtitle}>
            {members.length === 0 ? (
              <EmptyState message={copy.members.empty} />
            ) : (
              <TableContainer>
                <Table size="small" sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{copy.members.colName}</TableCell>
                      <TableCell>{copy.members.colPhone}</TableCell>
                      <TableCell>{copy.members.colEmail}</TableCell>
                      <TableCell>{copy.members.colSince}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} hover>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.phone}</TableCell>
                        <TableCell>{member.email ?? copy.members.noEmail}</TableCell>
                        <TableCell>{formatDay(member.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title={copy.members.addHeading} subtitle={copy.members.addSubtitle}>
            <Stack component="form" spacing={2} onSubmit={onSubmit}>
              <TextField
                required
                size="small"
                label={copy.members.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                required
                size="small"
                type="tel"
                label={copy.members.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <TextField
                size="small"
                type="email"
                label={copy.members.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" variant="contained" disabled={pending}>
                {pending ? copy.form.saving : copy.members.submit}
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
      <Snackbar
        open={notice !== null}
        autoHideDuration={4000}
        onClose={() => setNotice(null)}
        message={notice ?? ''}
      />
    </Stack>
  );
}
