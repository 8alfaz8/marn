'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { serviceById } from '@/lib/reference';
import { getMemberContext } from '@/lib/actions/members';
import { copy } from './copy';
import MemberContextPanel from './MemberContextPanel';
import type { MemberContext, RosterMember, ScheduleBooking } from './types';

/* The coach journey on one screen (docs/design/journeys.md): day view →
   member context before they walk in → capture during session → notes and
   flags → hand off. A left rail of names, a deep panel for the one in front
   of you, capture inline in that panel. No route change between steps —
   navigation costs taps, and taps are the thing this console is optimising
   away. */

function ScheduleSection({
  bookings,
  nameFor,
  flagFor,
  selectedId,
  onSelect,
}: {
  bookings: ScheduleBooking[];
  nameFor: (memberId: string) => string;
  flagFor: (memberId: string) => boolean;
  selectedId: string | null;
  onSelect: (memberId: string) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary">{copy.schedule.heading}</Typography>
        {bookings.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{copy.schedule.empty}</Typography>
        ) : (
          <>
            <List disablePadding>
              {bookings.map((b) => (
                <ListItemButton
                  key={b.id}
                  selected={b.memberId === selectedId}
                  onClick={() => onSelect(b.memberId)}
                  sx={{ borderRadius: 1, paddingInline: 1 }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
                        <Typography variant="body2" color="text.secondary">{b.time}</Typography>
                        <Typography variant="body1">{nameFor(b.memberId)}</Typography>
                        {flagFor(b.memberId) && (
                          <Chip size="small" color="warning" variant="outlined" label={copy.flags.indicator} />
                        )}
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {serviceById(b.serviceId)?.name ?? copy.booking.unknownService}
                        </Typography>
                        <Chip size="small" variant="outlined" label={copy.booking.status[b.status] ?? b.status} />
                      </Stack>
                    }
                    slotProps={{ primary: { component: 'div' }, secondary: { component: 'div' } }}
                  />
                </ListItemButton>
              ))}
            </List>
            <Typography variant="body2" color="text.muted">{copy.schedule.readOnly}</Typography>
          </>
        )}
      </Stack>
    </Paper>
  );
}

function RosterSection({
  members,
  filter,
  onFilterChange,
  selectedId,
  onSelect,
}: {
  members: RosterMember[];
  filter: string;
  onFilterChange: (value: string) => void;
  selectedId: string | null;
  onSelect: (memberId: string) => void;
}) {
  const visible = members.filter((m) => m.name.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="overline" color="text.secondary">{copy.roster.heading}</Typography>
          {members.length > 0 && (
            <Typography variant="body2" color="text.muted">{copy.roster.count(members.length)}</Typography>
          )}
        </Stack>
        {members.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{copy.roster.empty}</Typography>
        ) : (
          <>
            <TextField
              size="small"
              label={copy.roster.filterLabel}
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
            />
            {visible.length === 0 ? (
              <Typography variant="body2" color="text.secondary">{copy.roster.filterEmpty}</Typography>
            ) : (
              <List disablePadding>
                {visible.map((m) => (
                  <ListItemButton
                    key={m.id}
                    selected={m.id === selectedId}
                    onClick={() => onSelect(m.id)}
                    sx={{ borderRadius: 1, paddingInline: 1 }}
                  >
                    <ListItemText
                      primary={m.name}
                      secondary={
                        (m.hasOpenFlag || !m.parqCleared) && (
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, marginBlockStart: 0.5 }}>
                            {m.hasOpenFlag && (
                              <Chip size="small" variant="outlined" color="warning" label={copy.flags.indicator} />
                            )}
                            {!m.parqCleared && (
                              <Chip size="small" variant="outlined" color="warning" label={copy.member.readinessPending} />
                            )}
                          </Stack>
                        )
                      }
                      slotProps={{ secondary: { component: 'div' } }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}

export default function CoachConsole({
  staffName,
  bookings,
  members,
}: {
  staffName: string;
  bookings: ScheduleBooking[];
  members: RosterMember[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [context, setContext] = useState<MemberContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const nameFor = useMemo(() => {
    const byId = new Map(members.map((m) => [m.id, m.name]));
    return (memberId: string) => byId.get(memberId) ?? copy.booking.unknownMember;
  }, [members]);

  const flagFor = useMemo(() => {
    const flagged = new Set(members.filter((m) => m.hasOpenFlag).map((m) => m.id));
    return (memberId: string) => flagged.has(memberId);
  }, [members]);

  const load = async (memberId: string) => {
    setLoading(true);
    setError(null);
    try {
      setContext(await getMemberContext(memberId));
    } catch {
      setError(copy.panel.error);
      setContext(null);
    } finally {
      setLoading(false);
    }
  };

  const onSelect = (memberId: string) => {
    if (memberId === selectedId) return;
    setSelectedId(memberId);
    setContext(null);
    void load(memberId);
  };

  /* Deliberately stale-while-revalidate: the panel keeps rendering the
     context it already has while the new one loads, so a save-triggered
     refresh never unmounts the capture forms and never clobbers whatever
     the coach is still typing (CLAUDE.md's known trap). */
  const onChanged = () => {
    if (selectedId) void load(selectedId);
    router.refresh();
  };

  const todayBookings = selectedId ? bookings.filter((b) => b.memberId === selectedId) : [];
  const next = bookings.find((b) => b.status === 'confirmed' && b.memberId !== selectedId);
  const nextUpLabel = next ? `${next.time} · ${nameFor(next.memberId)}` : null;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4, lg: 3 }}>
        <Stack
          spacing={2}
          sx={{ position: { md: 'sticky' }, insetBlockStart: (t) => t.spacing(2) }}
        >
          <ScheduleSection bookings={bookings} nameFor={nameFor} flagFor={flagFor} selectedId={selectedId} onSelect={onSelect} />
          <RosterSection
            members={members}
            filter={filter}
            onFilterChange={setFilter}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, md: 8, lg: 9 }}>
        {error && <Alert severity="error" sx={{ marginBlockEnd: 2 }}>{error}</Alert>}
        {context ? (
          <MemberContextPanel
            key={context.member.id}
            context={context}
            staffName={staffName}
            todayBookings={todayBookings}
            nextUpLabel={nextUpLabel}
            loading={loading}
            onChanged={onChanged}
          />
        ) : (
          <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
            <Box sx={{ maxWidth: 520 }}>
              <Typography variant="h5" sx={{ marginBlockEnd: 1 }}>
                {loading ? copy.panel.loading : copy.panel.prompt}
              </Typography>
              {!loading && (
                <Typography variant="body1" color="text.secondary">{copy.panel.promptBody}</Typography>
              )}
            </Box>
          </Paper>
        )}
      </Grid>
    </Grid>
  );
}
