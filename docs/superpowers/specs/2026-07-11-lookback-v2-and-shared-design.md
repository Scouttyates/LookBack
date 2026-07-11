# LookBack v2 + Shared "The Daily" Updates — Design Spec

**Date:** 2026-07-11
**Author:** Scout (design w/ Opus 4.8)
**Executors:** primarily Sonnet 5; three items flagged `[Opus]` below.
**Repos touched:** `C:\Users\Scout\lookback` (primary) and `C:\Users\Scout\verbatim` (shared changes).

---

## 0. Why this document exists (read first)

Scout designs with Opus, ships with a cheaper model (Sonnet). **This spec is
written so a Sonnet-class model can execute nearly all of it without judgment
calls.** Every step is either "mirror this exact code / rule" (Sonnet-safe) or
tagged **`[Opus]`** (needs real design/authoring judgment — do not hand to
Sonnet).

### Model-tier rule of thumb

> **Default to Sonnet.** Only switch to Opus for the four `[Opus]` items:
> (1) `Atlas.svelte` geometry, (2) `ThroughLine.svelte` component,
> (3) authoring the Through-Line *group sets*, (4) the three OG card PNGs.
> Everything else — types/scoring/lint edits, content re-authoring of the
> mechanical rounds, routing, nav, OG meta tags — is Sonnet work when it
> follows the exact shapes in this doc.

---

## 1. Locked decisions (from brainstorming)

1. **Difficulty:** *fair-but-hard*. Decoys must be **as famous or more famous**
   than the answer; the answer is never the single most-recognizable name.
   Faces use **less-iconic depictions** ("more abstract").
2. **Hints:** *fewer + subtler*. Harden the underlying subjects so a hint still
   leaves real work. (After removing BorderLine, the only hinted round left is
   Battlefield — its clues must set the scene without naming the war/date/
   victor/place.)
3. **Game restructure (LookBack):** **remove BorderLine and Zoom Out**; **add
   Atlas** (100-pt geography round) and **Through-Line** (200-pt finale). Still
   7 rounds, still 800 max. *Geography stays in the game via Atlas; the country-
   outline mechanic is fully retired.*
4. **Finale:** Through-Line is the 200-pt capstone; Atlas is a 100-pt round.
5. **Three links:** keep the existing free Vercel URLs, restructured + cross-
   linked (no domain purchase). Hub `/` · LookBack `/play` · Verbatim
   (verbatim-azure) `/`.
6. **End-game nav:** summary offers **Home (hub)** + **Play the other game →**,
   always shown (no cross-domain "already played?" detection).
7. **Replay:** the archive already exists in both games — make it **discoverable**
   (splash + summary) **and reachable from the hub** (deep-link `?archive=1`).
8. **Rich previews:** **static branded OG card** per surface (hub, LookBack,
   Verbatim) — a committed 1200×630 PNG + Open Graph/Twitter meta tags.

---

## 2. New LookBack game shape

| Slot (index) | Round `type` | Pts | Status |
|---|---|---|---|
| 1 (0) | `faceFromPast` | 100 | keep · harder authoring |
| 2 (1) | `battlefield` | 100 | keep · subtler clues |
| 3 (2) | `whichCameFirst` \| `timeline` | 100 | keep · (parity convention unchanged) |
| 4 (3) | `whereInHistory` | 100 | keep · harder authoring |
| 5 (4) | `guessTheYear` | 100 | keep |
| 6 (5) | **`atlas`** | 100 | **NEW** (replaces `borderline`) |
| 7 (6) | **`throughLine`** | 200 | **NEW** finale (replaces `zoomOut`) |

Chronology parity convention is unchanged: **odd `puzzleNumber` → `whichCameFirst`,
even → `timeline`** (authoring convention only; the app renders whatever is in
the JSON).

Share grid stays 7 glyphs in rows of 3 (`[1 2 3][4 5 6][7]`) — no layout change.

---

## 3. Type changes — `src/types.ts` `[Sonnet, exact]`

**Remove** `BorderlineRound` and `ZoomOutRound` interfaces, their union members,
and the `ZoomOutDraft` interface (moved/renamed in §5). **Update** `RoundType`.

