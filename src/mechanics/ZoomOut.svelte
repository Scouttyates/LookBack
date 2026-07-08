<script lang="ts">
  import type { ZoomOutRound } from '../types';
  import { scoreZoomOut, type ZoomOutAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import { shuffleWithIndexMap } from '../lib/shuffle';
  import { saveZoomOutDraft, loadZoomOutDraft, clearZoomOutDraft } from '../lib/persistence';
  import ImageCredit from '../components/ImageCredit.svelte';

  let {
    round,
    oncomplete,
    puzzleDate = null,
  }: {
    round: ZoomOutRound;
    oncomplete: (detail: ZoomOutAnswer, score: number) => void;
    puzzleDate?: string | null;
  } = $props();

  // svelte-ignore state_referenced_locally
  const { shuffled: displayOptions, indexMap } = shuffleWithIndexMap(round.options);
  // svelte-ignore state_referenced_locally
  const displayCorrectIndex = indexMap.indexOf(round.correctIndex);

  // svelte-ignore state_referenced_locally
  const initialDraft = puzzleDate ? loadZoomOutDraft(puzzleDate) : null;

  let levelIndex = $state(initialDraft?.levelIndex ?? 0);
  let wrongPicks: number[] = $state(initialDraft?.wrongPicks ?? []);
  let done = $state(false);
  let picked: number | null = $state(null);
  let revealing = $state(false);

  let level = $derived(round.zoomLevels[levelIndex]);
  let disabledOptions = $derived(new Set(wrongPicks));

  function persist() {
    if (!puzzleDate) return;
    saveZoomOutDraft({ date: puzzleDate, levelIndex, wrongPicks });
  }

  function choose(i: number) {
    if (done || revealing || disabledOptions.has(i)) return;
    picked = i;
    revealing = true;

    if (i === displayCorrectIndex) {
      const originalPick = indexMap[i];
      finish(levelIndex as 0 | 1 | 2 | 3 | 4, [...wrongPicks, originalPick]);
      return;
    }

    setTimeout(() => {
      const originalWrong = indexMap[i];
      wrongPicks = [...wrongPicks, originalWrong];
      revealing = false;
      picked = null;
      if (levelIndex >= round.zoomLevels.length - 1) {
        finish(null, wrongPicks);
      } else {
        levelIndex += 1;
        persist();
      }
    }, 900);
  }

  function finish(solvedAtLevel: 0 | 1 | 2 | 3 | 4 | null, picks: number[]) {
    done = true;
    if (puzzleDate) clearZoomOutDraft();
    const detail: ZoomOutAnswer = { solvedAtLevel, picks };
    const score = scoreZoomOut(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }

  function stateFor(i: number): string | null {
    if (disabledOptions.has(indexMap[i])) return 'wrong';
    if (done && i === displayCorrectIndex) return 'correct';
    return null;
  }
</script>

<section class="anim-enter">
  <p class="eyebrow">Zoom Out · Finale</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    What is this?
  </h2>

  <div class="image-frame" style="margin-top: var(--space-4); position: relative; aspect-ratio: 1; max-width: 420px; margin-left: auto; margin-right: auto">
    <img
      src={round.image.src}
      alt={round.image.alt}
      draggable="false"
      style="width: 100%; height: 100%; object-fit: cover; transform-origin: {level.x}% {level.y}%; transform: scale({level.scale}); transition: transform 700ms cubic-bezier(.2,.8,.2,1)"
    />
    <ImageCredit attribution={round.image.attribution} revealed={done} />
  </div>

  <p class="mono muted center" style="margin-top: var(--space-3); font-size: 0.75rem">
    Level {levelIndex + 1} of {round.zoomLevels.length} · up to {[200, 160, 120, 80, 40][levelIndex]} pts
  </p>

  {#if done}
    <p class="serif-text muted center" style="margin-top: var(--space-3); font-style: italic">
      {round.revealFact}
    </p>
  {/if}

  <div class="stack stagger" style="margin-top: var(--space-5); gap: var(--space-3)">
    {#each displayOptions as name, i}
      <button
        class="choice"
        aria-pressed={picked === i}
        data-state={stateFor(i)}
        disabled={done || revealing || disabledOptions.has(indexMap[i])}
        onclick={() => choose(i)}
      >
        {name}
      </button>
    {/each}
  </div>
</section>
