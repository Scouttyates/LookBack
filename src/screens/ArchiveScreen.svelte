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
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
  }
</script>

<section class="anim-enter">
  <button class="link" onclick={onback}>← Back</button>

  <h1 class="archive-title">The Archive</h1>
  <p class="archive-sub">Replay any past edition. Practice runs don't affect your streak.</p>

  <div class="cover-rule"><span></span></div>

  <div class="stack stack-3">
    {#each entries as entry}
      <button class="archive-card" onclick={() => onpick(entry.date)}>
        <span class="archive-date">
          {friendly(entry.date)}
          {#if entry.isToday}<span class="today-badge">Today</span>{/if}
        </span>
        <span class="archive-result">
          {#if entry.played}
            <span class="archive-stars">{'★'.repeat(entry.starCount)}{'☆'.repeat(5 - entry.starCount)}</span>
            <span class="archive-score">{entry.score}/800</span>
          {:else}
            <span class="archive-unplayed">Not played</span>
          {/if}
        </span>
      </button>
    {/each}
  </div>
</section>

<style>
  .archive-title {
    font-family: var(--serif);
    font-weight: 600;
    font-size: var(--step-4);
    margin-top: var(--space-4);
  }
  .archive-sub {
    font-family: var(--serif-text);
    font-style: italic;
    color: var(--muted-ink-2);
    margin-top: var(--space-2);
  }
  .cover-rule { display: flex; margin: var(--space-4) 0 var(--space-5); }
  .cover-rule span { width: 44px; height: 2px; background: var(--accent); }

  .archive-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    text-align: left;
    background: var(--paper-raised);
    border: 1px solid var(--rule);
    border-radius: var(--radius-md);
    padding: var(--space-4) var(--space-5);
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
  }
  @media (hover: hover) and (pointer: fine) {
    .archive-card:hover { border-color: var(--ink); transform: translateY(-1px); }
  }
  .archive-date {
    font-family: var(--serif);
    font-size: var(--step-1);
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .today-badge {
    font-family: var(--mono);
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .archive-result { text-align: right; }
  .archive-stars { color: var(--accent); letter-spacing: 0.06em; font-size: 0.9rem; }
  .archive-score {
    display: block;
    font-family: var(--mono);
    font-size: 0.7rem;
    color: var(--muted-ink);
    margin-top: 2px;
  }
  .archive-unplayed {
    font-family: var(--mono);
    font-size: 0.66rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted-ink);
  }
</style>
