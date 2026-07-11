# LookBack v2 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure LookBack's 7 rounds — remove BorderLine + Zoom-Out, add **Atlas** (100-pt pin-drop geography round) and **Through-Line** (200-pt Connections finale) — and re-author all content to a fair-but-hard bar.

**Architecture:** Svelte 5 + Vite + TS SPA. Round payloads live in `public/puzzles/*.json`; each `type` maps to a mechanic component dispatched in `App.svelte`; pure scorers in `src/lib/scoring.ts`; a node linter (`scripts/lint-puzzles.mjs`) is the content quality gate. We swap types **additively first** (old + new coexist so the tree always compiles), build the two new mechanics, re-author content, then delete the dead code last.

**Tech Stack:** Svelte 5 (runes), TypeScript, Vite, `d3-geo` + `topojson-client` + `world-atlas` (already installed; Atlas uses them at runtime), Vercel.

**Source spec:** `docs/superpowers/specs/2026-07-11-lookback-v2-and-shared-design.md` (§2–§10).

**Repo:** `C:\Users\Scout\lookback` — every task here is in this repo.

---

## Testing note (read once)

This repo has **no unit-test runner** and we are not adding one (YAGNI). "Tests"
in this plan mean the repo's real gates, run from the repo root:

- `npm run check` — svelte-check + `tsc`. Green = types/compile correct.
- `npm run lint:puzzles` — content structural + 90-day-no-repeat gate.
- **Browser verification** via the preview tools (`preview_start {name:"dev"}`,
  then `read_page`/`computer`/`read_console_messages`) — the only way to verify
  mechanic behavior. Never claim a mechanic works without driving it in the browser.
- For pure scorers, a throwaway `node` assertion snippet is the red/green "test"
  (shown in Task 1). No framework, no committed test files.

If `.claude/launch.json` has no `dev` entry, create one:
`{"version":"0.0.1","configurations":[{"name":"dev","runtimeExecutable":"npm","runtimeArgs":["run","dev"],"port":5173}]}`
(confirm the port Vite prints).

**Why the ordering matters:** `RoundType` is referenced by four *exhaustive*
constructs — `RoundIntro.svelte` (`LABELS: Record<RoundType,…>`),
`RoundResult.svelte` (`buildReveal` switch with a typed return), `share.ts`
(`GLYPH`), and `SummaryScreen.svelte` (`ROUND_LABELS`). Adding a member to
`RoundType`/`Round` breaks all four until they handle it. So **Task 1 adds the new
keys/cases in the same commit** that extends the union — that's what keeps
`npm run check` green. The reverse (removing the old members) is done last, in
Task 6, together with the stale-data runtime guards.

**Model tier:** Tasks 2 and 3 (the two mechanics) and the Through-Line group
authoring in Task 5 are **`[Opus]`**. Everything else is **`[Sonnet]`**.

---

## File Structure

- **Create:** `src/mechanics/Atlas.svelte`, `src/mechanics/ThroughLine.svelte`.
- **Modify:** `src/types.ts`, `src/lib/scoring.ts`, `src/lib/persistence.ts`,
  `src/App.svelte`, `src/lib/share.ts`, `src/screens/RoundIntro.svelte`,
  `src/screens/RoundResult.svelte`, `src/screens/SummaryScreen.svelte`,
  `scripts/lint-puzzles.mjs`, `docs/authoring-rules.md`, `CLAUDE.md`,
  `public/puzzles/2026-07-09.json … 2026-07-18.json`.
- **Delete (Task 6 only):** `src/mechanics/BorderLine.svelte`,
  `src/mechanics/ZoomOut.svelte`, `scripts/generate-borders.mjs`,
  `src/lib/countries.ts`, `public/borders/*.svg`, plus the `borders` npm script.

---

## Task 1: Data model + keep-the-tree-green wiring `[Sonnet]`

Adds the two new round types everywhere `RoundType`/`Round` is consumed
exhaustively. Old `borderline`/`zoomOut` stay (removed in Task 6). Ends green.

**Files:**
- Modify: `src/types.ts`, `src/lib/scoring.ts`, `src/lib/persistence.ts`,
  `src/screens/RoundIntro.svelte`, `src/lib/share.ts`,
  `src/screens/SummaryScreen.svelte`, `src/screens/RoundResult.svelte`

