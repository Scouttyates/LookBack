<script lang="ts">
  import type { GuessTheYearRound } from '../types';
  import { scoreGuessTheYear, type GuessTheYearAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import ImageCredit from '../components/ImageCredit.svelte';

  let {
    round,
    oncomplete,
  }: {
    round: GuessTheYearRound;
    oncomplete: (detail: GuessTheYearAnswer, score: number) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let guess = $state(Math.round((round.minYear + round.maxYear) / 2));
  let locked = $state(false);

  function formatYear(y: number): string {
    return y < 0 ? `${Math.abs(y)} BCE` : `${y}`;
  }

  function step(delta: number) {
    if (locked) return;
    guess = Math.min(round.maxYear, Math.max(round.minYear, guess + delta));
  }

  function lockIn() {
    if (locked) return;
    locked = true;
    const detail: GuessTheYearAnswer = { guessYear: guess };
    const score = scoreGuessTheYear(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }

  let diff = $derived(Math.abs(guess - round.answerYear));
</script>

<section class="anim-enter">
  <p class="eyebrow">Guess the Year</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    {round.prompt}
  </h2>

  {#if round.image}
    <div class="image-frame" style="margin-top: var(--space-4); position: relative">
      <img src={round.image.src} alt={round.image.alt} />
      <ImageCredit attribution={round.image.attribution} revealed={locked} />
    </div>
  {/if}

  <div class="center" style="margin-top: var(--space-6)">
    <p class="serif" style="font-size: var(--step-6); font-weight: 500; line-height: 1; letter-spacing: -0.03em; margin: 0">
      {formatYear(guess)}
    </p>
  </div>

  <div class="row" style="justify-content: center; gap: var(--space-4); margin-top: var(--space-4)">
    <button type="button" class="btn btn-ghost" disabled={locked} onclick={() => step(-10)}>−10</button>
    <button type="button" class="btn btn-ghost" disabled={locked} onclick={() => step(-1)}>−1</button>
    <button type="button" class="btn btn-ghost" disabled={locked} onclick={() => step(1)}>+1</button>
    <button type="button" class="btn btn-ghost" disabled={locked} onclick={() => step(10)}>+10</button>
  </div>

  <input
    type="range"
    min={round.minYear}
    max={round.maxYear}
    bind:value={guess}
    disabled={locked}
    style="width: 100%; margin-top: var(--space-5)"
  />
  <div class="row row-between mono muted" style="font-size: 0.7rem; margin-top: var(--space-1)">
    <span>{formatYear(round.minYear)}</span>
    <span>{formatYear(round.maxYear)}</span>
  </div>

  {#if locked}
    <p class="serif-text center" style="margin-top: var(--space-5)">
      Answer: <strong>{formatYear(round.answerYear)}</strong> — you were off by {diff} year{diff === 1 ? '' : 's'}.
    </p>
    <p class="serif-text muted center" style="margin-top: var(--space-2); font-style: italic">
      {round.revealFact}
    </p>
  {/if}

  <div style="margin-top: var(--space-6)">
    <button class="btn btn-block" disabled={locked} onclick={lockIn}>
      {locked ? 'Revealing…' : 'Lock in guess'}
    </button>
  </div>
</section>
