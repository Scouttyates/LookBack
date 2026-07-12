import type { PersistedState, GameState, ThroughLineDraft } from '../types';

const KEY = 'lookback:v1';
const THROUGHLINE_DRAFT_KEY = 'lookback:throughline:draft:v1';

const DEFAULT: PersistedState = {
  version: 1,
  hasOnboarded: false,
  streak: {
    lastPlayedDate: null,
    currentStreak: 0,
    longestStreak: 0,
    currentPerfectStreak: 0,
    longestPerfectStreak: 0,
  },
  games: {},
};

export function load(): PersistedState {
  if (typeof localStorage === 'undefined') return structuredClone(DEFAULT);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== 1) return structuredClone(DEFAULT);
    const loadedStreak = parsed.streak ?? DEFAULT.streak;
    return {
      version: 1,
      hasOnboarded: parsed.hasOnboarded ?? false,
      streak: {
        lastPlayedDate: loadedStreak.lastPlayedDate ?? null,
        currentStreak: loadedStreak.currentStreak ?? 0,
        longestStreak: loadedStreak.longestStreak ?? 0,
        currentPerfectStreak: loadedStreak.currentPerfectStreak ?? 0,
        longestPerfectStreak: loadedStreak.longestPerfectStreak ?? 0,
      },
      games: parsed.games ?? {},
    };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function save(state: PersistedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or availability errors — game still playable in-memory
  }
}

export function saveGame(state: PersistedState, game: GameState): PersistedState {
  const next = { ...state, games: { ...state.games, [game.date]: game } };
  save(next);
  return next;
}

export function markOnboarded(state: PersistedState): PersistedState {
  const next = { ...state, hasOnboarded: true };
  save(next);
  return next;
}

export function resetAll(): void {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
  try { localStorage.removeItem(THROUGHLINE_DRAFT_KEY); } catch { /* noop */ }
}

export function saveThroughLineDraft(draft: ThroughLineDraft): void {
  try { localStorage.setItem(THROUGHLINE_DRAFT_KEY, JSON.stringify(draft)); }
  catch { /* ignore quota/availability */ }
}

export function loadThroughLineDraft(date: string): ThroughLineDraft | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(THROUGHLINE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThroughLineDraft;
    if (parsed.date !== date) {
      try { localStorage.removeItem(THROUGHLINE_DRAFT_KEY); } catch { /* noop */ }
      return null;
    }
    return parsed;
  } catch { return null; }
}

export function clearThroughLineDraft(): void {
  try { localStorage.removeItem(THROUGHLINE_DRAFT_KEY); } catch { /* noop */ }
}