- [ ] **Step 1: `types.ts` — extend the unions + add interfaces**

Add `'atlas'` and `'throughLine'` to the `RoundType` union (keep the old members).
Add these interfaces after `ZoomOutRound`:

```ts
export interface AtlasRound {
  type: 'atlas';
  prompt: string;      // "Where in the world was the Kingdom of Aksum centered?"
  image?: ImageRef;    // optional; deferred-reveal, alt must NOT name the place
  answer: string;      // canonical place name, shown on reveal
  lat: number;         // target latitude  (-90..90)
  lng: number;         // target longitude (-180..180)
  tolKm: number;       // full-credit radius (km); bands double from there (>= 1)
  revealFact: string;
}

export interface ThroughLineGroup {
  category: string;                           // revealed only after the group is solved
  members: [string, string, string, string]; // exactly 4 tile labels
}

export interface ThroughLineRound {
  type: 'throughLine';
  groups: [ThroughLineGroup, ThroughLineGroup, ThroughLineGroup, ThroughLineGroup];
}
```

Add both to the `Round` union (keep old members):
`... | ZoomOutRound | AtlasRound | ThroughLineRound;`

Add the draft interface after `ZoomOutDraft` (keep `ZoomOutDraft` for now):

```ts
export interface ThroughLineDraft {
  date: string;                 // puzzle date — drafts for any other date are stale
  solvedGroupIndices: number[];
  mistakes: number;
}
```

- [ ] **Step 2: `scoring.ts` — answer shapes + scorers + switch cases**

Add `AtlasRound, ThroughLineRound` to the type import list. Add after
`ZoomOutAnswer`:

```ts
export interface AtlasAnswer { guessLat: number; guessLng: number; distanceKm: number }
export interface ThroughLineAnswer { solvedGroupIndices: number[]; mistakes: number }
```

Add the scorers after `scoreZoomOut`:

```ts
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
  const solved = a.solvedGroupIndices.length;      // 0..4
  const base = solved * 40;                         // 0/40/80/120/160
  const bonus = solved === 4 && a.mistakes <= 1 ? 40 : 0;
  return base + bonus;                              // max 200
}
```

Add the two cases to the `scoreRound` switch (keep the old cases):

```ts
    case 'atlas':        return scoreAtlas(round, detail as AtlasAnswer);
    case 'throughLine':  return scoreThroughLine(round, detail as ThroughLineAnswer);
```

`computeTotal`, `stars`, `MAX_TOTAL = 800` are unchanged.

- [ ] **Step 3: `persistence.ts` — Through-Line draft functions**

Add `ThroughLineDraft` to the type import. Add (leave the ZoomOut ones for now):

```ts
const THROUGHLINE_DRAFT_KEY = 'lookback:throughline:draft:v1';

export function saveThroughLineDraft(draft: ThroughLineDraft): void {
  try { localStorage.setItem(THROUGHLINE_DRAFT_KEY, JSON.stringify(draft)); }
  catch { /* ignore quota/availability */ }
}

export function loadThroughLineDraft(date: string): ThroughLineDraft | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(THROUGHLINE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThroughLineDraft;
    if (parsed.date !== date) {
      try { localStorage.removeItem(THROUGHLINE_DRAFT_KEY); } catch { /* noop */ }
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function clearThroughLineDraft(): void {
  try { localStorage.removeItem(THROUGHLINE_DRAFT_KEY); } catch { /* noop */ }
}
```

Also add `try { localStorage.removeItem(THROUGHLINE_DRAFT_KEY); } catch { /* noop */ }`
to `resetAll()`.

- [ ] **Step 4: `RoundIntro.svelte` — add the two LABELS entries**

In the `LABELS: Record<RoundType, { title: string; hint: string }>` object, add:

```ts
    atlas:          { title: 'Atlas',          hint: 'A place in history — pin it on the world map.' },
    throughLine:    { title: 'Through-Line',   hint: 'Sixteen tiles, four hidden groups. Find the links.' },
```

- [ ] **Step 5: `share.ts` — add the two glyphs**

In the `GLYPH` object add: `atlas: '📍',` and `throughLine: '🔗',`.

- [ ] **Step 6: `SummaryScreen.svelte` — add the two ROUND_LABELS**

In `ROUND_LABELS` add: `atlas: 'Atlas',` and `throughLine: 'Through-Line',`.

