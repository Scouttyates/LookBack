<script lang="ts">
  let {
    today,
    onarchive,
  }: {
    today: string;
    onarchive: () => void;
  } = $props();

  let dateObj = $derived(new Date(`${today}T00:00:00`));
  let weekday = $derived(dateObj.toLocaleDateString(undefined, { weekday: 'long' }));
  let monthDay = $derived(
    dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
  );
</script>

<section class="cover anim-enter center">
  <h1 class="masthead">LookBack</h1>
  <p class="cover-tagline">A daily journey through history &amp; geography</p>

  <div class="cover-rule"><span></span></div>
  <p class="eyebrow">{weekday} · {monthDay}</p>

  <div style="margin-top: var(--space-6)">
    <p class="accent serif headline">Today’s edition is being prepared.</p>
    <p class="cover-intro">
      A fresh puzzle is published each day. Check back soon — the next edition is on its way.
    </p>
  </div>

  <div class="cover-foot">
    <button class="link" onclick={onarchive}>Play a past edition in The Archive</button>
  </div>
</section>

<style>
  .cover { padding-top: var(--space-6); }
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
  .headline {
    font-size: var(--step-3);
    margin: 0;
  }
  .cover-intro {
    font-family: var(--serif-text);
    font-size: 1.02rem;
    line-height: 1.65;
    color: var(--muted-ink-2);
    max-width: 22em;
    margin: var(--space-4) auto 0;
  }
  .cover-foot {
    margin-top: var(--space-7);
    padding-top: var(--space-5);
    border-top: 1px solid var(--rule);
    display: flex;
    justify-content: center;
  }
</style>