Replace the `RoundType` union members `'borderline'` and `'zoomOut'` with
`'atlas'` and `'throughLine'`:

```ts
export type RoundType =
  | 'faceFromPast'
  | 'battlefield'
  | 'whichCameFirst'
  | 'timeline'
  | 'whereInHistory'
  | 'guessTheYear'
  | 'atlas'
  | 'throughLine';
```

**Add** these interfaces (delete the two removed ones):

```ts
export interface AtlasRound {
  type: 'atlas';
  prompt: string;      // "Where in the world was the Kingdom of Aksum centered?"
  image?: ImageRef;    // optional; deferred-reveal, alt must not name the place
  answer: string;      // canonical place name, shown on reveal
  lat: number;         // target latitude  (-90..90)
  lng: number;         // target longitude (-180..180)
  tolKm: number;       // full-credit radius in km; bands double from there (>= 1)
  revealFact: string;  // one line shown after answering
}

export interface ThroughLineGroup {
  category: string;                          // revealed only after the group is solved
  members: [string, string, string, string]; // exactly 4 tile labels
}

export interface ThroughLineRound {
  type: 'throughLine';
  // exactly 4 groups -> 16 tiles; all 16 member strings unique;
  // no member string may equal any category string.
  groups: [ThroughLineGroup, ThroughLineGroup, ThroughLineGroup, ThroughLineGroup];
}
```

Update the `Round` union: drop `BorderlineRound | ZoomOutRound`, add
`AtlasRound | ThroughLineRound`.

Update the `RoundResult.score` comment: `0-100 (0-200 for throughLine)`.

Update the `Puzzle.rounds` comment to reference the new canonical order (§2).

---

## 4. Scoring changes — `src/lib/scoring.ts` `[Sonnet, exact]`

**Remove** `BorderlineAnswer`, `ZoomOutAnswer`, `scoreBorderline`,
`scoreZoomOut`, the `ZOOMOUT_SCORES` const, and their imports.

**Rename** `MAX_ZOOMOUT` → `MAX_FINALE = 200` (grep the repo for `MAX_ZOOMOUT`).

**Add** answer shapes + scorers:

```ts
export interface AtlasAnswer { guessLat: number; guessLng: number; distanceKm: number }
export interface ThroughLineAnswer { solvedGroupIndices: number[]; mistakes: number }

// Banded exactly like Guess-the-Year: 100 within tolKm, then doubling bands.
export function scoreAtlas(r: AtlasRound, a: AtlasAnswer): number {
  const d = a.distanceKm, t = r.tolKm;
  if (d <= t)      return 100;
  if (d <= t * 2)  return 80;
  if (d <= t * 4)  return 60;
  if (d <= t * 8)  return 40;
  if (d <= t * 16) return 20;
  return 0;
}

// 40 per solved group (max 160) + 40 clean-solve bonus (all 4, <=1 mistake) = 200.
export function scoreThroughLine(_r: ThroughLineRound, a: ThroughLineAnswer): number {
  const solved = a.solvedGroupIndices.length;         // 0..4
  const base = solved * 40;                            // 0/40/80/120/160
  const bonus = solved === 4 && a.mistakes <= 1 ? 40 : 0;
  return base + bonus;                                 // max 200
}
```

Update the `scoreRound` switch: drop `borderline`/`zoomOut` cases, add:

```ts
    case 'atlas':        return scoreAtlas(round, detail as AtlasAnswer);
    case 'throughLine':  return scoreThroughLine(round, detail as ThroughLineAnswer);
```

`computeTotal`, `stars`, `MAX_TOTAL = 800`, and star thresholds are **unchanged**
(total is still 6×100 + 200).

---

## 5. Persistence changes — `src/lib/persistence.ts` + `types.ts` `[Sonnet, exact]`

Atlas is a single confirmed action → **no draft needed**. Through-Line benefits
from mid-solve restore → **rename the Zoom-Out draft machinery to Through-Line**.

In `types.ts`, replace `ZoomOutDraft` with:

