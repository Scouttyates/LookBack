// ============================================================================
// LookBack — Shared Types
// ============================================================================

// ---------- Shared image reference ------------------------------------------

export interface ImageAttribution {
  fileTitle: string;   // Commons title, e.g. "File:Jacques-Louis David - The Emperor Napoleon....jpg"
  author: string;       // plain text, HTML stripped; "Unknown" allowed
  license: string;      // "Public domain" | "CC0" | "CC BY 4.0" | "CC BY-SA 4.0" | ...
  licenseUrl?: string;
  sourceUrl: string;    // Commons file page
}

export interface ImageRef {
  src: string;   // site-absolute, e.g. "/images/YYYY-MM-DD/face.jpg"
  alt: string;   // must NOT reveal the answer
  attribution: ImageAttribution;
}

// ---------- Round payload shapes (stored in puzzle JSON) -------------------

export type RoundType =
  | 'faceFromPast'
  | 'borderline'
  | 'battlefield'
  | 'whichCameFirst'
  | 'timeline'
  | 'whereInHistory'
  | 'guessTheYear'
  | 'zoomOut';

export interface FaceFromPastRound {
  type: 'faceFromPast';
  image: ImageRef;
  options: string[]; // exactly 4 person names
  correctIndex: number;
  revealFact: string; // one line shown after answering
}

export interface BorderlineRound {
  type: 'borderline';
  countryId: string;      // slug matching public/borders/<countryId>.svg and countries.ts id
  answer: string;          // canonical display name, e.g. "Portugal"
  continentHint: string;   // hint 1 (-30 pts). Hint 2 (-further 30 pts) = first letter, derived at runtime.
}

export interface BattlefieldRound {
  type: 'battlefield';
  image: ImageRef;
  clues: string[];   // 1-2 context lines shown with the image
  options: string[]; // exactly 4 battle names
  correctIndex: number;
  revealYear: number; // shown after answering
}

export interface WhichCameFirstRound {
  type: 'whichCameFirst';
  pairs: {
    a: string;
    b: string;
    firstIndex: 0 | 1; // which of a/b happened first
    aYear: number;      // negative = BCE; shown on reveal
    bYear: number;
  }[]; // exactly 5
}

export interface TimelineRound {
  type: 'timeline';
  events: { label: string; year: number }[]; // exactly 4, stored in correct order; shuffled at runtime
}

export interface WhereInHistoryRound {
  type: 'whereInHistory';
  image: ImageRef;
  eventQuestion: { prompt: string; options: string[]; correctIndex: number };    // 4 options, 50 pts
  followUpQuestion: { prompt: string; options: string[]; correctIndex: number }; // 4 options, 50 pts
}

export interface GuessTheYearRound {
  type: 'guessTheYear';
  prompt: string;    // "The Berlin Wall falls, reuniting a divided city."
  image?: ImageRef;
  answerYear: number; // negative = BCE
  minYear: number;    // slider bounds
  maxYear: number;
  tolerance: number;  // |guess-answer| <= tolerance -> full 100; bands double from there
  revealFact: string;
}

export interface ZoomOutRound {
  type: 'zoomOut';
  image: ImageRef;
  options: string[]; // exactly 6
  correctIndex: number;
  // 5 levels, most-zoomed first; last MUST be {scale:1, x:50, y:50}.
  // x/y are transform-origin percentages into the image.
  zoomLevels: { scale: number; x: number; y: number }[];
  revealFact: string;
}

export type Round =
  | FaceFromPastRound
  | BorderlineRound
  | BattlefieldRound
  | WhichCameFirstRound
  | TimelineRound
  | WhereInHistoryRound
  | GuessTheYearRound
  | ZoomOutRound;

// ---------- Puzzle file shape ----------------------------------------------

export interface Puzzle {
  puzzleNumber: number;
  date: string;    // ISO yyyy-mm-dd
  // rounds[3] (slot 4) is whichCameFirst on odd puzzleNumbers, timeline on
  // even — an authoring convention only; the app renders whatever type is
  // present in the JSON.
  rounds: Round[]; // exactly 7, in play order (see docs/authoring-rules.md)
}

export interface PuzzleIndex {
  startDate: string;  // yyyy-mm-dd of puzzle #1
  totalDays: number;
  available: string[]; // yyyy-mm-dd list sorted ascending
}

// ---------- Round results (runtime) -----------------------------------------

export interface RoundResult {
  type: RoundType;
  score: number;    // 0-100 (0-200 for zoomOut)
  detail: unknown;  // per-mechanic answer record, used for share + review
}

export type Mode = 'daily' | 'practice';

export interface GameState {
  date: string;
  puzzleNumber: number;
  mode: Mode;
  currentRoundIndex: number; // 0..6, 7 = finished
  roundResults: RoundResult[];
  totalScore: number; // sum of roundResults
}

// ---------- Persistence (localStorage) --------------------------------------

export interface StreakState {
  lastPlayedDate: string | null;
  currentStreak: number;
  longestStreak: number;
  currentPerfectStreak: number;
  longestPerfectStreak: number;
}

export interface PersistedState {
  version: 1;
  hasOnboarded: boolean;
  streak: StreakState;
  games: Record<string, GameState>; // keyed by date
}

// In-progress ZoomOut state, snapshotted to localStorage after every wrong
// guess so a mid-round page reload doesn't reset progress. Cleared as soon as
// the round finishes (the result then lives in PersistedState.games).
export interface ZoomOutDraft {
  date: string; // puzzle date — drafts for any other date are stale
  levelIndex: number;
  wrongPicks: number[];
}
