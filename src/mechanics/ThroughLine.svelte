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