```ts
// In-progress Through-Line state, snapshotted after each solved group / mistake
// so a mid-round reload doesn't reset progress. Cleared when the round finishes.
export interface ThroughLineDraft {
  date: string;               // puzzle date — drafts for any other date are stale
  solvedGroupIndices: number[];
  mistakes: number;
}
```

In `persistence.ts`, rename symbol-for-symbol:
- `ZOOMOUT_DRAFT_KEY` → `THROUGHLINE_DRAFT_KEY = 'lookback:throughline:draft:v1'`
- `saveZoomOutDraft` → `saveThroughLineDraft`
- `loadZoomOutDraft` → `loadThroughLineDraft`
- `clearZoomOutDraft` → `clearThroughLineDraft`
- update `resetAll()` to remove the new key.

The `lookback:v1` main storage key is **unchanged** (existing player progress
survives). No migration needed — only round *types* change, and old finished
games still render on the archive/summary from their stored `roundResults`.

---

## 6. Atlas mechanic — `src/mechanics/Atlas.svelte` `[Opus]`

**Why Opus:** the projection + tap-inversion + haversine geometry is the one
piece with real "get-it-exactly-right" fiddliness. Everything downstream
(authoring, scoring) is trivial once this component is correct.

### Behaviour
1. Show `round.prompt` and (if present) `round.image` via `ImageCredit`
   (deferred reveal, same as other image rounds).
2. Render an interactive **world basemap** (see below). The player taps a spot;
   a pin appears; a **"Drop pin"** confirm button commits the guess (so a stray
   tap never auto-submits). Allow re-tapping to move the pin before confirming.
3. On confirm: compute `distanceKm` (haversine) between the tapped `[lat,lng]`
   and `[round.lat, round.lng]`. Reveal the correct location marker + a line/
   arrow from guess to answer, the distance in km, `round.answer`, and
   `round.revealFact`. Call `oncomplete(detail, score)` where
   `detail: AtlasAnswer = { guessLat, guessLng, distanceKm }` and
   `score = scoreAtlas(round, detail)`.

### Basemap + inversion (client-side d3-geo — deps already installed)
- Import the land geometry once: `world-atlas/countries-110m.json` →
  `topojson.feature(topo, topo.objects.countries)`.
- Projection: `geoEqualEarth()` `.fitExtent([[8,8],[W-8,H-8]], featureCollection)`
  with a fixed `viewBox="0 0 {W} {H}"` (suggest `W=640`, `H≈330`; let fitExtent
  set scale/translate). Draw one `<path d={geoPath(projection)(features)} />`
  with `fill: var(--ink-2); stroke: var(--paper); stroke-width: .3` (theme-aware
  via currentColor tokens; graticule optional).
- **Same projection object** handles taps: on `pointerdown`/click on the SVG,
  map client px → viewBox units:
  `x = (e.clientX - rect.left) * (W / rect.width)`,
  `y = (e.clientY - rect.top) * (H / rect.height)`, then
  `const inv = projection.invert([x, y]); if (!inv) return; const [lng, lat] = inv;`
  Guard `null` (taps off the projected globe) — ignore them.
- Haversine (km, R = 6371):
  ```ts
  function haversineKm(aLat:number,aLng:number,bLat:number,bLng:number){
    const toR=(d:number)=>d*Math.PI/180, R=6371;
    const dLat=toR(bLat-aLat), dLng=toR(bLng-aLng);
    const s=Math.sin(dLat/2)**2 + Math.cos(toR(aLat))*Math.cos(toR(bLat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.min(1,Math.sqrt(s)));
  }
  ```
- Bearing arrow (optional but nice): `↑↗→↘↓↙←↖` from initial bearing guess→answer.
- Mobile: the SVG must be responsive (`width:100%`, fixed aspect via viewBox);
  taps use pointer events; no drag needed. `draggable="false"` on any image.

### Authoring data (Sonnet)
Just `prompt`, `answer`, `lat`, `lng`, `tolKm`, `revealFact`, optional `image`.
`tolKm` guidance: pinpoint city/place ≈ **200 km** (100 pts within ~a country's
span); large empire/region ≈ **500–800 km**. Lint validates ranges (§9).

