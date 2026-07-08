<script lang="ts">
  import type { WhichCameFirstRound } from '../types';
  import { scoreWhichCameFirst, type WhichCameFirstAnswer } from '../lib/scoring';
  import { ITEM_REVEAL_DELAY_MS } from '../lib/timing';

  let {
    round,
    oncomplete,
  }: {
    round: WhichCameFirstRound;
    oncomplete: (detail: WhichCameFirstAnswer, score: number) => void;
  } = $props();

  let index = $state(0);
  let picks: (0 | 1)[] = $state([]);
  let locked = $state(false);
  let revealIndex: number | null = $state(null);

  function answer(choice: 0 | 1) {
    if (locked) return;
    picks = [...picks, choice];
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

  let current = $derived(round.pairs[index]);
  let revealCorrect = $derived(
    revealIndex !== null && picks[revealIndex] === round.pairs[revealIndex].firstIndex,
  );

  function buttonState(buttonChoice: 0 | 1): string | undefined {
    if (revealIndex === null) return undefined;
    const pair = round.pairs[revealIndex];
    const userPicked = picks[revealIndex];
    if (userPicked === buttonChoice) {
      return userPicked === pair.firstIndex ? 'correct' : 'wrong';
    }
    if (userPicked !== pair.firstIndex && pair.firstIndex === buttonChoice) {
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
      aria-pressed={revealIndex !== null && picks[revealIndex] === 0}
      data-state={buttonState(0)}
      disabled={locked}
      onclick={() => answer(0)}
    >
      {current.a}
      {#if revealIndex !== null}
        <span class="mono muted" style="display: block; margin-top: var(--space-2); font-size: 0.75rem">{formatYear(current.aYear)}</span>
      {/if}
    </button>
    <button
      class="choice"
      data-label="B"
      aria-pressed={revealIndex !== null && picks[revealIndex] === 1}
      data-state={buttonState(1)}
      disabled={locked}
      onclick={() => answer(1)}
    >
      {current.b}
      {#if revealIndex !== null}
        <span class="mono muted" style="display: block; margin-top: var(--space-2); font-size: 0.75rem">{formatYear(current.bYear)}</span>
      {/if}
    </button>
  </div>

  {#if revealIndex !== null}
    <p class="center mono" style="margin-top: var(--space-4); letter-spacing: 0.15em; font-size: 0.8rem; color: {revealCorrect ? 'var(--correct)' : 'var(--wrong)'}">
      {revealCorrect ? 'CORRECT' : 'NOT QUITE'}
    </p>
  {/if}
</section>
