<script lang="ts">
  import type { RoundType } from '../types';

  let {
    roundNumber,
    totalRounds,
    type,
    oncontinue,
  }: {
    roundNumber: number;
    totalRounds: number;
    type: RoundType;
    oncontinue: () => void;
  } = $props();

  const LABELS: Record<RoundType, { title: string; hint: string }> = {
    faceFromPast:   { title: 'Face from the Past', hint: 'A portrait, a bust, a photograph. Name the historical figure.' },
    borderline:     { title: 'BorderLine',         hint: 'Just the outline. Guess the country.' },
    battlefield:    { title: 'Battlefield',        hint: 'A famous battle, one image, a couple of clues.' },
    whichCameFirst: { title: 'Which Came First',   hint: 'Five pairs. Pick whichever happened first.' },
    timeline:       { title: 'Timeline',           hint: 'Four events. Put them in order.' },
    whereInHistory: { title: 'Where in History',   hint: 'A moment in time — what is it, and where?' },
    guessTheYear:   { title: 'Guess the Year',     hint: 'Slide to the year you think it happened.' },
    zoomOut:        { title: 'Zoom Out',           hint: 'It starts far too close. Guess before it pulls back.' },
  };

  function roman(n: number): string {
    const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '', x = n;
    for (const [v, s] of map) { while (x >= v) { out += s; x -= v; } }
    return out;
  }

  let info = $derived(LABELS[type]);
</script>

<section class="anim-enter intro center">
  <p class="intro-progress">Round {roman(roundNumber)} / {roman(totalRounds)}</p>

  <h1 class="intro-title">{info.title}</h1>
  <div class="intro-rule"><span></span></div>

  <p class="intro-hint">{info.hint}</p>

  <div style="margin-top: var(--space-7)">
    <button class="btn btn-block" onclick={oncontinue}>Begin round →</button>
  </div>
</section>

<style>
  .intro { padding-top: var(--space-7); }
  .intro-progress {
    font-family: var(--mono);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .intro-title {
    font-family: var(--serif);
    font-weight: 600;
    font-size: var(--step-5);
    line-height: 1.02;
    margin-top: var(--space-4);
  }
  .intro-rule {
    display: flex;
    justify-content: center;
    margin: var(--space-5) 0;
  }
  .intro-rule span { width: 44px; height: 2px; background: var(--accent); }
  .intro-hint {
    font-family: var(--serif-text);
    font-style: italic;
    font-size: 1.05rem;
    line-height: 1.6;
    color: var(--muted-ink-2);
    max-width: 20em;
    margin: 0 auto;
  }
</style>
