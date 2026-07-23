#!/usr/bin/env node
// Non-blocking content-runway check for LookBack's daily puzzles.
// Warns (but never fails) when authored puzzles are close to running out, so
// there is always time to author more before players hit the "no puzzle today"
// screen. Run via `npm run check:runway`; also invoked from the pre-commit hook.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runwayStatus } from './runway.mjs';

const PUZZLES_DIR = 'public/puzzles';
const WARN_THRESHOLD = 7;

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let index;
try {
  index = JSON.parse(readFileSync(join(PUZZLES_DIR, 'index.json'), 'utf8'));
} catch (err) {
  console.warn(`⚠ runway: could not read ${PUZZLES_DIR}/index.json (${err.message})`);
  process.exit(0); // never block on a read error
}

const today = todayISO();
const { todayCovered, lastDate, bufferDays, level } = runwayStatus(
  index.available ?? [],
  today,
  WARN_THRESHOLD,
);

if (level === 'ok') {
  console.log(`✓ runway: puzzles authored through ${lastDate} (${bufferDays} days out).`);
} else if (level === 'warn') {
  console.warn(
    `⚠ runway: puzzles only run through ${lastDate} (${bufferDays} day(s) out). ` +
      `Author more soon — after that, players get the "no puzzle today" screen.`,
  );
} else if (!todayCovered) {
  console.warn(
    `⚠ runway: NO puzzle for today (${today}) — players see the "no puzzle today" screen now. ` +
      `Last authored day: ${lastDate ?? 'none'}.`,
  );
} else {
  console.warn(`⚠ runway: content ends today (${lastDate}). Author more immediately.`);
}

process.exit(0);