---

## 7. Through-Line mechanic — `src/mechanics/ThroughLine.svelte` `[Opus]`

**Why Opus:** stateful grid + draft persistence + reveal choreography. (The
*content* is also Opus — see §8.)

### Behaviour (historical "Connections")
1. Flatten the 16 members, shuffle once (`shuffleWithIndexMap` exists in
   `src/lib/shuffle.ts`), render a 4×4 grid of tap tiles.
2. Player taps up to **4** tiles (toggle highlight). "Submit" enabled at exactly 4.
3. On submit, compare the selected set against each unsolved group's `members`:
   - **Exact match** → lock that group as a solved colored band across the top,
     reveal its `category`, clear selection, remove those tiles from the grid.
   - **No match** → `mistakes += 1`, shake the selection, keep tiles selected so
     the player can adjust. (Optional "one away" nicety if exactly 3 of 4 belong
     to a single group.)
4. **Mistake budget = 4.** Round ends when either all 4 groups are solved **or**
   `mistakes === 4`. On a budget-out, auto-reveal the remaining groups greyed as
   "missed."
5. **Draft:** after every solved group or mistake, call
   `saveThroughLineDraft({ date, solvedGroupIndices, mistakes })` (only when a
   `puzzleDate` prop is passed, i.e. daily mode). Restore from
   `loadThroughLineDraft(puzzleDate)` on mount; `clearThroughLineDraft()` on
   finish. Mirror the exact prop pattern the old `ZoomOut.svelte` used
   (`puzzleDate?: string | null`, passed from `App.svelte` only in daily mode).
6. **Finish:** show all four categories with their members grouped, so the player
   *learns the connections*. Call `oncomplete(detail, score)` with
   `detail: ThroughLineAnswer = { solvedGroupIndices, mistakes }`,
   `score = scoreThroughLine(round, detail)`.

### Optional share flourish (nice-to-have, not required)
A Connections-style 4-line colored mini-grid appended below the standard glyph
row for the finale only. If skipped, the finale still shows the normal `🔗 200`
row. Keep the main per-round glyph grid uniform either way.

---

## 8. Content: authoring rules + re-authoring `[Sonnet, except Through-Line sets = Opus]`

### 8a. `docs/authoring-rules.md` updates
- **Delete** the BorderLine and Zoom-Out sections.
- **Add "Fair-but-hard" global rubric:**
  - Decoys must be **as recognizable or more recognizable** than the correct
    answer. The correct answer must **never** be the single most-famous option.
  - **Faces:** prefer less-iconic depictions — busts, side-profiles, younger/
    older likenesses, lesser-known portraits — over the one image everyone knows.
    The player should have to *reason from features/era*, not pattern-match fame.
  - **Battlefield clues:** set scene, stakes, terrain, era-feel. **Never** name
    the war, the year, the victor, or the place. 1 clue preferred; 2 max.
  - No same-day thematic leaks between rounds (existing rule — keep).
- **Add "Atlas" section:** coordinate sourcing, `tolKm` bands, prompts that name
  the subject without hinting the hemisphere/continent.
- **Add "Through-Line" section (the craft rules):**
  - 4 categories spanning eras/roles/places; at least **one deliberate overlap
    trap** (a member that plausibly fits another group).
  - Every member belongs to **exactly one** intended group; all 16 member
    strings unique; no member equals a category label; keep labels short (fits a
    tile). Difficulty discipline like Verbatim's CrossClue.
  - **These sets are authored with Opus** (or carefully human-reviewed). The lint
    enforces *structure*, not semantic fairness.

### 8b. Re-author the shipped puzzles `[Sonnet; Through-Line groups = Opus]`
Currently 10 days: `public/puzzles/2026-07-09.json … 2026-07-18.json`. For each:
1. **Remove** the `borderline` (slot 2) and `zoomOut` (slot 7) rounds.
2. **Add** an `atlas` round (new slot 6) and a `throughLine` round (new slot 7),
   matching the canonical order in §2.
