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
};
