<script lang="ts">
  import type { AtlasRound } from '../types';
  import { scoreAtlas, type AtlasAnswer } from '../lib/scoring';
  import { REVEAL_DELAY_MS } from '../lib/timing';
  import ImageCredit from '../components/ImageCredit.svelte';
  import { geoEqualEarth, geoPath } from 'd3-geo';
  import { feature } from 'topojson-client';
  import world from 'world-atlas/countries-110m.json';

  let { round, oncomplete }: {
    round: AtlasRound;
    oncomplete: (detail: AtlasAnswer, score: number) => void;
  } = $props();

  const W = 640, H = 330;
  const land: any = feature(world as any, (world as any).objects.countries);
  const projection = geoEqualEarth().fitExtent([[8, 8], [W - 8, H - 8]], land);
  const landPath = geoPath(projection as any)(land) ?? '';

  let svgEl: SVGSVGElement;
  let guess: { lng: number; lat: number; x: number; y: number } | null = $state(null);
  let done = $state(false);
  let answerXY = $derived.by(() => {
    const p = projection([round.lng, round.lat]);
    return p ? { x: p[0], y: p[1] } : null;
  });

  function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
    const toR = (d: number) => (d * Math.PI) / 180, R = 6371;
    const dLat = toR(bLat - aLat), dLng = toR(bLng - aLng);
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  function onMapClick(e: MouseEvent) {
    if (done) return;
    const rect = svgEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);
    const inv = projection.invert?.([x, y]);
    if (!inv) return; // tapped off the projected globe
    guess = { lng: inv[0], lat: inv[1], x, y };
  }

  let distanceKm = $derived.by(() => {
    const g = guess;
    return g ? haversineKm(g.lat, g.lng, round.lat, round.lng) : 0;
  });

  function confirm() {
    if (!guess || done) return;
    done = true;
    const detail: AtlasAnswer = { guessLat: guess.lat, guessLng: guess.lng, distanceKm };
    const score = scoreAtlas(round, detail);
    setTimeout(() => oncomplete(detail, score), REVEAL_DELAY_MS);
  }
</script>

<section class="anim-enter">
  <p class="eyebrow">Atlas</p>
  <h2 class="display" style="font-size: var(--step-3); margin-top: var(--space-3); font-weight: 500">
    {round.prompt}
  </h2>

  {#if round.image}
    <div class="image-frame" style="margin-top: var(--space-3); position: relative">
      <img src={round.image.src} alt={round.image.alt} draggable="false" style="width: 100%; display: block" />
      <ImageCredit attribution={round.image.attribution} revealed={done} />
    </div>
  {/if}

  <svg bind:this={svgEl} viewBox="0 0 {W} {H}" role="img" onclick={onMapClick}
       style="width: 100%; height: auto; margin-top: var(--space-4); cursor: crosshair; background: var(--paper-deep); border: 1px solid var(--rule); border-radius: var(--radius-sm); touch-action: manipulation">
    <path d={landPath} fill="var(--ink-2)" stroke="var(--paper)" stroke-width="0.3" />
    {#if guess}
      <circle cx={guess.x} cy={guess.y} r="4" fill="var(--accent)" stroke="var(--paper)" stroke-width="1" />
    {/if}
    {#if done && answerXY && guess}
      <line x1={guess.x} y1={guess.y} x2={answerXY.x} y2={answerXY.y} stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 2" />
      <circle cx={answerXY.x} cy={answerXY.y} r="5" fill="none" stroke="#4a7c59" stroke-width="2" />
    {/if}
  </svg>

  {#if !done}
    <button class="btn btn-block" style="margin-top: var(--space-4)" disabled={!guess} onclick={confirm}>
      {guess ? 'Drop pin here' : 'Tap the map to place your pin'}
    </button>
  {:else}
    <p class="mono center" style="margin-top: var(--space-3)">{Math.round(distanceKm).toLocaleString()} km away</p>
    <p class="serif-text center" style="margin-top: var(--space-2)"><span class="accent">{round.answer}</span></p>
    <p class="serif-text muted center" style="margin-top: var(--space-2); font-style: italic">{round.revealFact}</p>
  {/if}
</section>
