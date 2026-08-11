/* Every user-facing string in the studio manager console, in one place.
   CLAUDE.md Iron Rule: "No hardcoded user-facing strings in components" —
   Arabic must be a configuration flip, not a rewrite. This is a plain map,
   not an i18n runtime: swapping it for one (next-intl or similar) is a
   later, mechanical change, and no component has to be touched for it.

   Wellness studio, not a clinic: nothing here names a condition, a
   diagnosis, or a treatment. This console is the front desk — bookings,
   staff, shifts, contact details. */

export const copy = {
  chromeTitle: 'Studio operations',

  dashboard: {
    sessionsToday: 'Sessions today',
    sessionsThisWeek: 'Sessions this week',
    revenue7d: 'Earned, last 7 days',
    revenueUnit: 'AED',
    activeCoaches: 'Active coaches',
  },

  tabs: {
    label: 'Studio manager sections',
    floor: 'Floor',
    staff: 'Staff and shifts',
    members: 'Members',
  },

  floor: {
    heading: 'Today on the floor',
    subtitle: 'Every booking at your site today.',
    empty: 'Nothing booked today yet. Take the first one with the booking form.',
    colTime: 'Time',
    colMember: 'Member',
    colService: 'Service',
    colCoach: 'Coach',
    colAed: 'AED',
    colStatus: 'Status',
    colAction: 'Action',
    unknownMember: 'Unknown member',
    unknownCoach: 'Unknown coach',
    unassigned: 'Unassigned',
    decline: 'Decline',
    declined: 'Booking declined.',
  },

  booking: {
    heading: 'New booking',
    subtitle: 'For a member calling in or walking up to the desk.',
    noMembers: 'Add a member before taking a booking.',
    noCoaches: 'Add a coach account before taking a booking.',
    goToMembers: 'Go to members',
    goToStaff: 'Go to staff',
    member: 'Member',
    coach: 'Coach',
    service: 'Service',
    date: 'Date',
    time: 'Time',
    priceHint: (mins: number, aed: string) => `${mins} min · AED ${aed}, from the price list.`,
    submit: 'Confirm booking',
    confirmed: 'Booking confirmed.',
  },

  bookingStatus: {
    requested: 'Requested',
    confirmed: 'Confirmed',
    completed: 'Completed',
    declined: 'Declined',
    cancelled: 'Cancelled',
  },

  staff: {
    heading: 'Staff at this site',
    subtitle: 'Everyone who can sign in here.',
    empty: 'No staff accounts yet. Create one to put a coach on the floor.',
    colName: 'Name',
    colRole: 'Role',
    colStatus: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    roles: {
      coach: 'Coach',
      studio_manager: 'Studio manager',
    },
  },

  shifts: {
    heading: 'Upcoming shifts',
    subtitle: 'Today onward, in order.',
    empty: 'No shifts assigned yet. Assign one to set who is covering the floor.',
    colDate: 'Date',
    colStaff: 'Staff',
    colStart: 'Start',
    colEnd: 'End',
    unknownStaff: 'Unknown staff',
    assignHeading: 'Assign a shift',
    staffMember: 'Staff member',
    staffOption: (name: string, role: string) => `${name} — ${role}`,
    date: 'Date',
    starts: 'Starts',
    ends: 'Ends',
    submit: 'Assign shift',
    assigned: 'Shift assigned.',
  },

  newStaff: {
    heading: 'New staff account',
    subtitle: 'Creates the sign-in for a coach or another manager at this site.',
    name: 'Full name',
    email: 'Email',
    password: 'Temporary password',
    passwordHelper: 'At least 8 characters. Hand it to them in person.',
    role: 'Role',
    submit: 'Create account',
    created: 'Staff account created.',
  },

  members: {
    heading: 'Members at this site',
    subtitle: 'Contact details for the front desk.',
    empty: 'No members yet. Add the first one, then take their booking.',
    colName: 'Name',
    colPhone: 'Phone',
    colEmail: 'Email',
    colSince: 'Member since',
    noEmail: '—',
    addHeading: 'Add a member',
    addSubtitle: 'Name and a phone number are enough to book them in.',
    name: 'Full name',
    phone: 'Phone',
    email: 'Email (optional)',
    submit: 'Add member',
    added: 'Member added.',
  },

  form: {
    saving: 'Saving…',
    failed: 'That did not save. Check the details and try again.',
  },

  error: {
    title: 'The floor view did not load',
    body: 'Nothing was changed. Try again, and if it keeps failing, check with support before taking bookings on paper.',
    retry: 'Try again',
  },
};
