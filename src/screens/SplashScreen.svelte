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

  function toRoman(n: number): string {
    const map: [number, string][] = [
      [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
      [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
    ];
    let out = '', x = n;
    for (const [v, s] of map) { while (x >= v) { out += s; x -= v; } }
    return out;
  }
</script>

<section class="cover anim-enter center">
  <p class="edition">No. {toRoman(puzzle.puzzleNumber)}</p>
  <h1 class="masthead">LookBack</h1>
  <p class="cover-tagline">A daily journey through history &amp; geography</p>

  <div class="cover-rule"><span></span></div>
  <p class="eyebrow">{weekday} · {monthDay}</p>

  {#if mode === 'practice'}
    <p class="eyebrow accent" style="margin-top: var(--space-3)">Practice — not scored</p>
  {/if}

  {#if finished && existingGame}
    <div style="margin-top: var(--space-6)">
      <p class="eyebrow">Today's result</p>
      <p class="cover-score">
        {computeTotal(existingGame)}<span class="muted">/800</span>
      </p>
      <p class="stars" style="font-size: var(--step-3); margin-top: var(--space-2)">
        {'★'.repeat(stars(computeTotal(existingGame))) + '☆'.repeat(5 - stars(computeTotal(existingGame)))}
      </p>
    </div>
    <div style="margin-top: var(--space-5)">
      <button class="btn btn-block" onclick={onbegin}>View summary &amp; share</button>
    </div>
  {:else}
    <p class="cover-intro">
      A face, a battle, a moment in time — and a finale that puts it all together.
    </p>
    <div style="margin-top: var(--space-6)">
      <button class="btn btn-block" onclick={onbegin}>
        {inProgress ? 'Continue today’s edition' : 'Begin today’s edition'} →
      </button>
    </div>

    {#if streak.currentStreak > 0 && mode === 'daily'}
      <p class="cover-streak">
        ★ {streak.currentStreak}-day streak{#if streak.longestStreak > streak.currentStreak} · longest {streak.longestStreak}{/if}
      </p>
    {/if}
  {/if}

  <div class="cover-foot">
    <button class="link" onclick={onarchive}>The Archive</button>
  </div>
</section>

<style>
  .cover { padding-top: var(--space-6); }
  .edition {
    font-family: var(--mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .masthead { margin-top: var(--space-3); }
  .cover-tagline {
    font-family: var(--serif-text);
    font-style: italic;
    font-size: 1.05rem;
    color: var(--muted-ink-2);
    margin: var(--space-3) 0 0;
  }
  .cover-rule {
    display: flex;
    justify-content: center;
    margin: var(--space-5) 0 var(--space-4);
  }
  .cover-rule span {
    width: 44px;
    height: 2px;
    background: var(--accent);
  }
  .cover-intro {
    font-family: var(--serif-text);
    font-size: 1.02rem;
    line-height: 1.65;
    color: var(--muted-ink-2);
    max-width: 22em;
    margin: var(--space-6) auto 0;
  }
  .cover-score {
    font-family: var(--serif);
    font-weight: 600;
    font-size: var(--step-6);
    line-height: 1;
    margin-top: var(--space-3);
  }
  .cover-score .muted { font-size: var(--step-2); }
  .cover-streak {
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    margin-top: var(--space-4);
  }
  .cover-foot {
    margin-top: var(--space-7);
    padding-top: var(--space-5);
    border-top: 1px solid var(--rule);
    display: flex;
    justify-content: center;
  }
</style>
