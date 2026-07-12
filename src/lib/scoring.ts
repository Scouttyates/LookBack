import type {
  Round,
  GameState,
  FaceFromPastRound,
  BattlefieldRound,
  WhichCameFirstRound,
  TimelineRound,
  WhereInHistoryRound,
  GuessTheYearRound,
  AtlasRound,
  ThroughLineRound,
} from '../types';

// ---------- Per-mechanic answer shapes (stored in RoundResult.detail) -------

export interface FaceFromPastAnswer { picked: number }
export interface BattlefieldAnswer { picked: number }
export interface WhichCameFirstAnswer { picks: (0 | 1)[] } // length 5
export interface TimelineAnswer { order: number[] } // final ordering: indices into round.events
export interface WhereInHistoryAnswer { pickedEvent: number; pickedFollowUp: number }
export interface GuessTheYearAnswer { guessYear: number }
export interface AtlasAnswer { guessLat: number; guessLng: number; distanceKm: number }
export interface ThroughLineAnswer { solvedGroupIndices: number[]; mistakes: number }

// ---------- Scoring ----------------------------------------------------------

export const MAX_ROUND = 100;
// Sum of all 7 rounds at perfect: 6*100 + 200 = 800.
export const MAX_TOTAL = 800;

export function scoreFaceFromPast(r: FaceFromPastRound, a: FaceFromPastAnswer): number {
  return a.picked === r.correctIndex ? MAX_ROUND : 0;
}

export function scoreBattlefield(r: BattlefieldRound, a: BattlefieldAnswer): number {
  return a.picked === r.correctIndex ? MAX_ROUND : 0;
}

export function scoreWhichCameFirst(r: WhichCameFirstRound, a: WhichCameFirstAnswer): number {
  let correct = 0;
  r.pairs.forEach((pair, i) => {
    if (a.picks[i] === pair.firstIndex) correct += 1;
  });
  return correct * 20;
}

export function scoreTimeline(_r: TimelineRound, a: TimelineAnswer): number {
  let correct = 0;
  a.order.forEach((originalIdx, position) => {
    if (originalIdx === position) correct += 1;
  });
  return correct * 25;
}

export function scoreWhereInHistory(r: WhereInHistoryRound, a: WhereInHistoryAnswer): number {
  let score = 0;
  if (a.pickedEvent === r.eventQuestion.correctIndex) score += 50;
  if (a.pickedFollowUp === r.followUpQuestion.correctIndex) score += 50;
  return score;
}

export function scoreGuessTheYear(r: GuessTheYearRound, a: GuessTheYearAnswer): number {
  const diff = Math.abs(a.guessYear - r.answerYear);
  const tol = r.tolerance;
  if (diff <= tol) return 100;
  if (diff <= tol * 2) return 80;
  if (diff <= tol * 4) return 60;
  if (diff <= tol * 8) return 40;
  if (diff <= tol * 16) return 20;
  return 0;
}

// Banded exactly like Guess-the-Year: 100 within tolKm, then doubling bands.
export function scoreAtlas(r: AtlasRound, a: AtlasAnswer): number {
  const d = a.distanceKm, t = r.tolKm;
  if (d <= t)      return 100;
  if (d <= t * 2)  return 80;
  if (d <= t * 4)  return 60;
  if (d <= t * 8)  return 40;
  if (d <= t * 16) return 20;
  return 0;
}

// 40 per solved group (max 160) + 40 clean-solve bonus (all 4, <=1 mistake) = 200.
export function scoreThroughLine(_r: ThroughLineRound, a: ThroughLineAnswer): number {
  const solved = a.solvedGroupIndices.length;      // 0..4
  const base = solved * 40;                         // 0/40/80/120/160
  const bonus = solved === 4 && a.mistakes <= 1 ? 40 : 0;
  return base + bonus;                              // max 200
}

export function scoreRound(round: Round, detail: unknown): number {
  switch (round.type) {
    case 'faceFromPast':    return scoreFaceFromPast(round, detail as FaceFromPastAnswer);
    case 'battlefield':     return scoreBattlefield(round, detail as BattlefieldAnswer);
    case 'whichCameFirst':  return scoreWhichCameFirst(round, detail as WhichCameFirstAnswer);
    case 'timeline':        return scoreTimeline(round, detail as TimelineAnswer);
    case 'whereInHistory':  return scoreWhereInHistory(round, detail as WhereInHistoryAnswer);
    case 'guessTheYear':    return scoreGuessTheYear(round, detail as GuessTheYearAnswer);
    case 'atlas':           return scoreAtlas(round, detail as AtlasAnswer);
    case 'throughLine':     return scoreThroughLine(round, detail as ThroughLineAnswer);
  }
}

// ---------- Total ------------------------------------------------------------

export function computeTotal(state: Pick<GameState, 'roundResults'>): number {
  return state.roundResults.reduce((acc, r) => acc + r.score, 0);
}

// ---------- Stars --------------------------------------------------------------

export function stars(total: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (total >= 800) return 5;
  if (total >= 640) return 4;
  if (total >= 480) return 3;
  if (total >= 320) return 2;
  if (total >= 160) return 1;
  return 0;
}
