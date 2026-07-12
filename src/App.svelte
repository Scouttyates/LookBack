<script lang="ts">
  import './styles/global.css';
  import './styles/motion.css';

  import type {
    Puzzle,
    PuzzleIndex,
    GameState,
    PersistedState,
    RoundResult,
    Round,
    Mode,
  } from './types';

  import { track } from '@vercel/analytics';

  import { fetchIndex, fetchPuzzle, pickPlayableDate, todayISO } from './lib/puzzle';
  import { load, save, saveGame, markOnboarded } from './lib/persistence';
  import { advanceStreak } from './lib/streak';
  import { computeTotal } from './lib/scoring';

  import SplashScreen from './screens/SplashScreen.svelte';
  import RoundIntro from './screens/RoundIntro.svelte';
  import RoundResultScreen from './screens/RoundResult.svelte';
  import SummaryScreen from './screens/SummaryScreen.svelte';
  import TutorialScreen from './screens/TutorialScreen.svelte';
  import ArchiveScreen from './screens/ArchiveScreen.svelte';

  import FaceFromPast from './mechanics/FaceFromPast.svelte';
  import Battlefield from './mechanics/Battlefield.svelte';
  import WhichCameFirst from './mechanics/WhichCameFirst.svelte';
  import Timeline from './mechanics/Timeline.svelte';
  import WhereInHistory from './mechanics/WhereInHistory.svelte';
  import GuessTheYear from './mechanics/GuessTheYear.svelte';
  import Atlas from './mechanics/Atlas.svelte';
  import ThroughLine from './mechanics/ThroughLine.svelte';

  const TOTAL_ROUNDS = 7;

  type Screen =
    | 'loading'
    | 'error'
    | 'tutorial'
    | 'splash'
    | 'archive'
    | 'roundIntro'
    | 'round'
    | 'roundResult'
    | 'summary';

  let screen: Screen = $state('loading');
  let errorMessage = $state('');

  let persisted: PersistedState = $state(load());
  let index: PuzzleIndex | null = $state(null);
  let puzzle: Puzzle | null = $state(null);
  let game: GameState | null = $state(null);
  let mode: Mode = $state('daily');

  let lastRoundResult: RoundResult | null = $state(null);

  // ---------- Bootstrapping ------------------------------------------------

  $effect(() => {
    (async () => {
      try {
        const idx = await fetchIndex();
        index = idx;
        const date = pickPlayableDate(idx, todayISO());
        const p = await fetchPuzzle(date);
        puzzle = p;
        mode = 'daily';
        game = persisted.games[p.date] ?? null;

        if (!persisted.hasOnboarded) {
          screen = 'tutorial';
        } else {
          screen = 'splash';
        }
      } catch (err: unknown) {
        errorMessage = err instanceof Error ? err.message : 'Something went wrong.';
        screen = 'error';
      }
    })();
  });

  // ---------- Helpers ------------------------------------------------------

  function roman(n: number): string {
    const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let out = '', x = n;
    for (const [v, s] of map) { while (x >= v) { out += s; x -= v; } }
    return out;
  }

  function newGame(p: Puzzle, m: Mode): GameState {
    return {
      date: p.date,
      puzzleNumber: p.puzzleNumber,
      mode: m,
      currentRoundIndex: 0,
      roundResults: [],
      totalScore: 0,
    };
  }

  function ensureGame(): GameState {
    if (!puzzle) throw new Error('no puzzle loaded');
    if (!game || game.mode !== mode) {
      game = newGame(puzzle, mode);
    }
    return game;
  }

  function persistGame(g: GameState) {
    if (mode === 'daily') {
      persisted = saveGame(persisted, g);
    }
    // Practice games aren't persisted to `games` — they live in memory only
  }

  function completeGame(g: GameState) {
    if (!puzzle) return;
    g.totalScore = computeTotal(g);

    track('puzzle_completed', { mode, score: g.totalScore });

    if (mode === 'daily') {
      const wasPerfect = g.totalScore === 800;
      persisted = {
        ...persisted,
        streak: advanceStreak(persisted.streak, g.date, wasPerfect),
      };
      save(persisted);
      persistGame(g);
    }
  }

  // ---------- Navigation handlers -----------------------------------------

  function beginFromSplash() {
    if (!puzzle) return;
    const g = ensureGame();
    if (g.currentRoundIndex >= TOTAL_ROUNDS) {
      screen = 'summary';
    } else {
      screen = 'roundIntro';
    }
  }

  function handleTutorialDone() {
    persisted = markOnboarded(persisted);
    screen = 'splash';
  }

  function startRound() {
    screen = 'round';
  }

  function handleRoundComplete(detail: unknown, score: number) {
    if (!game || !puzzle) return;

    const currentIdx = game.currentRoundIndex;
    const round = puzzle.rounds[currentIdx];

    const result: RoundResult = {
      type: round.type,
      score,
      detail,
    };
    lastRoundResult = result;

    game.roundResults = [...game.roundResults, result];
    game.currentRoundIndex = currentIdx + 1;

    if (game.currentRoundIndex >= TOTAL_ROUNDS) {
      completeGame(game);
    } else {
      persistGame(game);
    }

    screen = 'roundResult';
  }

  function advanceAfterResult() {
    if (!game) return;
    if (game.currentRoundIndex >= TOTAL_ROUNDS) {
      screen = 'summary';
    } else {
      screen = 'roundIntro';
    }
  }

  function goHome() {
    mode = 'daily';
    if (index) {
      const date = pickPlayableDate(index, todayISO());
      if (puzzle?.date !== date) {
        fetchPuzzle(date).then((p) => {
          puzzle = p;
          game = persisted.games[p.date] ?? null;
        });
      } else if (puzzle) {
        game = persisted.games[puzzle.date] ?? null;
      }
    }
    screen = 'splash';
  }

  function openArchive() { screen = 'archive'; }

  async function pickArchiveDate(date: string) {
    try {
      const p = await fetchPuzzle(date);
      puzzle = p;
      mode = date === todayISO() ? 'daily' : 'practice';
      game = mode === 'daily' ? (persisted.games[p.date] ?? null) : null;
      screen = 'splash';
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : 'Puzzle not found.';
      screen = 'error';
    }
  }

  // ---------- Derived for children ----------------------------------------

  let currentRound: Round | null = $derived.by(() => {
    if (!puzzle || !game) return null;
    if (game.currentRoundIndex >= TOTAL_ROUNDS) return null;
    return puzzle.rounds[game.currentRoundIndex];
  });

  let runningTotal: number = $derived.by(() => {
    if (!game) return 0;
    return game.roundResults.reduce((acc: number, r: RoundResult) => acc + r.score, 0);
  });
