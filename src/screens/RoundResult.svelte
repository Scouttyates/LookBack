<script lang="ts">
  import type { RoundResult, Round } from '../types';

  let {
    result,
    round,
    runningTotal,
    roundNumber,
    totalRounds,
    onnext,
  }: {
    result: RoundResult;
    round: Round;
    runningTotal: number;
    roundNumber: number;
    totalRounds: number;
    onnext: () => void;
  } = $props();

  let roundMax = $derived(round.type === 'zoomOut' || round.type === 'throughLine' ? 200 : 100);
  let pct = $derived(result.score / roundMax);
  let verdict = $derived(
    pct >= 1     ? 'Nailed it.' :
    pct >= 0.6   ? 'Close.' :
    pct >= 0.2   ? 'A little off.' :
                   'Tough one.',
  );

  function formatYear(y: number): string {
    return y < 0 ? `${Math.abs(y)} BCE` : `${y}`;
  }

  type Reveal = {
    headline: string;
    sub: string;
    blurb: string;
    list: { label: string; detail: string }[];
  };

  function buildReveal(r: Round): Reveal {
    switch (r.type) {
      case 'faceFromPast':
        return { headline: r.options[r.correctIndex], sub: '', blurb: r.revealFact, list: [] };
      case 'borderline':
        return { headline: r.answer, sub: `Continent — ${r.continentHint}`, blurb: '', list: [] };
      case 'battlefield':
        return { headline: r.options[r.correctIndex], sub: `Fought in ${formatYear(r.revealYear)}`, blurb: '', list: [] };
      case 'whereInHistory':
        return {
          headline: r.eventQuestion.options[r.eventQuestion.correctIndex],
          sub: r.followUpQuestion.options[r.followUpQuestion.correctIndex],
          blurb: '',
          list: [],
        };
      case 'guessTheYear':
        return { headline: formatYear(r.answerYear), sub: '', blurb: r.revealFact, list: [] };
      case 'zoomOut':
        return { headline: r.options[r.correctIndex], sub: '', blurb: r.revealFact, list: [] };
      case 'whichCameFirst':
        return {
          headline: verdict,
          sub: '',
          blurb: '',
          list: r.pairs.map((p) => ({
            label: p.firstIndex === 0 ? p.a : p.b,
            detail: `${formatYear(p.aYear)}  ·  then  ${formatYear(p.firstIndex === 0 ? p.bYear : p.aYear)}`,
          })),
        };
      case 'timeline':
        return {
          headline: verdict,
          sub: '',
          blurb: '',
          list: r.events.map((e) => ({ label: e.label, detail: formatYear(e.year) })),
        };
      case 'atlas':
        return { headline: r.answer, sub: '', blurb: r.revealFact, list: [] };
      case 'throughLine':
        return {
          headline: 'The four groups',
          sub: '',
          blurb: '',
          list: r.groups.map((g) => ({ label: g.category, detail: g.members.join(' · ') })),
        };
    }
  }

  let reveal = $derived(buildReveal(round));
</script>

<section class="anim-enter reveal">
  <div class="reveal-head">
    <div class="eyebrow accent">{reveal.list.length ? 'In order' : 'The answer'}</div>
    <div class="answer">{reveal.headline}</div>
    {#if reveal.sub}
      <div class="place">{reveal.sub}</div>
    {/if}
  </div>

  <div class="scorebox">
    <div class="col">
      <div class="lbl">This round</div>
      <div class="big accent">+{result.score}</div>
      <div class="note">{verdict}</div>
    </div>
    <div class="col">
      <div class="lbl">Running total</div>
      <div class="big">{runningTotal}</div>
      <div class="note">of 800</div>
    </div>
  </div>

  {#if reveal.list.length}
    <div class="stack stack-3">
      {#each reveal.list as e, i}
        <div>
          <p class="serif" style="font-size: var(--step-1); font-weight: 500; margin: 0; line-height: 1.2">{e.label}</p>
          <p class="mono muted" style="margin-top: var(--space-1); font-size: 0.72rem; letter-spacing: 0.06em">{e.detail}</p>
        </div>
        {#if i < reveal.list.length - 1}
          <hr class="rule" style="margin: 0" />
        {/if}
      {/each}
    </div>
  {/if}

  {#if reveal.blurb}
    <p class="blurb">{reveal.blurb}</p>
  {/if}

  <button class="btn btn-block" onclick={onnext}>
    {roundNumber < totalRounds ? 'Next round →' : 'See summary →'}
  </button>
</section>

<style>
  .reveal {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    padding-top: var(--space-4);
  }
  .reveal-head .answer {
    font-family: var(--serif);
    font-weight: 600;
    font-size: var(--step-5);
    line-height: 1;
    margin-top: var(--space-1);
    letter-spacing: 0;
  }
  .reveal-head .place {
    font-family: var(--serif-text);
    font-style: italic;
    font-size: 1rem;
    color: var(--muted-ink-2);
    margin-top: var(--space-2);
  }
  .blurb {
    font-family: var(--serif-text);
    font-size: 0.98rem;
    line-height: 1.65;
    color: var(--muted-ink-2);
    margin: 0;
    padding-left: var(--space-4);
    border-left: 2px solid var(--accent);
  }
</style>