3. Apply the fair-but-hard rewrite to `faceFromPast`, `battlefield`,
   `whereInHistory` (decoys, clues, less-iconic face images).
4. Fetch any new images **only** via `scripts/fetch-image.mjs` and **Read-check
   every one** (subject correct, no text leaks) — unchanged rule.
5. Run `npm run lint:puzzles` until clean; the pre-commit hook re-runs it.

The Zoom-Out-specific image note (1600px / near-square) is removed from the image
pipeline docs; Atlas images (optional) use normal widths.

`public/borders/*.svg`, `scripts/generate-borders.mjs`, and `src/lib/countries.ts`
become dead once BorderLine is gone — **delete them** in the same change (and drop
the `borders` npm script). `world-atlas`/`topojson-client`/`d3-geo` **stay** — they
are now imported by `Atlas.svelte` at runtime. (Vite bundles devDependencies into
the client build fine, so no `package.json` section move is required; leave them
where they are.)

---

## 9. Lint — `scripts/lint-puzzles.mjs` `[Sonnet, exact rules]`

Keep the skeleton; change the rules. **Failures (exit 1):**
1. Exactly 7 rounds in canonical order:
   `['faceFromPast','battlefield', ('whichCameFirst'|'timeline'), 'whereInHistory','guessTheYear','atlas','throughLine']`.
2. Per-type structural checks — **remove** borderline & zoomOut checks; **add:**
   - `atlas`: `answer` non-empty; `-90 ≤ lat ≤ 90`; `-180 ≤ lng ≤ 180`;
     `tolKm ≥ 1`; `revealFact` non-empty; if `image` present, attribution
     complete + license in allowlist + file exists on disk.
   - `throughLine`: exactly 4 groups; each `members` length 4; all 16 members
     unique (case-insensitive, trimmed); no member string equals any `category`;
     categories distinct and non-empty.
3. **90-day no-repeat window** now covers: face person, battle, chronology
   labels, whereInHistory correct event, year subject, **atlas `answer`**,
   **every throughLine member and category**. (Substitutions go in the LATER
   puzzle; never loosen `REUSE_WINDOW_DAYS = 90`.)
4. Every `ImageRef.src` exists; fail > 800 KB; attribution complete + license in
   allowlist (unchanged).
5. `index.json` consistent; `puzzleNumber` = offset + 1 (unchanged).
6. Options unique / correct answer present at `correctIndex` for the
   remaining choice rounds (face, battlefield, whereInHistory) — unchanged.

**Remove** the old check: "`countryId` has `public/borders/<id>.svg` and matches
`countries.ts`."

**Warnings:** decoy repeats within 90 days; image > 400 KB; alt text containing
the answer; slot-3 chronology type same as previous day; (drop the correctIndex-
bias warning for zoomOut).

---

## 10. Wiring — `App.svelte` + screens `[Sonnet, exact]`

- **`src/App.svelte`:** remove `BorderLine`/`ZoomOut` imports + their dispatch
  branches; add `Atlas`/`ThroughLine` imports + branches. `ThroughLine` receives
  `puzzleDate={mode === 'daily' && puzzle ? puzzle.date : null}` (same pattern the
  old ZoomOut used). Atlas needs no `puzzleDate`.
- **`src/screens/RoundIntro.svelte`:** update the type→label/blurb map — remove
  borderline/zoomOut, add `atlas` ("Atlas — pin it on the map") and `throughLine`
  ("Through-Line — find the four hidden groups").
- **`src/screens/RoundResult.svelte`:** add per-type result rendering:
  - `atlas`: "You were **{distanceKm} km** away" + the answer + `revealFact`
    (optionally a static mini-map with both pins).
  - `throughLine`: list the four `category` → `members`, marking which the player
    solved vs missed; show `solved×40 (+40 bonus?)`.
  Remove borderline/zoomOut branches.
- **`src/lib/share.ts`:** in `GLYPH`, remove `borderline`/`zoomOut`; add
  `atlas: '📍'`, `throughLine: '🔗'`. Nothing else changes (URL already trails
  the share text).
