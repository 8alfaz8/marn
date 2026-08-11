/* User-facing strings shared across both consoles' shell (login, chrome) —
   console-specific copy lives colocated instead (e.g. components/coach/copy.ts).
   CLAUDE.md Iron Rule: no hardcoded user-facing strings in components; this
   is a plain map, not an i18n runtime, so swapping it for one later doesn't
   touch component code. */

export const shellCopy = {
  login: {
    brand: 'Marn',
    heading: 'Staff sign in',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in…',
    genericError: 'Sign in failed',
  },
  chrome: {
    roleLabel: { coach: 'Coach', studio_manager: 'Studio manager' } as Record<'coach' | 'studio_manager', string>,
    signOut: 'Sign out',
  },
};
