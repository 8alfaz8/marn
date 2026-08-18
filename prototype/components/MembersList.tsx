'use client';
import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import { api } from '@/lib/store';
import { colorOf } from '@/lib/reference';
import { PremiumCard } from './premium';

const PAGE_SIZE = 20;

type MemberRow = {
  id: string; name: string; phone: string; persona: string; credits: number;
  scores: { flexibility: number; mobility: number; recovery: number };
  flagCount: number; sessionCount: number; lastSession: string | null;
};

/* Server-paginated members table — GET /members/list does LIMIT/OFFSET at
   the database and only fetches related rows (flags/sessions/measurements)
   for the current page's member ids, never the whole members table the way
   the polled snapshot's membersWithScores() does. Used by Admin's and
   Manager's Members tabs.

   Module scope, mounted only while its tab is active (CLAUDE.md's known
   trap doesn't apply the usual way here: a fresh mount per tab switch is
   *wanted* — it's what triggers page 1 to (re)load — the trap is about
   accidental remounts from unrelated re-renders, not this one). */
export default function MembersList({ site, onOpen }: { site: string; onOpen?: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [data, setData] = useState<{ members: MemberRow[]; total: number } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    const qs = new URLSearchParams({
      site, page: String(page), pageSize: String(PAGE_SIZE), ...(debouncedQuery ? { q: debouncedQuery } : {}),
    });
    api('GET', `/members/list?${qs}`, undefined, 'SYSTEM')
      .then((r) => { if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setData({ members: [], total: 0 }); });
    return () => { cancelled = true; };
  }, [site, page, debouncedQuery]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const cols = onOpen ? 8 : 7;
  const cell = (v: number) => (
    <TableCell align="right">
      <Typography variant="body2" sx={{ fontWeight: 600, color: v ? colorOf(v / 100) : 'text.disabled' }}>{v || '—'}</Typography>
    </TableCell>
  );

  return (
    <Stack spacing={2}>
      <TextField
        size="small" placeholder="Search by name — e.g. a member's number"
        value={query} onChange={(e) => setQuery(e.target.value)} sx={{ maxWidth: 320 }}
      />
      <PremiumCard sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Member</TableCell>
                <TableCell align="right">Flex</TableCell>
                <TableCell align="right">Mob</TableCell>
                <TableCell align="right">Rec</TableCell>
                <TableCell align="right">Sessions</TableCell>
                <TableCell align="right">Credits</TableCell>
                <TableCell>Last</TableCell>
                {onOpen && <TableCell align="right" />}
              </TableRow>
            </TableHead>
            <TableBody>
              {!data ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: cols }).map((_, j) => <TableCell key={j}><Skeleton variant="text" /></TableCell>)}
                  </TableRow>
                ))
              ) : data.members.length ? data.members.map((m) => (
                <TableRow key={m.id} hover sx={{ cursor: onOpen ? 'pointer' : 'default' }} onClick={() => onOpen?.(m.id)}>
                  <TableCell>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.name}</Typography>
                      {m.flagCount > 0 && <Chip size="small" color="error" label={m.flagCount} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{m.phone} · {m.persona}</Typography>
                  </TableCell>
                  {cell(m.scores.flexibility)}{cell(m.scores.mobility)}{cell(m.scores.recovery)}
                  <TableCell align="right">{m.sessionCount}</TableCell>
                  <TableCell align="right">{m.credits}</TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{m.lastSession || '—'}</Typography></TableCell>
                  {onOpen && (
                    <TableCell align="right">
                      <Button size="small" variant="outlined" onClick={(e) => { e.stopPropagation(); onOpen(m.id); }}>Open</Button>
                    </TableCell>
                  )}
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={cols}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No members match.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </PremiumCard>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          {data ? `${data.total} member${data.total === 1 ? '' : 's'} · page ${page} of ${totalPages}` : 'Loading…'}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button size="small" disabled={!data || page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
