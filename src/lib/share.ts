import type { GameState, RoundResult, Puzzle, StreakState } from '../types';
import { stars, computeTotal } from './scoring';

const GLYPH: Record<RoundResult['type'], string> = {
  faceFromPast: '👤',
  borderline: '🗺️',
  battlefield: '⚔️',
  whichCameFirst: '⏳',
  timeline: '⏳',
  whereInHistory: '📸',
  guessTheYear: '📅',
  zoomOut: '🔍',
  atlas: '📍',
  throughLine: '🔗',
};

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Parse "YYYY-MM-DD" directly so no timezone shift can flip the day.
function formatShareDate(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${SHORT_MONTHS[m - 1]} ${d}`;
}

function roundSummary(result: RoundResult): string {
  return `${GLYPH[result.type]} ${result.score}`;
}

export function buildShareText(
  game: GameState,
  puzzle: Puzzle,
  streak: StreakState,
): string {
  const total = computeTotal(game);
  const s = stars(total);
  const starRow = '★'.repeat(s) + '☆'.repeat(5 - s);

  const lines: string[] = [];
  lines.push(
    `LookBack No. ${puzzle.puzzleNumber} · ${formatShareDate(puzzle.date)} — ${total}/800 ${starRow}`,
  );

  const rows: string[] = [];
  for (let i = 0; i < game.roundResults.length; i++) {
    rows.push(roundSummary(game.roundResults[i]));
  }
  // Group into rows of 3 for a compact 2-line grid
  for (let i = 0; i < rows.length; i += 3) {
    lines.push(rows.slice(i, i + 3).join('  '));
  }

  if (streak.currentPerfectStreak >= 2) {
    lines.push(`🔥 ${streak.currentPerfectStreak}-day perfect streak`);
  } else if (streak.currentStreak >= 2) {
    lines.push(`✅ ${streak.currentStreak}-day streak`);
  }
  lines.push('https://look-back-lemon.vercel.app');

  return lines.join('\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}
