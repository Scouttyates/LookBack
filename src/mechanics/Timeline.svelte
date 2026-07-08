<script lang="ts">
  import type { TimelineRound } from '../types';
  import { scoreTimeline, type TimelineAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import { shuffleWithIndexMap } from '../lib/shuffle';

  let {
    round,
    oncomplete,
  }: {
    round: TimelineRound;
    oncomplete: (detail: TimelineAnswer, score: number) => void;
  } = $props();

  // indexMap[displayPosition] = originalIndex.
  // svelte-ignore state_referenced_locally
  const initial = shuffleWithIndexMap(round.events);

  let order: number[] = $state(initial.indexMap.slice());
  let locked = $state(false);

  function move(pos: number, dir: -1 | 1) {
    if (locked) return;
    const target = pos + dir;
    if (target < 0 || target >= order.length) return;
    const next = order.slice();
    [next[pos], next[target]] = [next[target], next[pos]];
    order = next;
  }

  function lockIn() {
    if (locked) return;
    locked = true;
    const detail: TimelineAnswer = { order };
    const score = scoreTimeline(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }

  function stateFor(pos: number): string | null {
    if (!locked) return null;
    return order[pos] === pos ? 'correct' : 'wrong';
  }
</script>

<section class="anim-enter">
  <p class="eyebrow">Timeline</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    Put these in chronological order
  </h2>
  <p class="muted serif-text" style="margin-top: var(--space-2); font-style: italic">Earliest at the top.</p>

  <div class="stack stack-3" style="margin-top: var(--space-5)">
    {#each order as originalIdx, pos (originalIdx)}
      <div class="choice" data-state={stateFor(pos)} style="display: flex; align-items: center; gap: var(--space-3); cursor: default">
        <span class="mono muted" style="min-width: 1.5em">{pos + 1}.</span>
        <span style="flex: 1">
          {round.events[originalIdx].label}
          {#if locked}
            <span class="mono muted" style="display: block; margin-top: var(--space-1); font-size: 0.75rem">
              {round.events[originalIdx].year < 0 ? `${Math.abs(round.events[originalIdx].year)} BCE` : round.events[originalIdx].year}
            </span>
          {/if}
        </span>
        {#if !locked}
          <span class="stack" style="gap: 2px">
            <button type="button" class="link" style="border: 1px solid var(--rule-strong); padding: 4px 8px" disabled={pos === 0} onclick={() => move(pos, -1)} aria-label="Move up">▲</button>
            <button type="button" class="link" style="border: 1px solid var(--rule-strong); padding: 4px 8px" disabled={pos === order.length - 1} onclick={() => move(pos, 1)} aria-label="Move down">▼</button>
          </span>
        {/if}
      </div>
    {/each}
  </div>

  <div style="margin-top: var(--space-6)">
    <button class="btn btn-block" disabled={locked} onclick={lockIn}>
      {locked ? 'Revealing…' : 'Lock in order'}
    </button>
  </div>
</section>
