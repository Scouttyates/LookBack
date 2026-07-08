<script lang="ts">
  import type { RoundType } from '../types';

  let {
    roundNumber: _roundNumber,
    totalRounds,
    type,
    oncontinue,
  }: {
    roundNumber: number;
    totalRounds: number;
    type: RoundType;
    oncontinue: () => void;
  } = $props();

  const LABELS: Record<RoundType, { title: string; hint: string; numeral: string }> = {
    faceFromPast:   { title: 'Face from the Past', hint: 'A portrait, a bust, a photograph. Name the historical figure.', numeral: 'I' },
    borderline:     { title: 'BorderLine',         hint: 'Just the outline. Guess the country.',                        numeral: 'II' },
    battlefield:    { title: 'Battlefield',        hint: 'A famous battle, one image, a couple of clues.',               numeral: 'III' },
    whichCameFirst: { title: 'Which Came First',   hint: 'Five pairs. Pick whichever happened first.',                   numeral: 'IV' },
    timeline:       { title: 'Timeline',           hint: 'Four events. Put them in order.',                              numeral: 'IV' },
    whereInHistory: { title: 'Where in History',   hint: 'A moment in time — what is it, and where?',                    numeral: 'V' },
    guessTheYear:   { title: 'Guess the Year',     hint: 'Slide to the year you think it happened.',                     numeral: 'VI' },
    zoomOut:        { title: 'Zoom Out',           hint: 'It starts far too close. Guess before it pulls back.',          numeral: 'VII' },
  };

  let info = $derived(LABELS[type]);
</script>

<section class="anim-enter center" style="padding-top: var(--space-7)">
  <div class="top-strip" style="border: 0; padding: 0; margin-bottom: var(--space-6); justify-content: center; gap: var(--space-4)">
    <span>Round</span>
    <span class="accent">{info.numeral}</span>
    <span>of {totalRounds}</span>
  </div>

  <p class="eyebrow">{info.title}</p>
  <h1 class="display" style="font-size: var(--step-5); margin-top: var(--space-3); font-style: italic; font-weight: 500">
    {info.title}
  </h1>

  <div class="fleuron"></div>

  <p class="serif-text muted" style="font-style: italic; max-width: 360px; margin: 0 auto; line-height: 1.5">
    {info.hint}
  </p>

  <div style="margin-top: var(--space-7)">
    <button class="btn btn-block" onclick={oncontinue}>Begin round →</button>
  </div>
</section>