- [ ] **Step 7: `RoundResult.svelte` — add the two switch cases + finale max**

In `buildReveal`, add before the closing `}` of the switch:

```ts
      case 'atlas':
        return { headline: r.answer, sub: '', blurb: r.revealFact, list: [] };
      case 'throughLine':
        return {
          headline: 'The four groups',
          sub: '',
          blurb: '',
          list: r.groups.map((g) => ({ label: g.category, detail: g.members.join(' · ') })),
        };
```

Change the `roundMax` derived (currently `round.type === 'zoomOut' ? 200 : 100`) to
cover both finales during the transition:

```ts
  let roundMax = $derived(round.type === 'zoomOut' || round.type === 'throughLine' ? 200 : 100);
```

- [ ] **Step 8: Verify scorer math (red/green)**

```bash
node --input-type=module -e "
const scoreAtlas=(t,d)=>d<=t?100:d<=t*2?80:d<=t*4?60:d<=t*8?40:d<=t*16?20:0;
const scoreTL=(s,m)=>s*40+(s===4&&m<=1?40:0);
console.assert(scoreAtlas(200,150)===100,'atlas full');
console.assert(scoreAtlas(200,700)===60,'atlas 4x');
console.assert(scoreAtlas(200,99999)===0,'atlas miss');
console.assert(scoreTL(4,0)===200,'tl perfect');
console.assert(scoreTL(4,2)===160,'tl no bonus');
console.assert(scoreTL(2,3)===80,'tl partial');
console.assert(scoreTL(0,4)===0,'tl bust');
console.log('scoring math OK');
"
```
Expected: `scoring math OK`, no assertion output.

- [ ] **Step 9: Type-check**

Run: `npm run check`
Expected: **PASS.** (All four exhaustive constructs now cover the new types; old
types still present; no mechanic/dispatch references the new types yet.)

- [ ] **Step 10: Commit**

```bash
git add src/types.ts src/lib/scoring.ts src/lib/persistence.ts src/screens/RoundIntro.svelte src/lib/share.ts src/screens/SummaryScreen.svelte src/screens/RoundResult.svelte
git commit -m "feat(lookback): add Atlas + Through-Line data model and green wiring (additive)"
```

---

## Task 2: Build `Atlas.svelte` mechanic `[Opus]`

Pin-drop geography with a d3-geo world basemap, tap→invert→haversine, banded score.

**Files:**
- Create: `src/mechanics/Atlas.svelte`
- Modify: `src/App.svelte` (dispatch branch + import), `tsconfig.app.json` (if needed)
- Test: browser (dev server) with a temporary hand-authored round.

- [ ] **Step 1: Write the component**

Create `src/mechanics/Atlas.svelte`:

