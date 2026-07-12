# LookBack — Project Instructions

A daily history & geography game (Svelte + Vite + TypeScript), sibling to Verbatim.
Each puzzle has 7 rounds: Face from the Past, Battlefield, a chronology round
(Which Came First / Timeline, alternating by day), Where in History, Guess the
Year, Atlas, and Through-Line (the 200-pt finale; total 800 max).

## Authoring rules — READ BEFORE EDITING ANY PUZZLE JSON

Authoritative spec: `docs/authoring-rules.md`.

**The rule that matters most: no correct answer may repeat across puzzles within
90 days.** Same discipline as Verbatim — treat any lint failure as a ship blocker.

### Workflow when adding or modifying any `public/puzzles/*.json`

1. Make the edit.
2. Run `npm run lint:puzzles`. Must report `clean (N warning(s))`. Any `FAIL` line
   is a blocker.
3. The pre-commit hook (`.githooks/pre-commit`) re-runs the lint automatically.
   Do not bypass it with `--no-verify` — fix the underlying conflict instead.

### Images — non-negotiable rules

- Fetch images only via `scripts/fetch-image.mjs`, which enforces a public-domain
  / CC0 / CC-BY / CC-BY-SA license allowlist and fails hard on anything else
  (NC, ND, fair use).
- **Every downloaded image must be viewed with the Read tool before it ships** —
  confirm it depicts the intended subject and contains no answer-revealing text
  (captions, museum plaques, map labels).
- Attribution (`fileTitle`, `author`, `license`, `sourceUrl`) is required on every
  `ImageRef` and is checked by the lint. The in-game credit (`ImageCredit.svelte`)
  shows full attribution only *after* the round is answered — before that, only
  "Image: Wikimedia Commons" — because Commons file titles usually name the
  subject.

### Do NOT

- Loosen `REUSE_WINDOW_DAYS` (currently 90) to silence a failure.
- Skip the pre-commit hook with `--no-verify`.
- Ship an image whose license wasn't verified by `fetch-image.mjs`.

## Game shape constants

- 7 rounds per puzzle. 800 points max (6 × 100 + Through-Line × 200).
- Atlas: pin-drop geography on a d3-geo world basemap, banded score
  `[100, 80, 60, 40, 20, 0]` by distance from the target vs. `tolKm`
  (`src/lib/scoring.ts → scoreAtlas`). No draft — a single confirmed guess.
- Through-Line: 16-tile Connections-style finale, 4 mistake budget, scored
  40 per solved group (max 160) + a 40-pt clean-solve bonus (all 4 groups,
  ≤1 mistake) = 200 max (`src/lib/scoring.ts → scoreThroughLine`).
  In-progress state persists to localStorage
  (`saveThroughLineDraft`/`loadThroughLineDraft` in `src/lib/persistence.ts`)
  so a mid-round reload doesn't lose progress.
- Star thresholds (5⭐/4⭐/3⭐/2⭐/1⭐) live in `src/lib/scoring.ts → stars`.
- Slot 3 (chronology) alternates by parity of `puzzleNumber`: odd →
  `whichCameFirst`, even → `timeline`. This is an authoring convention only —
  the app renders whatever type is present in the JSON.

If you change any of these, update every `/800` reference in `src/screens/*.svelte`
and `src/lib/share.ts`.

## Structure

- `/` (index.html) — static landing page linking Verbatim and LookBack.
- `/play` (play.html → src/main.ts) — the game itself. Vite multi-page build
  (`vite.config.ts → build.rollupOptions.input`); `vercel.json` sets
  `cleanUrls: true` so `/play.html` serves at `/play`.

## Deployment

Vercel auto-deploys `main` on push. No manual build step. `dist/` is gitignored.
