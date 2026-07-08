import type { Puzzle, PuzzleIndex } from '../types';

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function diffInDays(startISO: string, targetISO: string): number {
  const a = Date.parse(`${startISO}T00:00:00`);
  const b = Date.parse(`${targetISO}T00:00:00`);
  return Math.floor((b - a) / 86_400_000);
}

export async function fetchIndex(): Promise<PuzzleIndex> {
  const res = await fetch(`${BASE}/puzzles/index.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`index.json ${res.status}`);
  return res.json();
}

export async function fetchPuzzle(date: string): Promise<Puzzle> {
  const res = await fetch(`${BASE}/puzzles/${date}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`puzzle ${date} ${res.status}`);
  return res.json();
}

export function pickPlayableDate(index: PuzzleIndex, iso: string): string {
  if (index.available.includes(iso)) return iso;
  // Fall back to the most recent available date not in the future
  const past = index.available.filter((d) => d <= iso);
  return past.length ? past[past.length - 1] : index.available[index.available.length - 1];
}