```svelte
<script lang="ts">
  import type { AtlasRound } from '../types';
  import { scoreAtlas, type AtlasAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import ImageCredit from '../components/ImageCredit.svelte';
  import { geoEqualEarth, geoPath } from 'd3-geo';
  import { feature } from 'topojson-client';
  import world from 'world-atlas/countries-110m.json';

  let { round, oncomplete }: {
    round: AtlasRound;
    oncomplete: (detail: AtlasAnswer, score: number) => void;
  } = $props();

  const W = 640, H = 330;
  const land: any = feature(world as any, (world as any).objects.countries);
  const projection = geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], land);
  const landPath = geoPath(projection as any)(land) ?? '';

  let svgEl: SVGSVGElement;
  let guess: { lng: number; lat: number; x: number; y: number } | null = $state(null);
  let done = $state(false);
  let answerXY = $derived.by(() => {
    const p = projection([round.lng, round.lat]);
    return p ? { x: p[0], y: p[1] } : null;
  });

  function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const toR = (d: number) => (d * Math.PI) / 180, R = 6371;
    const dLat = toR(bLat - aLat), dLng = toR(bLng - aLng);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  function onMapClick(e: MouseEvent) {
    if (done) return;
    const rect = svgEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const inv = projection.invert?.([x, y]);
    if (!inv) return; // tapped off the projected globe
    guess = { lng: inv[0], lat: inv[1], x, y };
  }

  let distanceKm = $derived(
    guess ? haversineKm(guess.lat, guess.lng, round.lat, round.lng) : 0);

  function confirm() {
    if (!guess || done) return;
    done = true;
    const detail: AtlasAnswer = { guessLat: guess.lat, guessLng: guess.lng, distanceKm };
    const score = scoreAtlas(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }
</script>

<section class="anim-enter">
  <p class="eyebrow">Atlas</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    {round.prompt}
  </h2>

  {#if round.image}
    <div class="image-frame" style="margin-top: var(--space-3); position: relative">
      <img src={round.image.src} alt={round.image.alt} draggable="false" style="width: 100%; display: block" />
      <ImageCredit attribution={round.image.attribution} revealed={done} />
    </div>
  {/if}

  <svg bind:this={svgEl} viewBox="0 0 {W} {H}" role="img" onclick={onMapClick}
       style="width: 100%; height: auto; margin-top: var(--space-4); cursor: crosshair; background: var(--paper-deep); border: 1px solid var(--rule); border-radius: var(--radius-sm); touch-action: manipulation">
    <path d={landPath} fill="var(--ink-2)" stroke="var(--paper)" stroke-width="0.3" />
    {#if guess}
      <circle cx={guess.x} cy={guess.y} r="4" fill="var(--accent)" stroke="var(--paper)" stroke-width="1" />
    {/if}
    {#if done && answerXY && guess}
      <line x1={guess.x} y1={guess.y} x2={answerXY.x} y2={answerXY.y} stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 2" />
      <circle cx={answerXY.x} cy={answerXY.y} r="5" fill="none" stroke="#4a7c59" stroke-width="2" />
    {/if}
  </svg>

  {#if !done}
    <button class="btn btn-block" style="margin-top: var(--space-4)" disabled={!guess} onclick={confirm}>
      {guess ? 'Drop pin here' : 'Tap the map to place your pin'}
    </button>
  {:else}
    <p class="mono center" style="margin-top: var(--space-3)">{Math.round(distanceKm).toLocaleString()} km away</p>
    <p class="serif-text center" style="margin-top: var(--space-2)"><span class="accent">{round.answer}</span></p>
    <p class="serif-text muted center" style="margin-top: var(--space-2); font-style: italic">{round.revealFact}</p>
  {/if}
</section>
```

> **If `geoEqualEarth` isn't exported** by the installed d3-geo, use
> `geoNaturalEarth1` instead (same call shape). **If `import world from
> 'world-atlas/countries-110m.json'` errors under svelte-check**, add
> `"resolveJsonModule": true` to `tsconfig.app.json`'s `compilerOptions`.

- [ ] **Step 2: Add a temporary Atlas round to play it**

Edit `public/puzzles/2026-07-11.json`: replace its slot-2 `borderline` round with
this scratch `atlas` round (properly overwritten in Task 5):

```json
{ "type": "atlas", "prompt": "Where in the world is the city of Timbuktu?",
  "answer": "Timbuktu, Mali", "lat": 16.7735, "lng": -3.0074, "tolKm": 250,
  "revealFact": "A Saharan trading and scholarly hub of the Mali Empire, famed for its medieval manuscripts." }
```

- [ ] **Step 3: Wire the dispatch branch**

In `src/App.svelte`, add `import Atlas from './mechanics/Atlas.svelte';` with the
other mechanic imports, and add to the `{#if currentRound.type === …}` ladder:

```svelte
    {:else if currentRound.type === 'atlas'}
      <Atlas round={currentRound} oncomplete={handleRoundComplete} />
```

- [ ] **Step 4: Drive it in the browser**

`npm run check` → PASS. `preview_start {name:"dev"}`; play to round 2 (Atlas).
`read_page` → map SVG renders; `computer` click near West Africa → "Drop pin"
enables; click it → `read_page` confirms "… km away" + answer + fact; the round
advances to RoundResult with a plausible score. `read_console_messages
{onlyErrors:true}` → none.

- [ ] **Step 5: Commit**

```bash
git add src/mechanics/Atlas.svelte src/App.svelte public/puzzles/2026-07-11.json tsconfig.app.json
git commit -m "feat(lookback): Atlas pin-drop mechanic (d3-geo basemap + haversine)"
```

---

## Task 3: Build `ThroughLine.svelte` mechanic `[Opus]`

16-tile Connections finale with a 4-mistake budget and draft persistence.

