<script lang="ts">
  import type { PuzzleIndex, PersistedState } from '../types';
  import { computeTotal, stars } from '../lib/scoring';
  import { todayISO } from '../lib/puzzle';

  let {
    index,
    persisted,
    onback,
    onpick,
  }: {
    index: PuzzleIndex;
    persisted: PersistedState;
    onback: () => void;
    onpick: (date: string) => void;
  } = $props();

  const today = todayISO();

  let entries = $derived(
    [...index.available]
      .filter((d) => d <= today)
      .sort((a, b) => b.localeCompare(a))
      .map((date) => {
        const game = persisted.games[date] ?? null;
        const played = game !== null && game.currentRoundIndex >= 7 && game.mode === 'daily';
        return {
          date,
          played,
          score: played && game ? computeTotal(game) : null,
          starCount: played && game ? stars(computeTotal(game)) : 0,
          isToday: date === today,
        };
      }),
  );

  function friendly(d: string): string {
    return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
</script>

<section class="anim-enter">
  <button class="link" onclick={onback}>← Back</button>

  <h1 class="display" style="margin-top: var(--space-4)">Past Puzzles</h1>
  <p class="muted serif" style="margin-top: var(--space-2); font-style: italic">
    Replay any day. Practice runs don't affect your streak.
  </p>

  <hr class="rule" />

  <div class="stack stack-3">
    {#each entries as entry}
      <button
        class="card row row-between"
        style="cursor: pointer; text-align: left"
        onclick={() => onpick(entry.date)}
      >
        <span>
          <span class="serif" style="font-size: var(--step-2)">
            {friendly(entry.date)}
          </span>
          {#if entry.isToday}
            <span class="eyebrow accent" style="margin-left: var(--space-2)">Today</span>
          {/if}
          <span class="muted mono" style="display: block; font-size: 0.75rem; margin-top: var(--space-1)">
            {entry.date}
          </span>
        </span>
        <span class="mono">
          {#if entry.played}
            <span class="accent" style="letter-spacing: 0.1em">
              {'★'.repeat(entry.starCount)}{'☆'.repeat(5 - entry.starCount)}
            </span>
            <span class="muted" style="display: block; font-size: 0.75rem; text-align: right">
              {entry.score}/800
            </span>
          {:else}
            <span class="muted">Not played</span>
          {/if}
        </span>
      </button>
    {/each}
  </div>
</section>
