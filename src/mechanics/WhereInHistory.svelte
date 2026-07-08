<script lang="ts">
  import type { WhereInHistoryRound } from '../types';
  import { scoreWhereInHistory, type WhereInHistoryAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS, ITEM_REVEAL_DELAY_MS } from '../lib/timing';
  import { shuffleWithIndexMap } from '../lib/shuffle';
  import ImageCredit from '../components/ImageCredit.svelte';

  let {
    round,
    oncomplete,
  }: {
    round: WhereInHistoryRound;
    oncomplete: (detail: WhereInHistoryAnswer, score: number) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  const q1 = shuffleWithIndexMap(round.eventQuestion.options);
  // svelte-ignore state_referenced_locally
  const q1CorrectDisplay = q1.indexMap.indexOf(round.eventQuestion.correctIndex);
  // svelte-ignore state_referenced_locally
  const q2 = shuffleWithIndexMap(round.followUpQuestion.options);
  // svelte-ignore state_referenced_locally
  const q2CorrectDisplay = q2.indexMap.indexOf(round.followUpQuestion.correctIndex);

  let step: 1 | 2 = $state(1);
  let picked1: number | null = $state(null);
  let picked2: number | null = $state(null);
  let revealing1 = $state(false);
  let revealing2 = $state(false);
  let pickedEventOriginal = 0;
  let pickedFollowUpOriginal = 0;

  function selectQ1(i: number) {
    if (revealing1) return;
    picked1 = i;
  }
  function selectQ2(i: number) {
    if (revealing2) return;
    picked2 = i;
  }

  function lockQ1() {
    if (picked1 === null || revealing1) return;
    revealing1 = true;
    pickedEventOriginal = q1.indexMap[picked1];
    setTimeout(() => { step = 2; }, ITEM_REVEAL_DELAY_MS);
  }

  function lockQ2() {
    if (picked2 === null || revealing2) return;
    revealing2 = true;
    pickedFollowUpOriginal = q2.indexMap[picked2];
    const detail: WhereInHistoryAnswer = { pickedEvent: pickedEventOriginal, pickedFollowUp: pickedFollowUpOriginal };
    const score = scoreWhereInHistory(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }

  function stateFor1(i: number): string | null {
    if (!revealing1) return null;
    if (i === q1CorrectDisplay) return 'correct';
    if (i === picked1) return 'wrong';
    return null;
  }
  function stateFor2(i: number): string | null {
    if (!revealing2) return null;
    if (i === q2CorrectDisplay) return 'correct';
    if (i === picked2) return 'wrong';
    return null;
  }

  const LABELS = ['A', 'B', 'C', 'D'];
</script>

<section class="anim-enter">
  <p class="eyebrow">Where in History</p>

  <div class="image-frame" style="margin-top: var(--space-3); position: relative">
    <img src={round.image.src} alt={round.image.alt} />
    <ImageCredit attribution={round.image.attribution} revealed={step === 2 && revealing2} />
  </div>

  {#if step === 1}
    <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-4); font-weight: 500">
      {round.eventQuestion.prompt}
    </h2>
    <div class="stack stagger" style="margin-top: var(--space-5); gap: var(--space-3)">
      {#each q1.shuffled as opt, i}
        <button class="choice" data-label={LABELS[i]} aria-pressed={picked1 === i} data-state={stateFor1(i)} disabled={revealing1} onclick={() => selectQ1(i)}>
          {opt}
        </button>
      {/each}
    </div>
    <div style="margin-top: var(--space-6)">
      <button class="btn btn-block" disabled={picked1 === null || revealing1} onclick={lockQ1}>
        {revealing1 ? 'Revealing…' : 'Lock in answer'}
      </button>
    </div>
  {:else}
    <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-4); font-weight: 500">
      {round.followUpQuestion.prompt}
    </h2>
    <div class="stack stagger" style="margin-top: var(--space-5); gap: var(--space-3)">
      {#each q2.shuffled as opt, i}
        <button class="choice" data-label={LABELS[i]} aria-pressed={picked2 === i} data-state={stateFor2(i)} disabled={revealing2} onclick={() => selectQ2(i)}>
          {opt}
        </button>
      {/each}
    </div>
    <div style="margin-top: var(--space-6)">
      <button class="btn btn-block" disabled={picked2 === null || revealing2} onclick={lockQ2}>
        {revealing2 ? 'Revealing…' : 'Lock in answer'}
      </button>
    </div>
  {/if}
</section>
