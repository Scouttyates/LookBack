<script lang="ts">
  import type { FaceFromPastRound } from '../types';
  import { scoreFaceFromPast, type FaceFromPastAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import { shuffleWithIndexMap } from '../lib/shuffle';
  import ImageCredit from '../components/ImageCredit.svelte';

  let {
    round,
    oncomplete,
  }: {
    round: FaceFromPastRound;
    oncomplete: (detail: FaceFromPastAnswer, score: number) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const { shuffled: displayOptions, indexMap } = shuffleWithIndexMap(round.options);
  // svelte-ignore state_referenced_locally
  const displayCorrectIndex = indexMap.indexOf(round.correctIndex);

  let picked: number | null = $state(null);
  let locked = $state(false);

  function select(i: number) {
    if (locked) return;
    picked = i;
  }

  function lockIn() {
    if (picked === null || locked) return;
    locked = true;
    const originalPicked = indexMap[picked];
    const detail: FaceFromPastAnswer = { picked: originalPicked };
    const score = scoreFaceFromPast(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }

  function stateFor(i: number): string | null {
    if (!locked) return null;
    if (i === displayCorrectIndex) return 'correct';
    if (i === picked) return 'wrong';
    return null;
  }

  const LABELS = ['A', 'B', 'C', 'D'];
</script>

<section class="anim-enter">
  <p class="eyebrow">Face from the Past</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    Who is this?
  </h2>

  <div class="image-frame" style="margin-top: var(--space-4); position: relative">
    <img src={round.image.src} alt={round.image.alt} />
    <ImageCredit attribution={round.image.attribution} revealed={locked} />
  </div>

  {#if locked}
    <p class="serif-text muted" style="margin-top: var(--space-4); font-style: italic; line-height: 1.5">
      {round.revealFact}
    </p>
  {/if}

  <div class="stack stagger" style="margin-top: var(--space-5); gap: var(--space-3)">
    {#each displayOptions as name, i}
      <button
        class="choice"
        data-label={LABELS[i]}
        aria-pressed={picked === i}
        data-state={stateFor(i)}
        disabled={locked}
        onclick={() => select(i)}
      >
        {name}
      </button>
    {/each}
  </div>

  <div style="margin-top: var(--space-6)">
    <button class="btn btn-block" disabled={picked === null || locked} onclick={lockIn}>
      {locked ? 'Revealing…' : 'Lock in answer'}
    </button>
  </div>
</section>