**Files:**
- Create: `src/mechanics/ThroughLine.svelte`
- Modify: `src/App.svelte` (dispatch branch + import), possibly `src/lib/shuffle.ts`
- Test: browser (dev server) with a temporary hand-authored round.

- [ ] **Step 1: Write the component**

Create `src/mechanics/ThroughLine.svelte`:

```svelte
<script lang="ts">
  import type { ThroughLineRound } from '../types';
  import { scoreThroughLine, type ThroughLineAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import { saveThroughLineDraft, loadThroughLineDraft, clearThroughLineDraft } from '../lib/persistence';

  let { round, oncomplete, puzzleDate = null }: {
    round: ThroughLineRound;
    oncomplete: (detail: ThroughLineAnswer, score: number) => void;
    puzzleDate?: string | null;
  } = $props();

  type Tile = { label: string; group: number };
  const allTiles: Tile[] = round.groups.flatMap((g, gi) =>
    g.members.map((label) => ({ label, group: gi })));

  // Deterministic-enough shuffle without Math.random (varies by content order).
  // svelte-ignore state_referenced_locally
  const tiles: Tile[] = [...allTiles].sort((a, b) =>
    (a.label.length * 7 + a.label.charCodeAt(0)) - (b.label.length * 7 + b.label.charCodeAt(0)));

  const draft = puzzleDate ? loadThroughLineDraft(puzzleDate) : null;
  let solvedGroups: number[] = $state(draft?.solvedGroupIndices ?? []);
  let mistakes = $state(draft?.mistakes ?? 0);
  let selected: number[] = $state([]);
  let shake = $state(false);
  let done = $state(false);

  const MISTAKE_BUDGET = 4;
  let remainingTiles = $derived(
    tiles.map((t, i) => ({ t, i })).filter(({ t }) => !solvedGroups.includes(t.group)));

  function persist() {
    if (!puzzleDate) return;
    saveThroughLineDraft({ date: puzzleDate, solvedGroupIndices: solvedGroups, mistakes });
  }

  function toggle(i: number) {
    if (done) return;
    if (selected.includes(i)) selected = selected.filter((x) => x !== i);
    else if (selected.length < 4) selected = [...selected, i];
  }

  function submit() {
    if (selected.length !== 4 || done) return;
    const gs = selected.map((i) => tiles[i].group);
    const g = gs[0];
    if (gs.every((x) => x === g) && !solvedGroups.includes(g)) {
      solvedGroups = [...solvedGroups, g];
      selected = [];
      persist();
      if (solvedGroups.length === 4) finish();
    } else {
      mistakes += 1;
      shake = true;
      setTimeout(() => (shake = false), 450);
      persist();
      if (mistakes >= MISTAKE_BUDGET) finish();
    }
  }

  function finish() {
    if (done) return;
    done = true;
    if (puzzleDate) clearThroughLineDraft();
    const detail: ThroughLineAnswer = { solvedGroupIndices: solvedGroups, mistakes };
    const score = scoreThroughLine(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }
</script>

<section class="anim-enter">
  <p class="eyebrow">Through-Line · Finale</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    Find the four hidden groups
  </h2>
  <p class="mono muted center" style="margin-top: var(--space-2); font-size: 0.75rem">
    {MISTAKE_BUDGET - mistakes} mistakes left · up to 200 pts
  </p>

  {#each solvedGroups as gi}
    <div class="tl-band" style="margin-top: var(--space-3)">
      <strong>{round.groups[gi].category}</strong>
      <span class="tl-members">{round.groups[gi].members.join(' · ')}</span>
    </div>
  {/each}

  {#if !done}
    <div class="tl-grid {shake ? 'tl-shake' : ''}" style="margin-top: var(--space-3)">
      {#each remainingTiles as { t, i }}
        <button class="tl-tile" data-sel={selected.includes(i)} aria-pressed={selected.includes(i)} onclick={() => toggle(i)}>
          {t.label}
        </button>
      {/each}
    </div>
    <button class="btn btn-block" style="margin-top: var(--space-4)" disabled={selected.length !== 4} onclick={submit}>
      Submit ({selected.length}/4)
    </button>
  {:else}
    {#each round.groups as g, gi}
      {#if !solvedGroups.includes(gi)}
        <div class="tl-band tl-band--missed" style="margin-top: var(--space-2)">
          <strong>{g.category}</strong>
          <span class="tl-members">{g.members.join(' · ')}</span>
        </div>
      {/if}
    {/each}
  {/if}
</section>

<style>
  .tl-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
  .tl-tile { padding: var(--space-3) var(--space-2); border: 1px solid var(--rule);
    border-radius: var(--radius-sm); background: var(--paper-card, #fbf9f3); color: var(--ink);
    font-size: 0.7rem; line-height: 1.15; text-align: center; cursor: pointer; min-height: 56px; }
  .tl-tile[data-sel="true"] { background: var(--ink); color: var(--paper); border-color: var(--ink); }
  .tl-band { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2) var(--space-3);
    background: var(--accent); color: var(--paper); border-radius: var(--radius-sm); font-size: 0.8rem; }
  .tl-members { color: rgba(255,255,255,0.85); font-size: 0.72rem; }
  .tl-band--missed { background: var(--muted, #8a857a); }
  .tl-shake { animation: tl-shake 0.45s; }
  @keyframes tl-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
</style>
```

