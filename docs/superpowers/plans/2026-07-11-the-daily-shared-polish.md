# "The Daily" Shared Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Verbatim + LookBack feel like one product: three clean cross-linked
entry points (hub / Verbatim / LookBack), an end-game "play the other game" +
"Home" nav, a discoverable archive reachable from the hub, and static Open-Graph
cards so shared links unfurl a rich thumbnail in iMessage/Twitter.

**Architecture:** Two Svelte SPAs on separate Vercel origins plus one static hub
page. A tiny per-repo `links.ts` holds the three canonical URLs. Nav/archive
changes are localized to `App.svelte` + `SummaryScreen.svelte` + `index.html`;
rich previews are pure `<head>` meta tags + three committed PNGs.

**Tech Stack:** Svelte 5, TypeScript, Vite, static HTML, Open Graph / Twitter cards.

**Source spec:** `docs/superpowers/specs/2026-07-11-lookback-v2-and-shared-design.md`
(§11–§14).

**Repos:** `C:\Users\Scout\lookback` and `C:\Users\Scout\verbatim`.

**Independence:** This plan is independent of the LookBack v2 core plan and can run
in parallel. The **only** file both plans touch is LookBack's
`src/screens/SummaryScreen.svelte` — if running both, do the v2-core edit to that
file first, then this plan's Task 1 edit on top.

---

## Testing note

Same gates as the core plan: `npm run check` per repo, and **browser
verification** via preview tools (`preview_start {name:"dev"}`). Rich-preview
tags can't be verified in iMessage from here — validate them by asserting the
tags exist in the served HTML (`read_network_requests` / `get_page_text` on
`view-source`, or grep the built output). Real iMessage unfurl is a manual check
Scout does after deploy.

**Canonical URLs (hardcode these):**
- Hub: `https://look-back-lemon.vercel.app/`
- LookBack game: `https://look-back-lemon.vercel.app/play`
- Verbatim game: `https://verbatim-azure.vercel.app/`

**Model tier:** all `[Sonnet]` except Task 5 (the three OG PNGs) = `[Opus]`, one-time.

---

## Task 1: LookBack — links, end-game nav, archive deep-link `[Sonnet]`

**Files:**
- Create: `src/lib/links.ts`
- Modify: `src/App.svelte`, `src/screens/SummaryScreen.svelte`

- [ ] **Step 1: Create `src/lib/links.ts`**

```ts
// The three canonical entry points, shared across nav + share.
export const LINKS = {
  hub: '/',                                   // same origin as /play
  self: '/play',
  verbatim: 'https://verbatim-azure.vercel.app/',
} as const;
```

- [ ] **Step 2: Archive deep-link in `App.svelte`**

In `src/App.svelte`, inside the bootstrap `$effect`, replace the
`if (!persisted.hasOnboarded) { … } else { screen = 'splash'; }` block with:

```ts
        const wantsArchive =
          typeof location !== 'undefined' &&
          new URLSearchParams(location.search).get('archive') === '1';

        if (!persisted.hasOnboarded) {
          screen = 'tutorial';
        } else if (wantsArchive) {
          screen = 'archive';
        } else {
          screen = 'splash';
        }
```

The archive branch already renders when `screen === 'archive' && index` — no other
change needed.

- [ ] **Step 3: Swap the SummaryScreen prop in `App.svelte`**

