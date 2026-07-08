<script lang="ts">
  import type { ImageAttribution } from '../types';

  let {
    attribution,
    revealed,
  }: {
    attribution: ImageAttribution;
    revealed: boolean;
  } = $props();

  let open = $state(false);
</script>

<button
  type="button"
  class="credit-btn"
  aria-label="Image credit"
  onclick={() => (open = !open)}
>i</button>

{#if open}
  <div class="credit-popover">
    {#if revealed}
      <p style="margin: 0">{attribution.author} — {attribution.license}</p>
      <p style="margin: 4px 0 0">
        <a href={attribution.sourceUrl} target="_blank" rel="noopener noreferrer">via Wikimedia Commons</a>
      </p>
    {:else}
      <p style="margin: 0">Image: Wikimedia Commons</p>
      <p style="margin: 4px 0 0; opacity: 0.7">Full credit shown after you answer.</p>
    {/if}
  </div>
{/if}
