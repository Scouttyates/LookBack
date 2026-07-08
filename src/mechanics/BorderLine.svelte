<script lang="ts">
  import type { BorderlineRound } from '../types';
  import { scoreBorderline, type BorderlineAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import { searchCountries, normalizeCountryQuery } from '../lib/countries';

  let {
    round,
    oncomplete,
  }: {
    round: BorderlineRound;
    oncomplete: (detail: BorderlineAnswer, score: number) => void;
  } = $props();

  const MAX_WRONG = 3;

  let query = $state('');
  let guesses: string[] = $state([]);
  let wrongCount = $state(0);
  let hintsUsed: 0 | 1 | 2 = $state(0);
  let done = $state(false);
  let solved = $state(false);
  let borderSvg = $state('');

  $effect(() => {
    fetch(`/borders/${round.countryId}.svg`)
      .then((r) => r.text())
      .then((svg) => { borderSvg = svg; })
      .catch(() => { borderSvg = ''; });
  });

  let suggestions = $derived(query.trim() ? searchCountries(query) : []);

  function finish(win: boolean) {
    done = true;
    solved = win;
    const detail: BorderlineAnswer = { solved: win, hintsUsed, guesses };
    const score = scoreBorderline(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }

  function pick(countryName: string) {
    if (done) return;
    guesses = [...guesses, countryName];
    query = '';
    if (normalizeCountryQuery(countryName) === normalizeCountryQuery(round.answer)) {
      finish(true);
      return;
    }
    wrongCount += 1;
    if (wrongCount >= MAX_WRONG) finish(false);
  }

  function useHint() {
    if (done) return;
    if (hintsUsed === 0) hintsUsed = 1;
    else if (hintsUsed === 1) hintsUsed = 2;
  }

  let firstLetter = $derived(round.answer.charAt(0).toUpperCase());
  let maxPossible = $derived(hintsUsed === 0 ? 100 : hintsUsed === 1 ? 70 : 40);
</script>

<section class="anim-enter">
  <p class="eyebrow">BorderLine</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    What country is this?
  </h2>

  <div class="center" style="margin-top: var(--space-4); color: var(--ink)">
    {#if borderSvg}
      <div style="max-width: 260px; margin: 0 auto">{@html borderSvg}</div>
    {:else}
      <div style="height: 200px"></div>
    {/if}
  </div>

  <p class="mono muted center" style="margin-top: var(--space-3); font-size: 0.75rem">
    {wrongCount}/{MAX_WRONG} wrong guesses · up to {maxPossible} pts
  </p>

  {#if hintsUsed >= 1}
    <p class="serif-text center muted" style="margin-top: var(--space-2); font-style: italic">Continent: {round.continentHint}</p>
  {/if}
  {#if hintsUsed >= 2}
    <p class="serif-text center muted" style="margin-top: var(--space-1); font-style: italic">Starts with: {firstLetter}</p>
  {/if}

  {#if !done}
    <div style="margin-top: var(--space-5); position: relative">
      <input
        type="text"
        class="choice"
        style="width: 100%"
        placeholder="Type a country name…"
        bind:value={query}
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if suggestions.length}
        <div class="card" style="margin-top: var(--space-2); padding: 0">
          {#each suggestions as c}
            <button type="button" class="choice" style="border: 0; margin: 0" onclick={() => pick(c.name)}>{c.name}</button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="row" style="justify-content: center; margin-top: var(--space-4)">
      <button type="button" class="link" disabled={hintsUsed >= 2} onclick={useHint}>
        {hintsUsed === 0 ? 'Reveal continent (−30 pts)' : hintsUsed === 1 ? 'Reveal first letter (−30 more)' : 'No hints left'}
      </button>
    </div>
  {:else}
    <p class="center serif-text" style="margin-top: var(--space-5)">
      {solved ? 'Correct!' : `Answer: ${round.answer}`}
    </p>
  {/if}

  {#if guesses.length}
    <p class="mono muted center" style="margin-top: var(--space-4); font-size: 0.7rem">
      Guessed: {guesses.join(', ')}
    </p>
  {/if}
</section>
