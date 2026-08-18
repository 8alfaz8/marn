'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Toolbar from '@mui/material/Toolbar';
import type { Theme } from '@mui/material/styles';

const STORAGE_KEY = 'marn_topbar_expanded';

/** MUI's own default `Toolbar` heights (its `mixins.toolbar`) — the real
 *  rendered height of the bar when expanded, not an invented number. Used
 *  by consumers of `useTopBarOffset` to dock a sticky tab/filter row
 *  directly below the bar in whichever state it's currently in. */
export const TOPBAR_HEIGHT = { xs: 56, sm: 64 } as const;

const TopBarOffsetContext = createContext<typeof TOPBAR_HEIGHT | 0>(0);

/** The vertical space the top bar currently occupies — `0` while collapsed
 *  to the floating toggle, `TOPBAR_HEIGHT` while expanded. A console's own
 *  sticky tab bar / filter row reads this so it docks right under the top
 *  bar instead of colliding with it (item #1). */
export function useTopBarOffset() {
  return useContext(TopBarOffsetContext);
}

/**
 * Collapsible top bar shared by `StaffChrome` and `MemberChrome` (item #1,
 * product owner batch UI/UX review 2026-08-19): collapsed by default to a
 * small floating circular toggle, persisted in `localStorage` so the
 * preference survives a reload. `children` is the bar's own content (brand
 * mark, role chip, name, sign-out button, …) — this component owns only the
 * collapse/expand chrome around it, not what's inside.
 *
 * Defaults to collapsed on first paint (no `localStorage` read possible
 * during SSR) — a returning user who previously expanded it sees a single
 * benign re-render right after mount when the stored preference is
 * restored, never the other direction, so there's no expand→collapse flash.
 *
 * Module scope per CLAUDE.md's known trap.
 */
export default function CollapsibleTopBar({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === 'true') setExpanded(true);
  }, []);

  const toggle = () => {
    setExpanded((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  if (!expanded) {
    return (
      <TopBarOffsetContext.Provider value={0}>
        <Button
          onClick={toggle}
          aria-label="Show top bar"
          sx={{
            position: 'fixed',
            insetBlockStart: 16,
            insetInlineEnd: 16,
            zIndex: (t) => t.zIndex.appBar + 1,
            minWidth: 0,
            inlineSize: 44,
            blockSize: 44,
            borderRadius: '50%',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 3,
            fontSize: '1.1rem',
          }}
        >
          ‹
        </Button>
      </TopBarOffsetContext.Provider>
    );
  }

  return (
    <TopBarOffsetContext.Provider value={TOPBAR_HEIGHT}>
      <AppBar position="sticky" elevation={0} sx={{ borderBlockEnd: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          {children}
          <Button size="small" onClick={toggle} aria-label="Hide top bar" sx={{ minWidth: 0, px: 1 }}>
            ›
          </Button>
        </Toolbar>
      </AppBar>
    </TopBarOffsetContext.Provider>
  );
}

/** Shared `sx` for a console's sticky tab bar / filter row (item #1) — docks
 *  directly below the top bar in whichever state it's currently in, stays
 *  visible while the content list beneath it scrolls. */
export function stickyBelowTopBarSx(offset: typeof TOPBAR_HEIGHT | 0) {
  return {
    position: 'sticky' as const,
    insetBlockStart: offset,
    zIndex: (t: Theme) => t.zIndex.appBar - 1,
    bgcolor: 'background.default',
  };
}
