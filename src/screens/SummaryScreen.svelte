<script lang="ts">
  import type { GameState, Puzzle, StreakState, Mode, RoundResult } from '../types';
  import { computeTotal, stars } from '../lib/scoring';
  import { buildShareText, copyToClipboard } from '../lib/share';

  let {
    game,
    puzzle,
    streak,
    mode,
    onhome,
  }: {
    game: GameState;
    puzzle: Puzzle;
    streak: StreakState;
    mode: Mode;
    onhome: () => void;
  } = $props();

  let total = $derived(computeTotal(game));
  let starCount = $derived(stars(total));
  let shareText = $derived(buildShareText(game, puzzle, streak));

  function toRoman(n: number): string {
    const map: [number, string][] = [
      [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],
      [50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
    ];
    let out = '', x = n;
    for (const [v, s] of map) { while (x >= v) { out += s; x -= v; } }
    return out;
  }

  // svelte-ignore state_referenced_locally
  let displayedScore = $state(total);
  $effect(() => {
    const duration = 900;
    const start = performance.now();
    const finalTotal = total;
    const initial = 0;
    let raf = 0;
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      displayedScore = Math.round(initial + (finalTotal - initial) * eased);
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });

  let toast = $state('');
  let toastKey = $state(0);

  async function share() {
    const ok = await copyToClipboard(shareText);
    toast = ok ? 'Copied to clipboard' : 'Copy failed — long-press to select';
    toastKey += 1;
  }

  const ROUND_LABELS: Record<RoundResult['type'], string> = {
    faceFromPast: 'Face from the Past',
    borderline: 'BorderLine',
    battlefield: 'Battlefield',
    whichCameFirst: 'Which Came First',
    timeline: 'Timeline',
    whereInHistory: 'Where in History',
    guessTheYear: 'Guess the Year',
    zoomOut: 'Zoom Out',
  };
  function roundLabel(r: RoundResult): string {
    return ROUND_LABELS[r.type];
  }

  let dateLabel = $derived(new Date(`${puzzle.date}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric' }));
</script>

<section class="stack stack-5 anim-enter">
  <div class="topbar">
    <span class="wordmark">LookBack</span>
    <span class="progress">No. {toRoman(puzzle.puzzleNumber)}</span>
  </div>

  <div class="center">
    <p class="eyebrow">{mode === 'practice' ? 'Practice' : `${dateLabel} — your score`}</p>
    <p class="summary-score">
      {displayedScore}<span class="muted">/800</span>
    </p>
    <p class="stars" style="font-size: var(--step-3); margin-top: var(--space-3)">
      {#each Array(5) as _, i}
        <span class="star-pop">{i < starCount ? '★' : '☆'}</span>
      {/each}
    </p>

    {#if mode === 'practice'}
      <p class="summary-streak">Practice — not scored</p>
    {:else if streak.currentPerfectStreak >= 2}
      <p class="summary-streak">🔥 {streak.currentPerfectStreak}-day perfect streak</p>
    {:else if streak.currentStreak >= 2}
      <p class="summary-streak">★ {streak.currentStreak}-day streak</p>
    {/if}
  </div>

  <div class="scorecard">
    {#each game.roundResults as r}
      <div class="leader-row">
        <span class="name">{roundLabel(r)}</span>
        <span class="dots"></span>
        <span class="val">{r.score}</span>
      </div>
    {/each}
    <div class="leader-row leader-row--total">
      <span class="name">Total</span>
      <span class="dots"></span>
      <span class="val">{total} <span class="muted">/800</span></span>
    </div>
  </div>

  {#if mode === 'daily'}
    <button class="btn btn-block" onclick={share}>Share today's edition</button>
    <pre class="share-text">{shareText}</pre>
  {/if}

  <button class="btn btn-ghost btn-block" onclick={onhome}>
    {mode === 'practice' ? 'Back to the Archive' : 'Back to home'}
  </button>
</section>

{#key toastKey}
  {#if toast}
    <div class="toast" role="status">{toast}</div>
  {/if}
{/key}

<style>
  .summary-score {
    font-family: var(--serif);
    font-weight: 600;
    font-size: var(--step-6);
    line-height: 1;
    margin-top: var(--space-3);
  }
  .summary-score .muted { font-size: var(--step-2); }
  .summary-streak {
    font-family: var(--mono);
    font-size: 0.72rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent);
    margin-top: var(--space-3);
  }
  .scorecard {
    border-top: 1px solid var(--ink);
    border-bottom: 1px solid var(--ink);
    padding: var(--space-2) 0;
  }
  .leader-row--total {
    border-top: 1px solid var(--rule-strong);
    margin-top: var(--space-2);
    padding-top: var(--space-3);
  }
  .leader-row--total .name {
    font-family: var(--serif);
    font-style: italic;
    font-size: var(--step-1);
  }
  .leader-row--total .val {
    font-family: var(--serif);
    font-style: italic;
    font-size: var(--step-1);
  }
  .share-text {
    white-space: pre-wrap;
    font-family: var(--mono);
    font-size: 0.75rem;
    line-height: 1.5;
    color: var(--muted-ink-2);
    padding: var(--space-4);
    background: var(--paper-deep);
    border: 1px solid var(--rule);
    border-radius: var(--radius-sm);
    margin: 0;
  }
</style>
