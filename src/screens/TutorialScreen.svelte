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
</script>

<section class="anim-enter">
  <p class="eyebrow">A quick demo — unscored</p>
  <h1 class="display" style="margin-top: var(--space-2); font-size: var(--step-3)">
    How LookBack works
  </h1>
  <p class="muted serif" style="margin-top: var(--space-3); font-style: italic">
    Each day has seven quick rounds of history and geography. Here's one: name the person in the portrait.
  </p>

  <hr class="rule" />

  <p class="eyebrow">Round — Face from the Past</p>
  <h2 class="display" style="margin-top: var(--space-2)">
    Who is <em class="accent">this</em>?
  </h2>
  <p class="muted" style="margin-top: var(--space-2)">A European military and political leader, painted in his study.</p>

  <div class="stack stagger" style="margin-top: var(--space-5)">
    {#each options as name, i}
      <button
        class="choice"
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