> The inline `sort` avoids `Math.random` (unavailable in some runtimes and
> non-deterministic for draft restore). If you'd rather use the repo's
> `shuffleWithIndexMap`, make it generic (`<T>(items: T[])`) in
> `src/lib/shuffle.ts` first so `npm run check` stays green.

- [ ] **Step 2: Add a temporary Through-Line round**

Edit `public/puzzles/2026-07-11.json`: replace its slot-7 `zoomOut` round with:

```json
{ "type": "throughLine", "groups": [
  { "category": "Ancient wonders", "members": ["Colossus", "Lighthouse", "Mausoleum", "Pyramid"] },
  { "category": "Roman emperors", "members": ["Nero", "Hadrian", "Trajan", "Augustus"] },
  { "category": "Renaissance painters", "members": ["Titian", "Raphael", "Giotto", "Caravaggio"] },
  { "category": "Rivers of antiquity", "members": ["Tigris", "Nile", "Indus", "Euphrates"] }
] }
```

- [ ] **Step 3: Wire the dispatch branch**

In `src/App.svelte`, add `import ThroughLine from './mechanics/ThroughLine.svelte';`
and:

```svelte
    {:else if currentRound.type === 'throughLine'}
      <ThroughLine round={currentRound} oncomplete={handleRoundComplete}
        puzzleDate={mode === 'daily' && puzzle ? puzzle.date : null} />
```

- [ ] **Step 4: Drive it in the browser (including draft restore)**

`npm run check` → PASS. `preview_start {name:"dev"}`; play to the finale.
- Select 4 tiles of one true group → Submit → a locked band appears, tiles leave.
- Submit a wrong quartet → mistake counter drops, grid shakes.
- **Draft test:** with 1–2 groups solved, reload the page → solved bands + mistake
  count restore (not reset).
- Finish → reveal lists all four categories; round advances with a 0/40/80/120/160/200 score.
- `read_console_messages {onlyErrors:true}` → none.

- [ ] **Step 5: Commit**

```bash
git add src/mechanics/ThroughLine.svelte src/App.svelte public/puzzles/2026-07-11.json src/lib/shuffle.ts
git commit -m "feat(lookback): Through-Line finale mechanic with draft persistence"
```

---

## Task 4: Update the linter for the new canonical order `[Sonnet]`

Red/green using the linter itself: a violating puzzle must FAIL, the fixed one PASS.

**Files:**
- Modify: `scripts/lint-puzzles.mjs`

- [ ] **Step 1: Change the canonical order + per-type checks**

Open `scripts/lint-puzzles.mjs`. Set the expected round order to:
`faceFromPast, battlefield, (whichCameFirst|timeline), whereInHistory,
guessTheYear, atlas, throughLine` — matching the file's existing representation of
"slot 3 is whichCameFirst OR timeline". **Remove** the `borderline` and `zoomOut`
structural checks and the "`countryId` has a border SVG / matches countries.ts"
check. **Add:**
- `atlas`: `typeof lat==='number' && lat>=-90 && lat<=90`; `lng>=-180 && lng<=180`;
  `tolKm>=1`; non-empty `answer` and `revealFact`; if `image` present, reuse the
  existing image/attribution checks.
