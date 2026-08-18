'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import OverviewPanel from './OverviewPanel';
import StudiosPanel from './StudiosPanel';
import { stickyBelowTopBarSx, useTopBarOffset } from '@/components/shared/CollapsibleTopBar';
import { copy } from './copy';
import type { AllStaff, CashLedger, CoachWorkload, Site, SuperadminDashboard } from './types';

/* Superadmin console shell — same tab-panel pattern as StudioConsole
   (all panels stay mounted, `hidden` not conditional render, so switching
   tabs never drops in-progress form state — CLAUDE.md's known trap). */
export default function SuperadminConsole({
  dashboard,
  workload,
  ledger,
  sites,
  staff,
}: {
  dashboard: SuperadminDashboard;
  workload: CoachWorkload;
  ledger: CashLedger;
  sites: Site[];
  staff: AllStaff[];
}) {
  const [tab, setTab] = useState(0);
  const topBarOffset = useTopBarOffset();

  return (
    <Stack spacing={3}>
      <Box sx={{ ...stickyBelowTopBarSx(topBarOffset), borderBlockEnd: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, next: number) => setTab(next)} aria-label={copy.tabs.label}>
          <Tab label={copy.tabs.overview} id="superadmin-tab-0" aria-controls="superadmin-panel-0" />
          <Tab label={copy.tabs.studios} id="superadmin-tab-1" aria-controls="superadmin-panel-1" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={tab !== 0} id="superadmin-panel-0" aria-labelledby="superadmin-tab-0">
        <OverviewPanel dashboard={dashboard} workload={workload} ledger={ledger} />
      </Box>
      <Box role="tabpanel" hidden={tab !== 1} id="superadmin-panel-1" aria-labelledby="superadmin-tab-1">
        <StudiosPanel sites={sites} staff={staff} />
      </Box>
    </Stack>
  );
}
