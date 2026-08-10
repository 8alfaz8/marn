# Execution flow log

Traces how an action moves through the code — which file/function/module
calls which, in what order — for the paths that have actually been touched
under this process. Complements `docs/architecture/overview.md` (module
ownership and phase status) and `docs/decisions.md` (why a choice was made);
this file is strictly "what calls what."

Not a full trace of the existing codebase up front — populated
incrementally, one flow per change, as a change touches that path. A flow
entry is **updated in place** (not duplicated) the next time a change
touches the same path, so this stays a current map, not a chronological
diary.

## Entry format

```
## <Flow name — e.g. "Member PAR-Q submission">
**Entry point:** <route / component / CLI command>
**Path:**
1. `File.tsx` `ComponentName` (file:line) — <what it does> →
2. `file.ts` `functionName()` (file:line) — <what it does> →
3. ...
**Currently modifying:** <step number(s) and what the active change does
there — remove this line once the change lands; the rest becomes the static
record>
```

---

## Root app boot — fonts, theme, providers

**Entry point:** any request to the root Next.js app (`app/`)
**Path:**
1. `app/layout.tsx` `RootLayout()` (app/layout.tsx:29) — loads Petrona/Figtree via `next/font/google`, exposes them as CSS variables (`--font-petrona`, `--font-figtree`) on `<html className>` →
2. `app/layout.tsx` — renders `InitColorSchemeScript` (inline, pre-hydration) to stamp `data-mui-color-scheme` on `<html>` before paint, avoiding a light/dark flash →
3. `theme/theme.ts` `theme` (theme/theme.ts:43) — `createTheme()` with `cssVariables` + `colorSchemes.dark`/`.light`, reading the two font CSS variables into `typography.*.fontFamily` →
4. `app/layout.tsx` — `AppRouterCacheProvider` → `ThemeProvider theme={theme}` → `CssBaseline` (applies the `MuiCssBaseline` override: `tabular-nums`, focus ring) → `{children}`

**Currently modifying:** step 3 — replaced the placeholder plain-MUI-defaults theme with the real brand token layer (palette, typography, shape/radius, button/chip radius, focus ring) from the design handoff; see `docs/decisions.md` (2026-08-11) for what was scoped in vs. deferred.
