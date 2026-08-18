/* Every user-facing string in the member portal, in one place — same rule as
   the staff consoles (CLAUDE.md: no hardcoded strings, Arabic is a
   configuration flip). Wellness studio, not a clinic: range and change over
   time, never a diagnosis or a treatment claim. */

export const copy = {
  pageTitle: 'Your progress',
  invalidLink: {
    heading: 'This link isn’t valid',
    body: 'It may have been replaced with a new one. Ask your coach or studio for a fresh link.',
  },

  scores: {
    heading: 'Your scores',
    empty: 'Your scores start after your first assessment with a coach.',
    flexibility: 'Flexibility',
    mobility: 'Mobility',
    recovery: 'Recovery',
    assessedOn: (when: string) => `From your assessment on ${when}`,
  },

  priority: {
    heading: 'Priority areas',
    body: 'The groups furthest from their target range right now.',
  },

  bodyMap: {
    heading: 'Range by area',
    empty: 'No measurements on record yet — your first session with a coach starts this.',
    ofTarget: (pct: number) => `${pct}% of target`,
    degrees: '°',
  },

  sessions: {
    heading: 'Session history',
    empty: 'No sessions yet. Once you attend one, your coach’s summary appears here.',
    mins: (n: number) => `${n} min`,
    painChange: (before: number, after: number) => `Reported pain ${before} → ${after}`,
  },

  join: {
    brand: 'Marn',
    heading: 'Join Marn',
    name: 'Full name',
    phone: 'Phone',
    email: 'Email',
    password: 'Password',
    passwordHelper: 'At least 8 characters.',
    site: 'Studio',
    submit: 'Create account',
    submitting: 'Creating account…',
    genericError: 'Could not create your account. Try again.',
    haveAccount: 'Already have an account?',
    signInLink: 'Sign in',
  },

  login: {
    brand: 'Marn',
    heading: 'Sign in',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    genericError: 'Sign in failed',
    noAccount: 'New here?',
    joinLink: 'Create an account',
  },

  console: {
    signOut: 'Sign out',
    tabs: { overview: 'Overview', book: 'Book', bookings: 'My bookings', program: 'Programme', checkin: 'Check-in' },
  },

  readiness: {
    pending: 'Awaiting readiness screening',
    pendingBody: 'A coach needs to complete a short readiness screening with you before you can book. Visit the studio to get started.',
    referred: 'Referred to a doctor',
    referredBody: 'Your last screening flagged something to check with a doctor first. Speak with a coach before your next visit.',
  },

  booking: {
    heading: 'Book a session',
    studio: 'Studio',
    service: 'Service',
    coach: 'Coach',
    date: 'Date',
    time: 'Time',
    pickCoachFirst: 'Pick a coach and service to see free times.',
    loadingSlots: 'Loading available times…',
    noSlots: 'No free times for this coach on this date.',
    priceHint: (mins: number, aed: number) => `${mins} min · AED ${aed}`,
    submit: 'Request booking',
    submitting: 'Requesting…',
    requested: 'Requested — a studio manager will confirm it shortly.',
    failed: 'That booking could not be made. Try again.',
  },

  myBookings: {
    heading: 'My bookings',
    bookAction: 'Book a session',
    upcomingHeading: 'Upcoming',
    noUpcoming: 'Nothing booked yet.',
    pastHeading: 'Past sessions',
    noPast: 'No past bookings yet.',
    empty: 'No bookings yet. Book your first session above.',
    status: {
      requested: 'Awaiting confirmation',
      confirmed: 'Confirmed',
      declined: 'Declined',
      completed: 'Completed',
      cancelled: 'Cancelled',
    } as Record<string, string>,
    cancel: 'Cancel',
    cancelConfirmRefund: 'Cancel this booking? It’s 24h+ away, so your credit will be refunded.',
    cancelConfirmForfeit: 'Cancel this booking? It’s within 24 hours, so the credit will not be refunded.',
    cancelYes: 'Yes, cancel it',
    cancelNo: 'Keep it',
    cancelledRefunded: 'Booking cancelled — credit refunded.',
    cancelledForfeited: 'Booking cancelled — credit not refunded (inside the 24h notice window).',
    cancelFailed: 'That could not be cancelled. Try again.',
  },

  myProgram: {
    empty: 'No home programme yet — your coach can prescribe one.',
    completions: (n: number) => `${n} completion${n === 1 ? '' : 's'} logged`,
    markComplete: 'Mark today complete',
    doneToday: 'Done for today',
    failed: 'That could not be saved. Try again.',
  },

  checkin: {
    heading: 'Before you arrive',
    body: 'Two taps: how you slept, your current pain, and any areas bothering you.',
    sleep: 'Sleep quality',
    pain: 'Current pain',
    areas: 'Areas',
    note: 'Note (optional)',
    submit: 'Send check-in',
    submitting: 'Sending…',
    sent: 'Sent — your coach will see this before you arrive.',
    failed: 'That could not be sent. Try again.',
  },
};
