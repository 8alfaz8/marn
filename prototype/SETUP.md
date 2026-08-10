# Setup — agent instructions, Karpathy skill, Material UI

One-time setup for the Marn repo. Run from the repo root.

---

## 1. Drop the instruction files in place

```
CLAUDE.md                       # repo root — Claude Code reads this automatically
AGENTS.md                       # repo root — for Codex / Cursor / other agents
docs/design/design-system.md
theme/theme.ts
```

Then create the three files `CLAUDE.md` points at, even as stubs, so the references aren't dead:

```bash
mkdir -p docs/blueprint docs/architecture docs/design docs/adr
# docs/blueprint/           <- the 15-chapter blueprint, split by chapter
# docs/architecture/overview.md   <- module -> code map + phase status
# docs/design/journeys.md         <- member journey + coach journey
```

Reconcile the **Repo map** and **Commands** tables in `CLAUDE.md` with the actual repo before committing — placeholders are marked `«…»`.

---

## 2. Install the Karpathy guidelines

The bundle is a single skill (`karpathy-guidelines`) plus a plugin manifest. Three ways to install it; pick one.

### Option A — project skill (recommended for Marn)

Committed to the repo, so anyone working on Marn gets it, and it's version-controlled with the rest of your standards.

```bash
mkdir -p .claude/skills
unzip -j andrej-karpathy-skills-main.zip \
  'andrej-karpathy-skills-main/skills/karpathy-guidelines/*' \
  -d .claude/skills/karpathy-guidelines
git add .claude/skills/karpathy-guidelines
```

Verify `.claude/skills/karpathy-guidelines/SKILL.md` exists and starts with the `---` frontmatter block. Start a new Claude Code session — skills are discovered at session start.

### Option B — personal skill (all your projects, not committed)

```bash
unzip -j andrej-karpathy-skills-main.zip \
  'andrej-karpathy-skills-main/skills/karpathy-guidelines/*' \
  -d ~/.claude/skills/karpathy-guidelines
```

### Option C — plugin from the marketplace

Inside Claude Code:

```
/plugin marketplace add forrestchang/andrej-karpathy-skills
/plugin install andrej-karpathy-skills@karpathy-skills
```

Same content, but it updates from upstream rather than sitting in your repo.

**Notes**

- Options A and B are the same skill in two scopes; installing both just shadows one with the other. Project scope wins.
- `CLAUDE.md` already references `.claude/skills/karpathy-guidelines/SKILL.md` and summarises the four principles inline, so the rules apply even in a session where the skill hasn't loaded. If you choose Option B or C, either leave that line (harmless) or change it to name the skill without the path.
- The repo also ships a `.cursor/rules/karpathy-guidelines.mdc` if you use Cursor: copy it to `.cursor/rules/` in the Marn repo.

Check it's live: ask Claude Code `what skills do you have available?` in a fresh session.

---

## 3. Material UI

Current major is **v9** — there is no v8; Material UI jumped v7 → v9 to share a major with MUI X. Anything you find online written for v6 (`Grid2`, system props like `<Box mt={2}>`) is out of date. See `docs/design/design-system.md` §0.

### Install

```bash
npm install @mui/material @emotion/react @emotion/styled \
            @mui/material-nextjs @mui/icons-material
npm install @mui/x-charts        # progress curves — v9 pairs with Material UI v9
```

### Fonts + providers

`app/layout.tsx`:

```tsx
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import theme from '@/theme/theme';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage',
});
const instrument = Instrument_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${bricolage.variable} ${instrument.variable} ${mono.variable}`}
    >
      <body>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
```

`AppRouterCacheProvider` collects the CSS that MUI generates on the server while Next streams the page — without it you get a flash of unstyled content. `enableCssLayer` keeps MUI's styles in a cascade layer so any remaining plain CSS from the prototype can override cleanly during the migration.

`theme/theme.ts` carries `'use client'` because `createTheme` and `ThemeProvider` are client-side; `layout.tsx` itself stays a server component.

### Migrating the existing prototype

Do it surface by surface, not all at once:

1. Fill in the real brand hex values in `theme/theme.ts` from the prototype's CSS, then delete those custom properties from the old stylesheet so there's one source.
2. Convert one screen — the coach session-capture view is the highest-value test, since it's the densest.
3. Delete the old CSS for that screen in the same commit. Two styling systems living side by side for a week is how you end up with three.
4. Keep `enableCssLayer` on until the last stylesheet is gone.

### Arabic / RTL, when it comes

Three changes, no component rewrites, provided components used logical properties from the start:

```bash
npm install stylis stylis-plugin-rtl
```

- `direction: 'rtl'` in the theme,
- `dir="rtl"` on `<html>`,
- `stylisPlugins: [prefixer, rtlPlugin]` passed to `AppRouterCacheProvider`'s `options`.

Any component using `ml`/`mr`/`left`/`right` will not flip. That's why `docs/design/design-system.md` §4.4 bans them.

---

## 4. Verify

```bash
npm run check     # lint + typecheck + test
npm run build
```

Then in a fresh Claude Code session, ask it to summarise `CLAUDE.md` and name the design system — if it can't, the file isn't where it thinks it is.
