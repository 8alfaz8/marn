/* Every user-facing string in the coach console, in one place.
   CLAUDE.md Iron Rule: "No hardcoded user-facing strings in components" —
   Arabic must be a configuration flip, not a rewrite. This is a plain map,
   not an i18n runtime: swapping it for one (next-intl or similar) is a
   later, mechanical change, and no component has to be touched for it.

   Wellness studio, not a clinic: nothing here names a condition, a
   diagnosis, or a treatment. We describe range, symmetry, and change. */

export const copy = {
  chromeTitle: 'Your day',

  schedule: {
    heading: 'Today',
    empty: 'Nothing booked for you today. Pick a member below to review their record or record a measurement.',
    readOnly: 'Read-only — bookings are confirmed by the studio manager.',
  },

  roster: {
    heading: 'Your members',
    empty: 'No members assigned to you yet. Once the studio manager books someone with you, they appear here.',
    filterLabel: 'Filter by name',
    filterEmpty: 'No member matches that name.',
    count: (n: number) => `${n} in your care`,
  },

  panel: {
    prompt: 'Pick a name',
    promptBody: 'Choose someone from today’s schedule or your member list to see their check-ins, past sessions and measurements before they walk in.',
    loading: 'Loading member record…',
    error: 'That record could not be loaded. Try selecting the member again.',
  },

  member: {
    readinessCleared: 'Readiness cleared',
    readinessPending: 'Awaiting readiness screening',
    recordMeasurements: 'Record measurements',
    logSession: 'Log session',
    startScreening: 'Start screening',
    rescreen: 'Re-screen',
    prescribeProgram: 'Prescribe programme',
    close: 'Close',
  },

  parq: {
    heading: 'Readiness screening',
    hint: 'Ask each question and record their answer. A checked box means "yes."',
    noteLabel: 'Note (optional)',
    noteHelper: 'Only staff see this.',
    save: 'Save screening',
    saving: 'Saving…',
    cleared: 'Cleared. This member can now be booked.',
    redFlag: 'Not cleared — refer this member to a doctor before they book. This does not clear from within the app.',
    failed: 'That screening could not be saved. Try again.',
    referral: 'Referred to a doctor — not cleared to book.',
    screenedOn: (when: string) => `Last screened ${when}`,
  },

  flags: {
    heading: 'Open safety flags',
    indicator: 'Flag',
    none: 'No open safety flags.',
    raisedOn: (when: string) => `Raised ${when}`,
    clear: 'Clear flag',
    clearConfirm: (name: string) => `Clear this flag as ${name}? Your name and the time are recorded.`,
    clearYes: 'Yes, clear it',
    clearNo: 'Keep it open',
    clearFailed: 'That flag could not be cleared. Try again.',
    raiseLabel: 'Raise a flag',
    raisePlaceholder: 'What should the next coach know before touching this member?',
    raiseAction: 'Raise',
    raiseFailed: 'That flag could not be raised. Try again.',
    raiseEmpty: 'Write a short note before raising a flag.',
  },

  measurements: {
    heading: 'Latest measurements',
    empty: 'No measurements on record yet. Record the first set to start their curve.',
    capturedOn: (when: string) => `Captured ${when}`,
    ofTarget: (pct: number) => `${pct}% of target`,
    target: 'Target',
    degrees: '°',
    change: (delta: number) => `${delta > 0 ? '+' : ''}${delta}° since last time`,
    source: {
      bodymap: 'Measured by BodyMap',
      coach_manual: 'Entered by a coach',
      member_report: 'Reported by the member',
    } as Record<string, string>,
  },

  checkins: {
    heading: 'Recent check-ins',
    empty: 'No check-ins yet.',
    sleep: 'Sleep',
    pain: 'Reported pain',
    outOf: '/10',
  },

  program: {
    heading: 'Prescribe a home programme',
    hint: 'One standard template — completion feeds their consistency and recovery scores.',
    prescribe: 'Prescribe this programme',
    prescribing: 'Saving…',
    saved: 'Programme prescribed.',
    failed: 'That could not be saved. Try again.',
    currentHeading: 'Current programme',
    currentEmpty: 'No programme prescribed yet.',
    completions: (n: number) => `${n} completion${n === 1 ? '' : 's'} in the last 28 days`,
  },

  sessions: {
    heading: 'Past sessions',
    empty: 'No sessions logged yet. The first one you log becomes what this member reads in their app.',
    mins: (n: number) => `${n} min`,
    painChange: (before: number, after: number) => `Reported pain ${before} → ${after}`,
    memberSummaryLabel: 'Member reads',
    coachNotesLabel: 'Internal note',
  },

  capture: {
    heading: 'Record measurements',
    hint: 'Fill only the groups you measured — blanks are skipped.',
    save: 'Save measurements',
    saving: 'Saving…',
    saved: 'Measurements saved. The member’s record is updated.',
    none: 'Enter at least one measurement before saving.',
    failed: 'Those measurements could not be saved. Try again.',
    targetHelper: (target: number) => `Target ${target}°`,
  },

  log: {
    heading: 'Log session',
    booking: 'Against booking',
    noBooking: 'No booking — walk-in',
    modalities: 'Modalities',
    mins: 'Duration (minutes)',
    rpe: 'Effort (RPE)',
    painBefore: 'Reported pain before',
    painAfter: 'Reported pain after',
    notes: 'Internal note (optional)',
    notesHelper: 'Only staff see this.',
    summary: 'What the member reads',
    summaryHelper: 'Plain language: what you worked on and what changed. Required.',
    summaryRequired: 'Write the member-facing summary before saving.',
    save: 'Save session',
    saving: 'Saving…',
    saved: 'Session logged.',
    savedNext: (label: string) => `Next up: ${label}.`,
    savedNothingNext: 'Nothing else booked for you today.',
    failed: 'That session could not be saved. Check the member summary and try again.',
  },

  booking: {
    status: {
      requested: 'Awaiting approval',
      confirmed: 'Confirmed',
      declined: 'Declined',
      completed: 'Completed',
      cancelled: 'Cancelled',
    } as Record<string, string>,
    unknownService: 'Session',
    unknownMember: 'Member',
  },
};