In `src/App.svelte`, the summary no longer navigates to the game splash — it goes
to the hub (anchor) or the archive. In the `<SummaryScreen … />` usage, **remove
`onhome={goHome}` and add `onarchive={openArchive}`**. (`goHome` is still used by
`ArchiveScreen`'s `onback`, so leave the function itself in place.)

- [ ] **Step 4: SummaryScreen nav**

In `src/screens/SummaryScreen.svelte`, add the import:

```ts
  import { LINKS } from '../lib/links';
```
In the props, **replace `onhome: () => void;` with `onarchive: () => void;`** in
both the type and the destructure (nothing else references `onhome` after Step 5).

Replace the final action button (the `onhome` block near the end) with:

```svelte
  {#if mode === 'daily'}
    <a class="btn btn-block" href={LINKS.verbatim}>Play Verbatim →</a>
    <a class="btn btn-ghost btn-block" href={LINKS.hub} style="text-align:center">Back to Home</a>
    <button class="link" style="display:block; margin: var(--space-3) auto 0" onclick={onarchive}>
      Replay a past day →
    </button>
  {:else}
    <button class="btn btn-ghost btn-block" onclick={onarchive}>Back to the Archive</button>
  {/if}
```

(Anchors get the full-width button look; ensure `.btn` renders fine on an `<a>` —
it's class-based, so it will. If padding looks off, add `display:block`.)

- [ ] **Step 5: Verify**

`npm run check` → PASS. `preview_start {name:"dev"}`:
- Finish a daily game → summary shows **Play Verbatim →**, **Back to Home**,
  **Replay a past day →**. Click "Replay a past day" → archive opens.
- Visit `/play?archive=1` (navigate the preview there) → the game boots straight
  into the archive screen.
- `read_console_messages {onlyErrors:true}` → none.

- [ ] **Step 6: Commit**

```bash
git add src/lib/links.ts src/App.svelte src/screens/SummaryScreen.svelte
git commit -m "feat(lookback): links config, next-game/home nav, ?archive=1 deep-link"
```

---

## Task 2: Verbatim — links, end-game nav, archive deep-link, cross-links `[Sonnet]`

**Files (Verbatim repo `C:\Users\Scout\verbatim`):**
- Create: `src/lib/links.ts`
- Modify: `src/App.svelte`, `src/screens/SummaryScreen.svelte`,
  `src/screens/SplashScreen.svelte`

- [ ] **Step 1: Create `src/lib/links.ts`**

```ts
export const LINKS = {
  hub: 'https://look-back-lemon.vercel.app/',
  lookback: 'https://look-back-lemon.vercel.app/play',
  self: '/',
} as const;
```

- [ ] **Step 2: Archive deep-link in `App.svelte`**

In `src/App.svelte` bootstrap `$effect`, replace the onboarded/splash block with:

```ts
        const wantsArchive =
          typeof location !== 'undefined' &&
          new URLSearchParams(location.search).get('archive') === '1';

        if (!persisted.hasOnboarded) {
          screen = 'tutorial';
        } else if (wantsArchive) {
          screen = 'archive';
        } else {
          screen = 'splash';
        }
```

In the `<SummaryScreen … />` usage, **remove `onhome={goHome}` and add
`onarchive={openArchive}`** (keep `onjournal={openJournal}`; `goHome` stays for
`ArchiveScreen`'s `onback`).

- [ ] **Step 3: SummaryScreen nav**

In `src/screens/SummaryScreen.svelte`, add `import { LINKS } from '../lib/links';`,
and **replace `onhome: () => void;` with `onarchive: () => void;`** in the props
type and destructure (keep `onjournal`). Replace the final "Actions" block
(`View word journal` + `Back to home`) with:

```svelte
  <div class="stack stack-3">
    <button class="btn btn-ghost btn-block" onclick={onjournal}>View word journal</button>
    {#if mode === 'daily'}
      <a class="btn btn-block" href={LINKS.lookback} style="text-align:center">Play LookBack →</a>
      <a class="btn btn-ghost btn-block" href={LINKS.hub} style="text-align:center">Back to Home</a>
      <button class="link" style="display:block; margin: var(--space-3) auto 0" onclick={onarchive}>
        Replay a past day →
      </button>
    {:else}
      <button class="btn btn-ghost btn-block" onclick={onarchive}>Back to the Archive</button>
    {/if}
  </div>
```

- [ ] **Step 4: Splash cross-links (hub + LookBack)**

In `src/screens/SplashScreen.svelte`, the "More from the desk" block currently
links only to `https://look-back-lemon.vercel.app` (the hub) but labels it
"LookBack". Import `{ LINKS }` and change that anchor's `href` to `{LINKS.lookback}`
(the actual game), and add a second small link to the hub. Minimal version — add
below the existing LookBack anchor:

```svelte
    <p style="margin-top: var(--space-3)">
      <a href={LINKS.hub} class="link" target="_blank" rel="noopener">The Daily — both games ↗</a>
    </p>
```

- [ ] **Step 5: Verify**

`npm run check` → PASS. `preview_start {name:"dev"}` (Verbatim):
- Finish a daily game → summary shows **Play LookBack →**, **Back to Home**,
  **Replay a past day →**.
- `/?archive=1` boots into the archive.
- Splash "More from the desk" links to the LookBack game and the hub.
- `read_console_messages {onlyErrors:true}` → none.

- [ ] **Step 6: Commit (in the Verbatim repo)**

```bash
git add src/lib/links.ts src/App.svelte src/screens/SummaryScreen.svelte src/screens/SplashScreen.svelte
git commit -m "feat(verbatim): links config, next-game/home nav, ?archive=1 deep-link, hub cross-link"
```

---

## Task 3: Hub — "Past Puzzles" affordance `[Sonnet]`

**Files (LookBack repo):**
- Modify: `index.html`

- [ ] **Step 1: Add an archives row**

The hub's `.card` elements are whole-card `<a>` links, so a nested link is invalid.
Add a separate small row **after** the closing `</section>` of `.games` (before
`<footer class="stats">`):

```html
      <p class="archives">
        Past puzzles:
        <a href="/play?archive=1">LookBack</a>
        ·
        <a href="https://verbatim-azure.vercel.app/?archive=1">Verbatim</a>
      </p>
```

Add matching CSS in the `<style>` block:

```css
      .archives { text-align: center; font-size: 11px; letter-spacing: 0.04em; color: var(--muted-2); }
      .archives a { color: var(--ochre); border-bottom: 1px solid transparent; }
      .archives a:hover { border-bottom-color: var(--ochre); }
```

- [ ] **Step 2: Verify**

`preview_start {name:"dev"}`, open `/` (the hub). `read_page` → confirm the
"Past puzzles: LookBack · Verbatim" row renders. Click "LookBack" → lands on
`/play?archive=1` and (with Task 1 shipped) opens the archive. The Verbatim link
points at `https://verbatim-azure.vercel.app/?archive=1`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(hub): Past Puzzles links deep-linking into each game's archive"
```

---

## Task 4: Open-Graph meta tags on all three surfaces `[Sonnet]`

Add rich-preview tags. **Do not** create the PNGs here — Task 5 does. The tags
reference PNG paths that will exist after Task 5; that's fine (the tag is inert
until the image is committed).

**Files:**
- Modify (LookBack repo): `index.html`, `play.html`
- Modify (Verbatim repo): `index.html`

- [ ] **Step 1: Hub — `index.html` (LookBack repo)**

Immediately after the existing `<meta name="description" …>` line, add:

```html
    <meta property="og:type" content="website" />
    <meta property="og:title" content="The Daily — Verbatim & LookBack" />
    <meta property="og:description" content="Two daily puzzles: Verbatim (vocabulary) and LookBack (history & geography). A new puzzle every morning." />
    <meta property="og:url" content="https://look-back-lemon.vercel.app/" />
    <meta property="og:image" content="https://look-back-lemon.vercel.app/og/the-daily.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://look-back-lemon.vercel.app/og/the-daily.png" />
```

- [ ] **Step 2: LookBack game — `play.html` (LookBack repo)**

After its `<meta name="description" …>` line, add the same block but with:
`og:title` = `LookBack — Daily history & geography game`;
`og:description` = `A daily journey through history & geography. Seven rounds, a new edition every morning.`;
`og:url` = `https://look-back-lemon.vercel.app/play`;
`og:image` and `twitter:image` = `https://look-back-lemon.vercel.app/og/lookback.png`.

- [ ] **Step 3: Verbatim — `index.html` (Verbatim repo)**

After its `<meta name="description" …>` line, add the block with:
`og:title` = `Verbatim — Daily vocabulary game`;
`og:description` = `A daily diversion in the English language. Seven rounds, a new word every morning.`;
`og:url` = `https://verbatim-azure.vercel.app/`;
`og:image` and `twitter:image` = `https://verbatim-azure.vercel.app/og/verbatim.png`.

- [ ] **Step 4: Verify tags are served**

For each repo: `preview_start {name:"dev"}`, then in the preview navigate to
`view-source:<url>` (or use `read_network_requests` on the document request) and
confirm the `og:*` + `twitter:*` tags are present in the served HTML. No console
errors introduced.

- [ ] **Step 5: Commit (per repo)**

```bash
# LookBack repo:
git add index.html play.html
git commit -m "feat(the-daily): Open Graph + Twitter card tags on hub and LookBack"
# Verbatim repo:
git add index.html
git commit -m "feat(verbatim): Open Graph + Twitter card tags"
```

---

## Task 5: Create the three OG card PNGs `[Opus, one-time]`

1200×630 branded cards. Build each as a standalone HTML using each surface's token
palette, render at exactly 1200×630 in the browser preview, screenshot to PNG,
commit. Keep each < 200 KB.

**Files:**
- Create (LookBack repo): `public/og/the-daily.png`, `public/og/lookback.png`
- Create (Verbatim repo): `public/og/verbatim.png`

- [ ] **Step 1: Author the three card HTMLs (scratch)**

Write three throwaway HTML files to the scratchpad, each a single 1200×630 `<div>`
with a solid brand background, the wordmark in the game's display serif, and a
one-line tagline. Palettes (from each repo's tokens):
- **The Daily:** paper `#f7f4ee` bg, ink `#1c1c1a` text, ochre `#b08637` rule.
  Wordmark "The Daily", tagline "Two daily puzzles — Verbatim & LookBack".
- **LookBack:** ink `#1c1c1a` bg, paper text, ochre accent. Wordmark "LookBack",
  tagline "A daily journey through history & geography".
- **Verbatim:** paper `#f4ede0` bg, ink text, red accent (Verbatim's accent — read
  it from `verbatim/src/styles/global.css` `--accent`). Wordmark "Verbatim",
  tagline "A daily diversion in the English language".

- [ ] **Step 2: Render + screenshot each at 1200×630**

`preview_start {url:"file:///…scratch/og-the-daily.html"}` (or serve via the dev
server). `resize_window {width:1200, height:630}`. `computer {action:"screenshot"}`.
Save/convert the screenshot to PNG at the exact target path. Repeat for all three.
Verify each is 1200×630 and < 200 KB.

- [ ] **Step 3: Commit (per repo)**

```bash
# LookBack repo:
git add public/og/the-daily.png public/og/lookback.png
git commit -m "assets(the-daily): OG preview cards for hub + LookBack"
# Verbatim repo:
git add public/og/verbatim.png
git commit -m "assets(verbatim): OG preview card"
```

- [ ] **Step 4: Post-deploy manual check (Scout)**

After both repos deploy, paste each URL into iMessage and confirm a large
thumbnail unfurls. (iMessage caches aggressively; if a stale/no preview shows,
give it time or append a throwaway `?v=2` once.)

---

## Done when

Three links resolve and cross-link (hub `/`, `/play`, verbatim `/`); every game's
summary offers **Home** + **Play the other game** + **Replay a past day**; the hub
deep-links into each archive via `?archive=1`; `npm run check` is green in both
repos; and each surface serves OG tags backed by a committed 1200×630 PNG. Push
both repos → Vercel auto-deploys.
