'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import FloorPanel from './FloorPanel';
import MembersPanel from './MembersPanel';
import StaffPanel from './StaffPanel';
import { StatTile, formatNumber } from './primitives';
import type { Dashboard, Member, Shift, StaffMember } from './types';

/* Studio manager console. The numbers stay pinned above the tabs — a manager
   glancing at the screen between members should see the state of the day
   without choosing a tab first.

   All three panels stay mounted (`hidden` rather than conditional render) so
   switching tabs, or a revalidation after a write, never discards a
   half-completed form (CLAUDE.md's known trap). */
export default function StudioConsole({
  dashboard,
  members,
  staff,
  coaches,
  shifts,
}: {
  dashboard: Dashboard;
  members: Member[];
  staff: StaffMember[];
  coaches: StaffMember[];
  shifts: Shift[];
}) {
  const [tab, setTab] = useState(0);

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Sessions today" value={formatNumber(dashboard.sessionsToday)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Sessions this week" value={formatNumber(dashboard.sessionsThisWeek)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Earned, last 7 days" value={formatNumber(dashboard.revenue7d)} unit="AED" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile label="Active coaches" value={formatNumber(dashboard.activeCoachCount)} />
        </Grid>
      </Grid>

      <Box sx={{ borderBlockEnd: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, next: number) => setTab(next)} aria-label="Studio manager sections">
          <Tab label="Floor" id="studio-tab-0" aria-controls="studio-panel-0" />
          <Tab label="Staff and shifts" id="studio-tab-1" aria-controls="studio-panel-1" />
          <Tab label="Members" id="studio-tab-2" aria-controls="studio-panel-2" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={tab !== 0} id="studio-panel-0" aria-labelledby="studio-tab-0">
        <FloorPanel
          schedule={dashboard.todaySchedule}
          members={members}
          coaches={coaches}
          staff={staff}
          onGoToTab={setTab}
        />
      </Box>
      <Box role="tabpanel" hidden={tab !== 1} id="studio-panel-1" aria-labelledby="studio-tab-1">
        <StaffPanel staff={staff} shifts={shifts} />
      </Box>
      <Box role="tabpanel" hidden={tab !== 2} id="studio-panel-2" aria-labelledby="studio-tab-2">
        <MembersPanel members={members} />
      </Box>
    </Stack>
  );
}
