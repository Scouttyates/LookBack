import type { StreakState } from '../types';
import { diffInDays } from './puzzle';

export function advanceStreak(
  prev: StreakState,
  todayISO: string,
  wasPerfect: boolean,
): StreakState {
  if (prev.lastPlayedDate === todayISO) return prev;

  const firstPlay = !prev.lastPlayedDate;
  const gap = firstPlay ? null : diffInDays(prev.lastPlayedDate!, todayISO);
  const nextStreak = firstPlay || gap !== 1 ? 1 : prev.currentStreak + 1;

  let nextPerfect: number;
  if (!wasPerfect) {
    nextPerfect = 0;
  } else if (firstPlay || gap !== 1) {
    nextPerfect = 1;
  } else {
    nextPerfect = prev.currentPerfectStreak + 1;
  }

  return {
    lastPlayedDate: todayISO,
    currentStreak: nextStreak,
    longestStreak: Math.max(nextStreak, prev.longestStreak),
    currentPerfectStreak: nextPerfect,
    longestPerfectStreak: Math.max(nextPerfect, prev.longestPerfectStreak),
  };
}
