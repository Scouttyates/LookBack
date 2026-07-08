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
</script>

<section class="stack stack-4 anim-enter">
  <div class="top-strip">
    <span>Final edition</span>
    <span>No. {puzzle.puzzleNumber}</span>
    <span>{new Date(`${puzzle.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
  </div>

  <div class="center">
    <p class="eyebrow">Your score</p>
    <p class="serif" style="font-size: var(--step-6); font-weight: 500; line-height: 1; letter-spacing: -0.04em; margin-top: var(--space-3)">
      {displayedScore}<span class="muted" style="font-size: var(--step-2)">/800</span>
    </p>
    <p class="stars" style="font-size: var(--step-3); margin-top: var(--space-3)">
      {#each Array(5) as _, i}
        <span class="star-pop">{i < starCount ? '★' : '☆'}</span>
      {/each}
    </p>

    {#if mode === 'practice'}
      <p class="eyebrow accent" style="margin-top: var(--space-3)">Practice — not scored</p>
    {:else if streak.currentPerfectStreak >= 2}
      <p class="mono accent" style="margin-top: var(--space-3); font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase">
        ★ {streak.currentPerfectStreak}-day perfect streak
      </p>
    {:else if streak.currentStreak >= 2}
      <p class="mono muted" style="margin-top: var(--space-3); font-size: 0.75rem; letter-spacing: 0.15em; text-transform: uppercase">
        {streak.currentStreak}-day streak
      </p>
    {/if}
  </div>

  <div class="fleuron"></div>

  <div style="border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); padding: var(--space-3) 0">
    {#each game.roundResults as r}
      <div class="leader-row">
        <span class="name">{roundLabel(r)}</span>
        <span class="dots"></span>
        <span class="val">{r.score}</span>
      </div>
    {/each}
    <div class="leader-row" style="border-top: 1px solid var(--rule-strong); padding-top: var(--space-3); margin-top: var(--space-2)">
      <span class="name serif" style="font-style: italic; font-size: var(--step-1)">Total</span>
      <span class="dots"></span>
      <span class="val serif" style="font-size: var(--step-1); font-style: italic">{total} <span class="muted">/800</span></span>
    </div>
  </div>

  {#if mode === 'daily'}
    <button class="btn btn-block" onclick={share}>Share today's edition</button>
    <pre class="mono muted" style="white-space: pre-wrap; font-size: 0.75rem; padding: var(--space-4); background: var(--paper-deep); border: 1px solid var(--rule-strong); margin: 0">{shareText}</pre>
  {/if}

  <hr class="rule rule-strong" />

  <div class="stack stack-3">
    <button class="btn btn-ghost btn-block" onclick={onhome}>
      {mode === 'practice' ? 'Back to archive' : 'Back to home'}
    </button>
  </div>
</section>

{#key toastKey}
  {#if toast}
    <div class="toast" role="status">{toast}</div>
  {/if}
{/key}
