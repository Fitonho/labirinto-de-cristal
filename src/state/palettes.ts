// Which board palette a level is drawn in. The engine only knows 'black' and
// 'white'; src/ui/theme.ts turns each palette id into its two colours. Each
// new level draws the next palette from a shuffled bag, so every palette shows
// once before any repeats. The draw is seeded, so the reducers stay pure and
// tests can replay it.

export const PALETTE_IDS = [
  'ink',
  'forest',
  'ocean',
  'plum',
  'clay',
  'night',
  'cocoa',
  'moss',
  'wine',
  'slate',
  'teal',
  'ember',
  'indigo',
] as const;

export type PaletteId = (typeof PALETTE_IDS)[number];

/** The player's choice in the settings: a new palette every level, or always one favourite. */
export type PaletteChoice = 'random' | PaletteId;

export function isPaletteChoice(value: unknown): value is PaletteChoice {
  return value === 'random' || PALETTE_IDS.includes(value as PaletteId);
}

export interface PaletteDraw {
  paletteId: PaletteId;
  /** The palettes still to show before the bag is refilled, in the order they will come. */
  bag: PaletteId[];
  seed: number;
}

/** A small seeded generator (mulberry32): the next seed and a number from 0 up to 1. */
function nextRandom(seed: number): { seed: number; value: number } {
  const nextSeed = (seed + 0x6d2b79f5) >>> 0;
  let mixed = nextSeed;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { seed: nextSeed, value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296 };
}

/**
 * The next palette. An empty bag is refilled with every palette in a new
 * order, and the palette just shown never comes straight back.
 */
export function drawPalette(bag: readonly PaletteId[], seed: number, lastPaletteId: PaletteId | null): PaletteDraw {
  let nextBag = [...bag];
  let nextSeed = seed;
  if (nextBag.length === 0) {
    nextBag = [...PALETTE_IDS];
    for (let shuffleIndex = nextBag.length - 1; shuffleIndex > 0; shuffleIndex--) {
      const random = nextRandom(nextSeed);
      nextSeed = random.seed;
      const swapIndex = Math.floor(random.value * (shuffleIndex + 1));
      [nextBag[shuffleIndex], nextBag[swapIndex]] = [nextBag[swapIndex], nextBag[shuffleIndex]];
    }
    if (nextBag[0] === lastPaletteId) [nextBag[0], nextBag[1]] = [nextBag[1], nextBag[0]];
  }
  const [paletteId, ...remainingBag] = nextBag;
  return { paletteId, bag: remainingBag, seed: nextSeed };
}

/** A starting seed for a new store: random in the app, fixed in tests. */
export function randomSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}
