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

  let roundMax = $derived(round.type === 'zoomOut' ? 200 : 100);
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

  type RecapEntry = { label: string; detail: string };

  function recap(r: Round): RecapEntry[] {
    switch (r.type) {
      case 'faceFromPast':    return [{ label: r.options[r.correctIndex], detail: r.revealFact }];
      case 'borderline':      return [{ label: r.answer, detail: `Continent: ${r.continentHint}` }];
      case 'battlefield':     return [{ label: r.options[r.correctIndex], detail: `Fought in ${formatYear(r.revealYear)}.` }];
      case 'whichCameFirst':  return r.pairs.map((p) => ({
        label: p.firstIndex === 0 ? p.a : p.b,
        detail: `${formatYear(p.aYear)} vs ${formatYear(p.bYear)}`,
      }));
      case 'timeline':        return r.events.map((e) => ({ label: e.label, detail: formatYear(e.year) }));
      case 'whereInHistory':  return [{ label: r.eventQuestion.options[r.eventQuestion.correctIndex], detail: r.followUpQuestion.options[r.followUpQuestion.correctIndex] }];
      case 'guessTheYear':    return [{ label: formatYear(r.answerYear), detail: r.revealFact }];
      case 'zoomOut':         return [{ label: r.options[r.correctIndex], detail: r.revealFact }];
    }
  }

  let entries = $derived(recap(round));
</script>

<section class="anim-enter">
  <div class="top-strip">
    <span>Round {roundNumber} / {totalRounds}</span>
    <span>LookBack</span>
    <span class="accent">+{result.score} pts</span>
  </div>

  <div class="center" style="padding-top: var(--space-5)">
    <p class="eyebrow">Result</p>
    <h1 class="display" style="font-size: var(--step-4); font-style: italic; font-weight: 500; margin-top: var(--space-3)">
      {verdict}
    </h1>
    <p class="serif" style="font-size: var(--step-6); font-weight: 500; margin-top: var(--space-3); line-height: 1; letter-spacing: -0.04em">
      +{result.score}
    </p>
  </div>

  <div class="fleuron"></div>

  <div class="row row-between" style="font-family: var(--mono); font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted-ink)">
    <span>Running total</span>
    <span class="serif accent" style="font-size: var(--step-2); letter-spacing: -0.02em; font-style: italic; text-transform: none">
      {runningTotal}<span class="muted" style="font-size: 0.85rem">/800</span>
    </span>
  </div>

  <div class="heavy-rule"></div>

  <p class="eyebrow">The answer</p>
  <div class="stack stack-3" style="margin-top: var(--space-3)">
    {#each entries as entry, i}
      <div>
        <p class="serif" style="font-size: var(--step-1); font-style: italic; font-weight: 500; margin: 0">{entry.label}</p>
        <p class="serif-text muted" style="margin-top: var(--space-1); line-height: 1.5">{entry.detail}</p>
      </div>
      {#if i < entries.length - 1}
        <hr class="rule rule-dotted" style="margin: 0" />
      {/if}
    {/each}
  </div>

  <div style="margin-top: var(--space-6)">
    <button class="btn btn-block" onclick={onnext}>
      {roundNumber < totalRounds ? 'Next round →' : 'See summary →'}
    </button>
  </div>
</section>
