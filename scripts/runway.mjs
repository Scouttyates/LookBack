// Pure content-runway logic for LookBack's daily puzzles.
// Kept dependency-free and side-effect-free so it can be unit tested with
// `node --test`. The CLI wrapper lives in check-runway.mjs.

const DAY_MS = 86_400_000;

/**
 * Whole days from `aISO` to `bISO` (both YYYY-MM-DD). Positive when b is later.
 * Anchored to UTC midnight so it is DST-proof for pure date strings.
 */
export function daysBetween(aISO, bISO) {
  const a = Date.parse(`${aISO}T00:00:00Z`);
  const b = Date.parse(`${bISO}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

/**
 * Summarise how much authored puzzle content remains.
 *
 * @param {string[]} available   The index's `available` date list (any order).
 * @param {string} todayISO      Today as YYYY-MM-DD.
 * @param {number} [warnThreshold=7]  Warn when fewer than this many days remain.
 * @returns {{todayCovered: boolean, lastDate: string|null, bufferDays: number, level: 'ok'|'warn'|'urgent'}}
 */
export function runwayStatus(available, todayISO, warnThreshold = 7) {
  const sorted = [...available].sort();
  const lastDate = sorted.length ? sorted[sorted.length - 1] : null;
  const todayCovered = available.includes(todayISO);
  const bufferDays = lastDate === null ? -Infinity : daysBetween(todayISO, lastDate);

  let level;
  if (!todayCovered || bufferDays < 0) {
    level = 'urgent';
  } else if (bufferDays < warnThreshold) {
    level = 'warn';
  } else {
    level = 'ok';
  }

  return { todayCovered, lastDate, bufferDays, level };
}