- **`src/screens/SummaryScreen.svelte`:** update `ROUND_LABELS` (remove old, add
  `atlas: 'Atlas'`, `throughLine: 'Through-Line'`). Nav changes in §12.
- Grep for any lingering `borderline`, `zoomOut`, `ZoomOut`, `BorderLine`,
  `MAX_ZOOMOUT` and fix. Run `npm run check` (svelte-check) until clean.
- **Stale-data guard (required):** a player who finished an *old* version of a
  now-re-authored day has `roundResults` in localStorage tagged `borderline`/
  `zoomOut`. Make every runtime lookup keyed by `RoundResult['type']` defensive
  so those don't render `undefined`: `GLYPH[t] ?? '•'` (share),
  `ROUND_LABELS[t] ?? t` (Summary), and skip unknown types in `RoundResult.svelte`
  rather than assuming a branch matches. (No storage reset — old finished games
  still show their score, just with a fallback glyph/label.)
- **`CLAUDE.md`:** update the "Game shape constants" + round list to match §2.

---

## 11. Three links + cross-navigation `[Sonnet]`

The three URLs already exist; the real gap is that **Verbatim links nowhere**.
Add a tiny shared constant to each repo and wire header/footer nav.

**LookBack** (`src/lib/links.ts`):
```ts
export const LINKS = {
  hub:      '/',                                  // same origin as /play
  self:     '/play',
  verbatim: 'https://verbatim-azure.vercel.app/',
};
```
**Verbatim** (`src/lib/links.ts`):
```ts
export const LINKS = {
  hub:      'https://look-back-lemon.vercel.app/',
  lookback: 'https://look-back-lemon.vercel.app/play',
  self:     '/',
};
```

- **Verbatim** gets a small hub link ("← The Daily") in its splash/topbar and a
  LookBack cross-link, mirroring how LookBack already reaches the hub.
- **Hub** (`index.html`) already links both games — no change beyond §13/§14.

---

## 12. End-game navigation `[Sonnet]`

`SummaryScreen.svelte`, **daily mode**, below the Share block:
- **"Back to Home"** → `window.location.href = LINKS.hub` (leaves the SPA for the
  static hub — intended).
