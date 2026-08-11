import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MUSCLES } from '@/lib/reference';
import { copy } from './copy';
import type { MemberPortalData } from './types';

/* Read-only, no client state — the whole Phase 1 member surface is a single
   server-rendered view (blueprint §11 Phase 1: "member web portal,
   read-only"). "Body map" here is a region-grouped range list rather than an
   anatomical figure — a deliberate, documented scope cut for this pass (see
   docs/decisions.md); the coach console's own measurement view uses the same
   grid-not-figure presentation, so this isn't a new pattern. */

const formatDate = (value: Date | string) =>
  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const bandFor = (pct: number) => {
  if (pct < 50) return 'band.restricted';
  if (pct < 75) return 'band.limited';
  if (pct < 100) return 'band.optimal';
  return 'band.excellent';
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" color="text.secondary" component="div">
      {children}
    </Typography>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="h3">{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Paper>
  );
}

function ScoresSection({ data }: { data: MemberPortalData }) {
  if (!data.assessedAt) {
    return (
      <Stack spacing={1}>
        <SectionHeading>{copy.scores.heading}</SectionHeading>
        <Typography variant="body2" color="text.secondary">{copy.scores.empty}</Typography>
      </Stack>
    );
  }
  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.scores.heading}</SectionHeading>
      <Typography variant="body2" color="text.secondary">{copy.scores.assessedOn(formatDate(data.assessedAt))}</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 4 }}>
          <ScoreCard label={copy.scores.flexibility} value={data.scores.flexibility} />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <ScoreCard label={copy.scores.mobility} value={data.scores.mobility} />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <ScoreCard label={copy.scores.recovery} value={data.scores.recovery} />
        </Grid>
      </Grid>
    </Stack>
  );
}

function PrioritySection({ data }: { data: MemberPortalData }) {
  if (data.priorityAreas.length === 0) return null;
  return (
    <Stack spacing={1}>
      <SectionHeading>{copy.priority.heading}</SectionHeading>
      <Typography variant="body2" color="text.secondary">{copy.priority.body}</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {data.priorityAreas.map((m) => (
          <Chip key={m.muscleKey} size="small" variant="outlined" label={MUSCLES.find((x) => x.key === m.muscleKey)?.label ?? m.muscleKey} />
        ))}
      </Stack>
    </Stack>
  );
}

function BodyMapSection({ data }: { data: MemberPortalData }) {
  if (data.measurements.length === 0) {
    return (
      <Stack spacing={1}>
        <SectionHeading>{copy.bodyMap.heading}</SectionHeading>
        <Typography variant="body2" color="text.secondary">{copy.bodyMap.empty}</Typography>
      </Stack>
    );
  }
  const byMuscle = new Map(data.measurements.map((m) => [m.muscleKey, m]));
  const regions: Array<'Lower' | 'Core' | 'Upper'> = ['Lower', 'Core', 'Upper'];

  return (
    <Stack spacing={2}>
      <SectionHeading>{copy.bodyMap.heading}</SectionHeading>
      {regions.map((region) => {
        const groups = MUSCLES.filter((m) => m.region === region && byMuscle.has(m.key));
        if (groups.length === 0) return null;
        return (
          <Box key={region}>
            <Typography variant="subtitle2" sx={{ marginBlockEnd: 1 }}>{region}</Typography>
            <Stack spacing={1.25}>
              {groups.map((muscle) => {
                const m = byMuscle.get(muscle.key)!;
                const pct = Math.round((m.degrees / m.target) * 100);
                return (
                  <Box key={muscle.key}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography variant="body2">{muscle.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{copy.bodyMap.ofTarget(pct)}</Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, pct)}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: 'surfaceRaised',
                        '& .MuiLinearProgress-bar': { bgcolor: bandFor(pct) },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function SessionsSection({ data }: { data: MemberPortalData }) {
  return (
    <Stack spacing={1.5}>
      <SectionHeading>{copy.sessions.heading}</SectionHeading>
      {data.sessions.length === 0 && (
        <Typography variant="body2" color="text.secondary">{copy.sessions.empty}</Typography>
      )}
      {data.sessions.map((s) => (
        <Box key={s.id}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">{formatDate(s.completedAt)}</Typography>
            <Typography variant="body2">{copy.sessions.mins(s.mins)}</Typography>
            <Typography variant="body2">{copy.sessions.painChange(s.painBefore, s.painAfter)}</Typography>
            {(s.modalities ?? []).map((m) => (
              <Chip key={m} size="small" variant="outlined" label={m} />
            ))}
          </Stack>
          <Typography variant="body2">{s.memberSummary}</Typography>
        </Box>
      ))}
    </Stack>
  );
}

export default function MemberPortal({ data }: { data: MemberPortalData }) {
  return (
    <Box sx={{ maxWidth: 720, marginInline: 'auto', p: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        <Typography variant="h4">{data.member.name}</Typography>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <ScoresSection data={data} />
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={3}>
            <PrioritySection data={data} />
            <BodyMapSection data={data} />
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <SessionsSection data={data} />
        </Paper>
      </Stack>
    </Box>
  );
}
