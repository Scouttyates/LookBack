<script lang="ts">
  import type { Puzzle, StreakState, GameState, Mode } from '../types';
  import { computeTotal, stars } from '../lib/scoring';

  let {
    puzzle,
    streak,
    existingGame,
    mode,
    onbegin,
    onarchive,
  }: {
    puzzle: Puzzle;
    streak: StreakState;
    existingGame: GameState | null;
    mode: Mode;
    onbegin: () => void;
    onarchive: () => void;
  } = $props();

  let dateObj = $derived(new Date(`${puzzle.date}T00:00:00`));
  let weekday = $derived(dateObj.toLocaleDateString(undefined, { weekday: 'long' }));
  let monthDay = $derived(dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }));

  let finished = $derived(existingGame !== null && existingGame.currentRoundIndex >= 7);
  let inProgress = $derived(
    existingGame !== null && existingGame.currentRoundIndex > 0 && existingGame.currentRoundIndex < 7,
  );
</script>

<section class="anim-enter">
  <div class="top-strip">
    <span>LookBack</span>
    <span>est. 2026</span>
    <span>No. {puzzle.puzzleNumber}</span>
  </div>

  <h1 class="masthead center">LookBack</h1>
  <div class="fleuron"></div>
  <p class="center" style="font-family: var(--serif-text); font-style: italic; color: var(--muted-ink); margin: 0">
    A daily journey through history &amp; geography
  </p>

  <div class="heavy-rule"></div>
  <div class="date-line">
    <span>{weekday}</span>
    <span>{monthDay}</span>
    <span>seven rounds</span>
  </div>

  {#if mode === 'practice'}
    <p class="eyebrow accent center" style="margin-top: var(--space-4)">Practice — not scored</p>
  {/if}

  {#if finished && existingGame}
    <div class="center" style="margin-top: var(--space-6)">
      <p class="eyebrow">Today's result</p>
      <p class="serif" style="font-size: var(--step-6); margin-top: var(--space-3); font-weight: 500; line-height: 1; letter-spacing: -0.04em">
        {computeTotal(existingGame)}<span class="muted" style="font-size: var(--step-2)">/800</span>
      </p>
      <p class="stars" style="font-size: var(--step-3); margin-top: var(--space-2)">
        {'★'.repeat(stars(computeTotal(existingGame))) + '☆'.repeat(5 - stars(computeTotal(existingGame)))}
      </p>
    </div>
    <div style="margin-top: var(--space-5)">
      <button class="btn btn-block" onclick={onbegin}>View summary &amp; share</button>
    </div>
  {:else}
    <div class="center" style="margin-top: var(--space-6)">
      <p class="eyebrow">Today, you'll meet</p>
      <p class="serif-text muted" style="font-style: italic; margin-top: var(--space-3); padding: 0 var(--space-3); line-height: 1.5">
        A face, a border, a battle, a moment in time — and one image that starts far too close to guess.
      </p>
    </div>

    <div style="margin-top: var(--space-6)">
      <button class="btn btn-block" onclick={onbegin}>
        {inProgress ? 'Continue today’s edition' : 'Begin today’s edition'} →
      </button>
    </div>

    {#if streak.currentStreak > 0 && mode === 'daily'}
      <p class="mono accent center" style="margin-top: var(--space-4); font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase">
        ★ {streak.currentStreak}-day streak
        {#if streak.longestStreak > streak.currentStreak}
          · longest {streak.longestStreak}
        {/if}
      </p>
    {/if}
  {/if}

  <hr class="rule rule-strong" />

  <div class="row" style="justify-content: center; gap: var(--space-5)">
    <button class="link" onclick={onarchive}>Archive</button>
  </div>
</section>