- `throughLine`: `groups.length===4`; each `members.length===4`; all 16 members
  unique after `trim().toLowerCase()`; no member equals any `category` (same
  normalization); categories non-empty and distinct.

- [ ] **Step 2: Extend the 90-day no-repeat fields**

Where the linter collects "correct answer" tokens per puzzle for
`REUSE_WINDOW_DAYS`, remove border-country + zoom-answer extraction; add
`atlas.answer`, and **every** `throughLine.groups[*].category` and each
`groups[*].members[*]`. Keep `REUSE_WINDOW_DAYS = 90`.

- [ ] **Step 3: Red — prove a bad puzzle fails**

Temporarily set the atlas `lat` in `public/puzzles/2026-07-11.json` to `120`.
Run: `npm run lint:puzzles`
Expected: a `FAIL` line naming the atlas lat range; exit code 1.

- [ ] **Step 4: Green — fix and pass**

Restore `lat` to `16.7735`. Run: `npm run lint:puzzles`
Expected: 07-11 passes structural checks. (Other days still FAIL — not re-authored
yet; fixed in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add scripts/lint-puzzles.mjs
git commit -m "feat(lookback): lint new canonical order + atlas/throughLine rules"
```

---

## Task 5: Re-author all 10 puzzles + authoring rules `[Sonnet; Through-Line groups = Opus]`

Convert every `public/puzzles/*.json` to the new structure and the fair-but-hard
bar. **One day at a time; `npm run lint:puzzles` is the arbiter.**

**Files:**
- Modify: `public/puzzles/2026-07-09.json … 2026-07-18.json`, `docs/authoring-rules.md`
- Add images under `public/images/<date>/` via `scripts/fetch-image.mjs`

- [ ] **Step 1: Update `docs/authoring-rules.md`**

Delete the BorderLine + Zoom-Out sections. Add (from spec §8a): the
**fair-but-hard rubric** (decoys as/more famous than the answer; the answer is
never the single most-recognizable option; faces use less-iconic depictions), the
**Battlefield clue rule** (scene/stakes/terrain only; never name war, year,
victor, or place; 1 clue preferred, 2 max), the **Atlas** section (coords; tolKm
bands — 200 km pinpoint, 500–800 km region; prompts that don't leak the
hemisphere), and the **Through-Line** rubric (4 categories across eras/roles/
places; ≥1 overlap trap; every member in exactly one group; 16 unique members;
no member equals a category; short labels; author these with Opus).

- [ ] **Step 2: For each day, rebuild the 7 rounds in canonical order**

Per `public/puzzles/<date>.json`:
1. `faceFromPast` (slot 1): re-pick a **less-iconic image + fame-matched decoys**.
   Re-fetch via `npm run fetch-image -- --search "…"` then
   `--title … --out public/images/<date>/face.jpg`, and **Read the file** to
   confirm subject + no text leaks.
2. `battlefield` (slot 2): rewrite `clues` to the new rule.
3. Chronology (slot 3): parity unchanged (odd `puzzleNumber` → `whichCameFirst`,
   even → `timeline`).
4. `whereInHistory` (slot 4): harden decoys.
5. `guessTheYear` (slot 5): keep.
6. **New `atlas`** (slot 6): author `prompt`/`answer`/`lat`/`lng`/`tolKm`/
   `revealFact` (+ optional Read-checked image).
7. **New `throughLine`** (slot 7): author the 4 group sets **with Opus**.
8. `npm run lint:puzzles`; resolve any 90-day conflict by substituting in the
   **later** day. Never use `--no-verify`.

- [ ] **Step 3: Replace the scratch rounds**

Ensure 07-11's Timbuktu / ancient-wonders scratch rounds from Tasks 2–3 are
replaced by their real authored versions.

- [ ] **Step 4: Full content gate**

Run: `npm run lint:puzzles`
Expected: `clean (N warning(s))` — zero `FAIL` lines across all 10 days.

- [ ] **Step 5: Commit**

```bash
git add public/puzzles docs/authoring-rules.md public/images
git commit -m "content(lookback): re-author all 10 days to v2 structure + fair-but-hard bar"
```

---

## Task 6: Delete dead code, add stale-data guards, refresh docs `[Sonnet]`

Nothing references the old rounds now — remove them; guard old localStorage data.

**Files:**
- Modify: `src/types.ts`, `src/lib/scoring.ts`, `src/lib/persistence.ts`,
  `src/App.svelte`, `src/lib/share.ts`, `src/screens/SummaryScreen.svelte`,
  `src/screens/RoundIntro.svelte`, `src/screens/RoundResult.svelte`, `CLAUDE.md`,
  `package.json`
- Delete: `src/mechanics/BorderLine.svelte`, `src/mechanics/ZoomOut.svelte`,
  `scripts/generate-borders.mjs`, `src/lib/countries.ts`, `public/borders/*.svg`

- [ ] **Step 1: Remove old round types, scorers, draft**

`types.ts`: remove `'borderline'`/`'zoomOut'` from `RoundType`; delete
`BorderlineRound`, `ZoomOutRound`, `ZoomOutDraft`; drop them from `Round`.
`scoring.ts`: delete `BorderlineAnswer`, `ZoomOutAnswer`, `scoreBorderline`,
`scoreZoomOut`, `ZOOMOUT_SCORES`, `MAX_ZOOMOUT`, their imports, and their
`scoreRound` cases. `persistence.ts`: delete `ZOOMOUT_DRAFT_KEY`,
`saveZoomOutDraft`, `loadZoomOutDraft`, `clearZoomOutDraft`, and its `resetAll` line.

- [ ] **Step 2: Remove old exhaustive entries + finale max**

`RoundIntro.svelte`: delete the `borderline` + `zoomOut` `LABELS` entries.
`RoundResult.svelte`: delete the `case 'borderline'` and `case 'zoomOut'` blocks in
`buildReveal`; change `roundMax` to `round.type === 'throughLine' ? 200 : 100`.
`share.ts`: delete `borderline`/`zoomOut` from `GLYPH`. `SummaryScreen.svelte`:
delete `borderline`/`zoomOut` from `ROUND_LABELS`.

- [ ] **Step 3: Add stale-data runtime guards**

Old finished games in localStorage still carry `type: 'borderline'|'zoomOut'` in
their `roundResults`, which the Summary + share iterate. Make those two lookups
tolerant:
- `share.ts` → `roundSummary`: `return \`${GLYPH[result.type] ?? '•'} ${result.score}\`;`
- `SummaryScreen.svelte` → `roundLabel`: `return ROUND_LABELS[r.type] ?? r.type;`

(RoundIntro + RoundResult always run against the *live* re-authored puzzle, never
stored results, so they need no guard.)

- [ ] **Step 4: Remove old dispatch, imports, files, script**

`App.svelte`: delete the `BorderLine`/`ZoomOut` imports + dispatch branches. Then:

```bash
git rm src/mechanics/BorderLine.svelte src/mechanics/ZoomOut.svelte \
       scripts/generate-borders.mjs src/lib/countries.ts
git rm -r public/borders
```
In `package.json` remove the `"borders": "node scripts/generate-borders.mjs"` line.

- [ ] **Step 5: Update CLAUDE.md + grep for stragglers**

In `CLAUDE.md`, update the round list + "Game shape constants" to §2 (Atlas 100-pt
round; Through-Line 200-pt finale with draft persistence; delete BorderLine +
Zoom-Out bullets; delete the BorderLine-countries section). Then:

```bash
git grep -nE "borderline|zoomOut|ZoomOut|BorderLine|MAX_ZOOMOUT|countries|generate-borders" -- src scripts package.json CLAUDE.md
```
Expected: no matches. Fix any that remain.

- [ ] **Step 6: Both gates + full playthrough**

`npm run check` → PASS. `npm run lint:puzzles` → clean.
`preview_start {name:"dev"}`: play a full day — all 7 rounds, total/stars/share
(`📍`/`🔗` glyphs), streak increments, refresh shows completed state. If any old
self-played day exists in the Archive, open it and confirm the stale guard renders
`•` / raw labels, not `undefined`. `read_console_messages {onlyErrors:true}` → none.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(lookback): remove BorderLine + Zoom-Out; v2 round set complete"
```

---

## Done when

`npm run check` and `npm run lint:puzzles` are clean; a full playthrough shows the
7-round v2 set (…Atlas, Through-Line finale) scoring to 800; Through-Line draft
survives reload; the share grid reads `📍`/`🔗`; and no `borderline`/`zoomOut`
code remains. Push to `main` → Vercel auto-deploys.