- **"Play Verbatim →"** → `window.location.href = LINKS.verbatim`.
  (Verbatim's SummaryScreen gets the mirror: "Play LookBack →" → `LINKS.lookback`.)
- **Practice mode** keeps the existing internal **"Back to the Archive"**
  (`onhome`) button — do not send practice runs to the hub.

No cross-domain "already played" detection (decided): always offer the other game.

---

## 13. Archive discoverability + hub deep-link `[Sonnet]`

The archive works in both games; surface it.
- **Both games' SplashScreen:** ensure a clearly-labeled **"Past Puzzles"**
  button (LookBack already calls `onarchive` — verify it's visible; add to
  Verbatim if missing).
- **Both games' SummaryScreen (daily):** add a subtle **"Replay a past day →"**
  link that opens the archive.
- **Hub deep-link:** both `App.svelte` bootstraps read
  `new URLSearchParams(location.search).get('archive')`; if `=== '1'` and the
  index has loaded, open directly to the `archive` screen instead of `splash`.
  Then the hub (`index.html`) gets a **"Past Puzzles"** affordance linking to
  `/play?archive=1` (LookBack) and `https://verbatim-azure.vercel.app/?archive=1`
  (Verbatim). This satisfies "replay from the hub too."

---

## 14. Rich link previews — static OG cards `[Sonnet meta-tags + Opus one-time PNGs]`

**Meta tags `[Sonnet]`** — add to `<head>` of `index.html` (hub), `play.html`
(LookBack), and Verbatim's `index.html`, with per-page values:
```html
<meta property="og:type" content="website" />
<meta property="og:title" content="…" />
<meta property="og:description" content="…" />
<meta property="og:url" content="{absolute page URL}" />
<meta property="og:image" content="{absolute PNG URL}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="{absolute PNG URL}" />
```
- Hub → `og:url https://look-back-lemon.vercel.app/`, `og:image …/og/the-daily.png`
- LookBack → `og:url …/play`, `og:image …/og/lookback.png`
- Verbatim → `og:url https://verbatim-azure.vercel.app/`, `og:image …/og/verbatim.png`

Because the share clipboard text already ends with the game URL, iMessage/
Twitter will unfurl the card automatically once these tags exist. (Note: iMessage
caches OG aggressively; a changed image may need a fresh URL or time to refresh.)

**The three PNGs `[Opus, one-time]`** — 1200×630, committed to `public/og/` in
each repo. Build each card as a small standalone HTML using the paper/ink token
palette (LookBack sepia/ochre; Verbatim red), open it in the browser preview at
1200×630, screenshot to PNG, commit. Keep under ~200 KB each.

---

## 15. Files touched (checklist)

**LookBack repo**
- Edit: `src/types.ts`, `src/lib/scoring.ts`, `src/lib/persistence.ts`,
  `src/App.svelte`, `src/lib/share.ts`, `src/screens/RoundIntro.svelte`,
  `src/screens/RoundResult.svelte`, `src/screens/SummaryScreen.svelte`,
  `src/screens/SplashScreen.svelte`, `scripts/lint-puzzles.mjs`,
  `docs/authoring-rules.md`, `CLAUDE.md`, `package.json`, `index.html`,
  `play.html`, all `public/puzzles/*.json`.
- New: `src/mechanics/Atlas.svelte` `[Opus]`, `src/mechanics/ThroughLine.svelte`
  `[Opus]`, `src/lib/links.ts`, `public/og/lookback.png`, `public/og/the-daily.png`.
- Delete: `src/mechanics/BorderLine.svelte`, `src/mechanics/ZoomOut.svelte`,
  `scripts/generate-borders.mjs`, `src/lib/countries.ts`, `public/borders/*.svg`.

**Verbatim repo**
- Edit: `src/App.svelte` (archive `?archive=1` deep-link), `src/screens/
  SplashScreen.svelte` (Past-Puzzles + hub link), `src/screens/SummaryScreen.svelte`
  (Home + "Play LookBack →" + replay link), `index.html` (OG tags).
- New: `src/lib/links.ts`, `public/og/verbatim.png`.

---

## 16. Verification (end-to-end)

- `npm run check` and `npm run lint:puzzles` clean in **both** repos.
- Full LookBack playthrough (dev server, preview tools): all 7 rounds incl.
  **Atlas** (pin + distance + banded score) and **Through-Line** (group solves,
  mistake budget, 200-cap, reveal); Through-Line draft survives a mid-round
  reload; total/stars/share correct; streak increments.
- Three links resolve and cross-link: hub `/`, `/play`, verbatim `/`; each
  game's "Home" reaches the hub; summary offers the other game.
- Hub "Past Puzzles" opens each game straight into its archive (`?archive=1`).
- Share a link in iMessage → rich thumbnail unfurls (static OG card) for hub,
  LookBack, and Verbatim.
- Every shipped image individually Read-checked (subject + no leaks); every
  license in the allowlist.

---

## 17. Suggested build order (each step independently shippable)

1. **`[Sonnet]`** Types + scoring + persistence + lint + App/screens wiring, with
   the round types swapped (puzzles temporarily failing lint on missing new
   rounds is fine). Get `npm run check` green.
2. **`[Opus]`** `Atlas.svelte` — build + verify one hand-authored Atlas round.
3. **`[Opus]`** `ThroughLine.svelte` — build + verify one hand-authored set;
   confirm draft restore.
4. **`[Sonnet]` + `[Opus]` content** Re-author all 10 days (Sonnet does the
   mechanical rounds + images; Opus authors the Through-Line group sets). Lint
   clean; delete dead BorderLine assets.
5. **`[Sonnet]`** Three links + `links.ts` + Verbatim nav + end-game nav.
6. **`[Sonnet]`** Archive discoverability + `?archive=1` deep-link (both repos).
7. **`[Sonnet]` tags + `[Opus]` PNGs** OG cards for all three surfaces.
8. Ship: commit per repo (pre-commit hook runs), push; Vercel auto-deploys.

Steps 5–7 touch the Verbatim repo and can proceed in parallel with 2–4.
