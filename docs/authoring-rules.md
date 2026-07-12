# LookBack — Puzzle Authoring Rules

Authoritative spec for `public/puzzles/*.json`. Enforced by
`scripts/lint-puzzles.mjs`; run `npm run lint:puzzles` after every edit.

## 1. Round shape and order

Every puzzle has exactly 7 rounds, in this canonical order:

1. `faceFromPast`
2. `battlefield`
3. `whichCameFirst` **or** `timeline` (alternates by day — see §4)
4. `whereInHistory`
5. `guessTheYear`
6. `atlas`
7. `throughLine` (200-pt finale)

## 2. Structural requirements per round type

- **faceFromPast / battlefield**: exactly 4 `options`, unique, `correctIndex`
  0–3.
- **whichCameFirst**: exactly 5 `pairs`; `firstIndex` must match the actual
  year comparison (`aYear <= bYear` → `firstIndex: 0`). Negative years are
  BCE.
- **timeline**: exactly 4 `events`, stored in correct chronological order
  (strictly increasing `year`) — the app shuffles for display at runtime.
- **whereInHistory**: both `eventQuestion` and `followUpQuestion` need
  exactly 4 options each.
- **guessTheYear**: `minYear < answerYear < maxYear`, `tolerance >= 1`.
- **atlas**: `-90 <= lat <= 90`, `-180 <= lng <= 180`, `tolKm >= 1`,
  non-empty `answer` and `revealFact`.
- **throughLine**: exactly 4 `groups`, each with exactly 4 `members`; all 16
  members unique (case/diacritic-insensitive, trimmed); no member string
  equals any `category`; categories non-empty and distinct.

## 3. The 90-day no-repeat rule (ship blocker)

**No correct answer may repeat across puzzles within 90 days.** This is the
flagship rule — same discipline as Verbatim. The lint tracks, per puzzle, the
normalized text of:

- `faceFromPast` / `battlefield`: the correct option text.
- `whichCameFirst` / `timeline`: every event/pair label (both sides).
- `whereInHistory`: the correct `eventQuestion` option (not the follow-up).
- `guessTheYear`: the first 6 words of `prompt`.
- `atlas`: the `answer` field.
- `throughLine`: every group's `category` and every `members` entry.

If lint reports a `reuse:` failure, substitute the conflicting item — usually
in the LATER puzzle. **Never loosen `REUSE_WINDOW_DAYS`.**

Decoy repeats (wrong options) and chronology-slot type repeats on consecutive
days are WARNINGS only, not failures — fix them when convenient, don't block
a ship over them.

## 4. Chronology alternation

Slot 3 alternates `whichCameFirst` (odd `puzzleNumber`) / `timeline` (even
`puzzleNumber`). This is an authoring convention, not enforced by runtime
code — the app renders whichever type is present. The lint warns (does not
fail) if two consecutive days use the same chronology-slot type.

## 4a. Fair-but-hard rubric (applies to every choice round)

- **Decoys must be as recognizable or more recognizable than the correct
  answer.** The correct answer must never be the single most-famous option
  in its round.
- **Faces:** prefer less-iconic depictions — busts, side-profiles, younger or
  older likenesses, lesser-known portraits — over the one image everyone
  already recognizes on sight. The player should have to reason from
  features/era/context, not pattern-match fame.
- **Battlefield clues:** set the scene, stakes, terrain, or era-feel only.
  **Never** name the war, the year, the victor, or the place. 1 clue
  preferred, 2 max.
- No same-day thematic leaks between rounds (e.g. don't let the Atlas answer
  give away the Battlefield answer).

## 4b. Atlas authoring

- `lat`/`lng` should be the historically-accurate center of the place, city,
  or region named in `revealFact` — source from the place's Wikipedia
  coordinates.
- `tolKm` bands: a pinpoint city/site ≈ **200 km**; a large empire/region ≈
  **500–800 km**. 100 pts requires landing within `tolKm`; the band doubles
  (80/60/40/20/0) for each further doubling of distance.
- Write `prompt` to name the historical subject without hinting at its
  hemisphere or continent (avoid "in East Africa…", prefer "the Kingdom of
  Aksum").
- `image` is optional — only add one if it adds real value and doesn't leak
  the location (map labels, visible landmarks named in captions).

## 4c. Through-Line authoring (the craft rules)

- 4 categories spanning different eras/roles/places; include **at least one
  deliberate overlap trap** — a member that plausibly fits more than one
  group.
- Every member belongs to **exactly one** intended group; all 16 member
  strings unique; no member string equals its category label; keep labels
  short (must fit a tile). Same difficulty discipline as Verbatim's
  CrossClue.
- **These sets are authored with Opus** (or carefully human-reviewed) — the
  lint enforces structure, not semantic fairness or trap quality.

## 5. Images

Every `ImageRef` (`image` field on `faceFromPast`, `battlefield`,
`whereInHistory`, optionally `guessTheYear` and `atlas`) requires:

```json
{
  "src": "/images/<date>/<slot>.jpg",
  "alt": "non-revealing description",
  "attribution": {
    "fileTitle": "File:...",
    "author": "...",
    "license": "Public domain | CC0 | CC BY ... | CC BY-SA ...",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:..."
  }
}
```

### Fetching

Use `scripts/fetch-image.mjs` exclusively:

```
node scripts/fetch-image.mjs --search "<terms>"
node scripts/fetch-image.mjs --title "File:X.jpg" --out public/images/<date>/<slot>.jpg --width 1200
```

The fetch step **fails hard** (exit 1) unless the license matches the
allowlist (public domain / CC0 / CC BY / CC BY-SA); NC, ND, and fair-use are
always rejected. It prints a ready-to-paste `attribution` block on success.

- Default width: 1200. Keep the final file under the lint's 800 KB hard cap
  (400 KB triggers a warning; re-fetch at a smaller width if you're over
  budget).
- Naming: `public/images/<date>/<slot>.jpg`, slot ∈ `face | battle | moment`
  (guessTheYear's and atlas's optional images, if used, have no fixed slot
  name in the pipeline — pick something descriptive).

### Mandatory verification

**View every downloaded image with the Read tool before shipping it.**
Confirm it depicts the intended subject and contains no answer-revealing
text — museum captions, engraved names, map labels naming the event. This
catches wrong search hits and spoilers before they ship. The lint's
`alt-leak` warning only catches leaks in the `alt` text itself, not in the
image pixels.

### In-game credit reveal

`src/components/ImageCredit.svelte` shows only "Image: Wikimedia Commons"
before the round is answered, and full author/license/link after — Commons
file titles usually name the subject directly, so showing them early would
leak the answer.

## 6. `index.json`

Must stay consistent with the files on disk: `available` lists every puzzle
date present, `totalDays === available.length`, and each puzzle's
`puzzleNumber` equals its 1-indexed position in the sorted `available` list.

## Workflow checklist

1. Make the edit (JSON content, images, or borders).
2. `npm run lint:puzzles` — must report `clean (N warning(s))`. Any `FAIL`
   line blocks the commit.
3. The pre-commit hook re-runs the lint automatically when
   `public/puzzles/*.json` is staged. Don't bypass it with `--no-verify`.
