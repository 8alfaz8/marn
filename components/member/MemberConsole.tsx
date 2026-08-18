'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { getMemberOwnBookings } from '@/lib/actions/bookings';
import MemberPortal from './MemberPortal';
import BookingForm from './BookingForm';
import MyBookings from './MyBookings';
import ProgramTab from './ProgramTab';
import CheckinForm from './CheckinForm';
import { copy } from './copy';
import type { MemberPortalData, OwnBooking } from './types';

/* Signed-in member home. Tabs stay mounted (hidden, not conditional render)
   matching components/studio/StudioConsole.tsx's own pattern, so switching
   tabs never discards a half-filled booking form. */
export default function MemberConsole({
  data,
  parqCleared,
  referredToDoctor,
}: {
  data: MemberPortalData;
  parqCleared: boolean;
  referredToDoctor: boolean;
}) {
  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState<OwnBooking[] | null>(null);

  const refreshBookings = () => {
    void getMemberOwnBookings().then(setBookings);
  };

  useEffect(() => {
    refreshBookings();
  }, []);

  return (
    <Stack spacing={3}>
      <Box sx={{ borderBlockEnd: '1px solid', borderColor: 'divider' }}>
        <Tabs value={tab} onChange={(_, next: number) => setTab(next)}>
          <Tab label={copy.console.tabs.overview} id="member-tab-0" aria-controls="member-panel-0" />
          <Tab label={copy.console.tabs.book} id="member-tab-1" aria-controls="member-panel-1" />
          <Tab label={copy.console.tabs.bookings} id="member-tab-2" aria-controls="member-panel-2" />
          <Tab label={copy.console.tabs.program} id="member-tab-3" aria-controls="member-panel-3" />
          <Tab label={copy.console.tabs.checkin} id="member-tab-4" aria-controls="member-panel-4" />
        </Tabs>
      </Box>

      <Box role="tabpanel" hidden={tab !== 0} id="member-panel-0" aria-labelledby="member-tab-0">
        <MemberPortal data={data} />
      </Box>
      <Box role="tabpanel" hidden={tab !== 1} id="member-panel-1" aria-labelledby="member-tab-1">
        <BookingForm parqCleared={parqCleared} referredToDoctor={referredToDoctor} onBooked={refreshBookings} />
      </Box>
      <Box role="tabpanel" hidden={tab !== 2} id="member-panel-2" aria-labelledby="member-tab-2">
        <MyBookings bookings={bookings ?? []} onChanged={refreshBookings} />
      </Box>
      <Box role="tabpanel" hidden={tab !== 3} id="member-panel-3" aria-labelledby="member-tab-3">
        <ProgramTab />
      </Box>
      <Box role="tabpanel" hidden={tab !== 4} id="member-panel-4" aria-labelledby="member-tab-4">
        <CheckinForm />
      </Box>
    </Stack>
  );
}
