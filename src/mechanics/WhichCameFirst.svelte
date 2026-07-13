<script lang="ts">
  import type { WhichCameFirstRound } from '../types';
  import { scoreWhichCameFirst, type WhichCameFirstAnswer } from '../lib/scoring';
  import { ITEM_REVEAL_DELAY_MS } from '../lib/timing';
  import { shuffleWithIndexMap } from '../lib/shuffle';

  let {
    round,
    oncomplete,
  }: {
    round: WhichCameFirstRound;
    oncomplete: (detail: WhichCameFirstAnswer, score: number) => void;
  } = $props();

  // Per-pair display order, so the earlier event isn't always in the top slot.
  // orders[pairIndex][slot] = original index (0 = a, 1 = b) shown in that slot.
  // Authoring stores the earlier event as `a` (firstIndex almost always 0), so
  // without this the correct answer would always be button A. Same shuffle layer
  // every other choice mechanic uses (FaceFromPast, Battlefield, …).
  // svelte-ignore state_referenced_locally
  const orders: (0 | 1)[][] = round.pairs.map(
    (p) => shuffleWithIndexMap([p.a, p.b]).indexMap as (0 | 1)[],
  );

  let index = $state(0);
  let picks: (0 | 1)[] = $state([]);
  let locked = $state(false);
  let revealIndex: number | null = $state(null);

  // The original item (a/b) shown in a given display slot for a pair.
  function slotItem(pairIndex: number, slot: 0 | 1): { text: string; year: number } {
    const pair = round.pairs[pairIndex];
    return orders[pairIndex][slot] === 0
      ? { text: pair.a, year: pair.aYear }
      : { text: pair.b, year: pair.bYear };
  }

  function answer(slot: 0 | 1) {
    if (locked) return;
    // Store the pick in original (a/b) coordinates so scoreWhichCameFirst stays valid.
    picks = [...picks, orders[index][slot]];
    revealIndex = index;
    locked = true;
    setTimeout(() => {
      locked = false;
      revealIndex = null;
      if (picks.length === round.pairs.length) {
        finish();
      } else {
        index = index + 1;
      }
    }, ITEM_REVEAL_DELAY_MS);
  }

  function finish() {
    const detail: WhichCameFirstAnswer = { picks };
    const score = scoreWhichCameFirst(round, detail);
    oncomplete(detail, score);
  }

  function formatYear(y: number): string {
    return y < 0 ? `${Math.abs(y)} BCE` : `${y} CE`;
  }

  let slot0 = $derived(slotItem(index, 0));
  let slot1 = $derived(slotItem(index, 1));
  let revealCorrect = $derived(
    revealIndex !== null && picks[revealIndex] === round.pairs[revealIndex].firstIndex,
  );

  function buttonState(slot: 0 | 1): string | undefined {
    if (revealIndex === null) return undefined;
    const pair = round.pairs[revealIndex];
    const slotOriginal = orders[revealIndex][slot]; // original index shown in this slot
    const userPicked = picks[revealIndex];          // original index the user picked
    if (userPicked === slotOriginal) {
      return userPicked === pair.firstIndex ? 'correct' : 'wrong';
    }
    if (userPicked !== pair.firstIndex && pair.firstIndex === slotOriginal) {
      return 'correct';
    }
    return undefined;
  }
</script>

<section class="anim-enter">
  <p class="eyebrow">Which Came First</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    Which happened first?
  </h2>

  <div class="row" style="justify-content: center; gap: var(--space-2); margin-top: var(--space-4)">
    {#each round.pairs as _, i}
      <span
        aria-hidden="true"
        style="width: 10px; height: 10px; border: 1px solid var(--ink); background: {i < picks.length ? 'var(--ink)' : 'transparent'}"
      ></span>
    {/each}
  </div>

  <div class="stack" style="margin-top: var(--space-5); gap: var(--space-3)">
    <button
      class="choice"
      data-label="A"
      aria-pressed={revealIndex !== null && picks[revealIndex] === orders[revealIndex][0]}
      data-state={buttonState(0)}
      disabled={locked}
      onclick={() => answer(0)}
    >
      {slot0.text}
      {#if revealIndex !== null}
        <span class="mono muted" style="display: block; margin-top: var(--space-2); font-size: 0.75rem">{formatYear(slot0.year)}</span>
      {/if}
    </button>
    <button
      class="choice"
      data-label="B"
      aria-pressed={revealIndex !== null && picks[revealIndex] === orders[revealIndex][1]}
      data-state={buttonState(1)}
      disabled={locked}
      onclick={() => answer(1)}
    >
      {slot1.text}
      {#if revealIndex !== null}
        <span class="mono muted" style="display: block; margin-top: var(--space-2); font-size: 0.75rem">{formatYear(slot1.year)}</span>
      {/if}
    </button>
  </div>

  {#if revealIndex !== null}
    <p class="center mono" style="margin-top: var(--space-4); letter-spacing: 0.15em; font-size: 0.8rem; color: {revealCorrect ? 'var(--correct)' : 'var(--wrong)'}">
      {revealCorrect ? 'CORRECT' : 'NOT QUITE'}
    </p>
  {/if}
</section>
