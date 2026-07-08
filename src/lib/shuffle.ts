// Fisher-Yates shuffle that also returns a mapping from the shuffled position
// back to the original index. Used by mechanics whose puzzle JSON stores a
// correctIndex — after shuffling the display array, the mechanic maps
// `round.correctIndex` through the returned indexMap to find where the
// correct item landed.
export function shuffleWithIndexMap<T>(items: T[]): { shuffled: T[]; indexMap: number[] } {
  return fisherYates(items, Math.random);
}

// Seeded variant: same shuffle every time for a given seed, so display order
// stays stable across refreshes and is identical for every player on a given
// day. FNV-1a folds the seed string into a 32-bit hash; xorshift32 expands
// that into a stream of floats in [0, 1).
export function seededShuffleWithIndexMap<T>(
  items: T[],
  seed: string,
): { shuffled: T[]; indexMap: number[] } {
  return fisherYates(items, fnv1aXorshift(seed));
}

function fisherYates<T>(
  items: T[],
  rand: () => number,
): { shuffled: T[]; indexMap: number[] } {
  const shuffled = items.slice();
  const indexMap = items.map((_, i) => i);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    [indexMap[i], indexMap[j]] = [indexMap[j], indexMap[i]];
  }
  return { shuffled, indexMap };
}

function fnv1aXorshift(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 1_000_000) / 1_000_000;
  };
}