</script>

<main class="app-shell">
  {#if screen === 'loading'}
    <p class="center muted" style="padding-top: var(--space-7)">Loading…</p>
  {:else if screen === 'error'}
    <p class="center" style="padding-top: var(--space-7)">
      <span class="accent serif" style="font-size: var(--step-3); display: block">Something went wrong.</span>
      <span class="muted mono" style="font-size: 0.875rem; display: block; margin-top: var(--space-3)">{errorMessage}</span>
    </p>
  {:else if screen === 'tutorial'}
    <TutorialScreen ondone={handleTutorialDone} />
  {:else if screen === 'splash' && puzzle}
    <SplashScreen
      {puzzle}
      streak={persisted.streak}
      existingGame={game}
      {mode}
      onbegin={beginFromSplash}
      onarchive={openArchive}
    />
  {:else if screen === 'archive' && index}
    <ArchiveScreen {index} {persisted} onback={goHome} onpick={pickArchiveDate} />
  {:else if screen === 'roundIntro' && game && currentRound}
    <RoundIntro
      roundNumber={game.currentRoundIndex + 1}
      totalRounds={TOTAL_ROUNDS}
      type={currentRound.type}
      oncontinue={startRound}
    />
  {:else if screen === 'round' && currentRound && game}
    <div class="topbar">
      <span class="wordmark">LookBack</span>
      <span class="progress">{roman(game.currentRoundIndex + 1)} / {roman(TOTAL_ROUNDS)}</span>
    </div>
    {#if currentRound.type === 'faceFromPast'}
      <FaceFromPast round={currentRound} oncomplete={handleRoundComplete} />
    {:else if currentRound.type === 'battlefield'}
      <Battlefield round={currentRound} oncomplete={handleRoundComplete} />
    {:else if currentRound.type === 'whichCameFirst'}
      <WhichCameFirst round={currentRound} oncomplete={handleRoundComplete} />
    {:else if currentRound.type === 'timeline'}
      <Timeline round={currentRound} oncomplete={handleRoundComplete} />
    {:else if currentRound.type === 'whereInHistory'}
      <WhereInHistory round={currentRound} oncomplete={handleRoundComplete} />
    {:else if currentRound.type === 'guessTheYear'}
      <GuessTheYear round={currentRound} oncomplete={handleRoundComplete} />
    {:else if currentRound.type === 'atlas'}
      <Atlas round={currentRound} oncomplete={handleRoundComplete} />
    {:else if currentRound.type === 'throughLine'}
      <ThroughLine
        round={currentRound}
        oncomplete={handleRoundComplete}
        puzzleDate={mode === 'daily' && puzzle ? puzzle.date : null}
      />
    {/if}
  {:else if screen === 'roundResult' && game && lastRoundResult && puzzle}
    <RoundResultScreen
      result={lastRoundResult}
      round={puzzle.rounds[game.currentRoundIndex - 1]}
      runningTotal={runningTotal}
      roundNumber={game.currentRoundIndex}
      totalRounds={TOTAL_ROUNDS}
      onnext={advanceAfterResult}
    />
  {:else if screen === 'summary' && game && puzzle}
    <SummaryScreen
      {game}
      {puzzle}
      streak={persisted.streak}
      {mode}
      onhome={goHome}
    />
  {/if}
</main>
