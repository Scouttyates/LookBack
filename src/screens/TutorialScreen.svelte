<script lang="ts">
  let { ondone }: { ondone: () => void } = $props();

  const options = ['Napoleon Bonaparte', 'Alexander I of Russia', 'Duke of Wellington', 'Klemens von Metternich'];
  const correct = 0;

  let picked: number | null = $state(null);
  let locked = $state(false);

  function select(i: number) {
    if (locked) return;
    picked = i;
  }

  function lockIn() {
    if (picked === null || locked) return;
    locked = true;
    setTimeout(ondone, 1800);
  }

  function stateFor(i: number): string | null {
    if (!locked) return null;
    if (i === correct) return 'correct';
    if (i === picked) return 'wrong';
    return null;
  }

  const LABELS = ['A', 'B', 'C', 'D'];
</script>

<section class="anim-enter">
  <p class="eyebrow accent">A quick demo — unscored</p>
  <h1 class="tut-title">How LookBack works</h1>
  <p class="tut-intro">
    Seven quick rounds of history and geography, fresh every morning. Here's one — name the person in the portrait.
  </p>

  <div class="cover-rule"><span></span></div>

  <p class="eyebrow">Round I · Face from the Past</p>
  <h2 class="tut-prompt">Who is <em class="accent">this</em>?</h2>
  <p class="tut-hint">A European military and political leader, painted in his study.</p>

  <div class="stack stagger" style="margin-top: var(--space-5)">
    {#each options as name, i}
      <button
        class="choice"
        data-label={LABELS[i]}
        aria-pressed={picked === i}
        data-state={stateFor(i)}
        disabled={locked}
        onclick={() => select(i)}
      >
        {name}
      </button>
    {/each}
  </div>

  <div style="margin-top: var(--space-5)">
    <button class="btn btn-block" disabled={picked === null || locked} onclick={lockIn}>
      {locked ? "You've got it — starting now…" : 'Lock in'}
    </button>
  </div>
</section>

<style>
  .tut-title {
    font-family: var(--serif);
    font-weight: 600;
    font-size: var(--step-4);
    margin-top: var(--space-3);
  }
  .tut-intro {
    font-family: var(--serif-text);
    font-style: italic;
    font-size: 1.02rem;
    line-height: 1.6;
    color: var(--muted-ink-2);
    margin-top: var(--space-3);
  }
  .cover-rule { display: flex; margin: var(--space-5) 0; }
  .cover-rule span { width: 44px; height: 2px; background: var(--accent); }
  .tut-prompt {
    font-family: var(--serif);
    font-weight: 500;
    font-size: var(--step-3);
    margin-top: var(--space-3);
  }
  .tut-hint {
    font-family: var(--serif-text);
    color: var(--muted-ink);
    margin-top: var(--space-2);
  }
</style>
