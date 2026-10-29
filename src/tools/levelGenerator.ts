// Finds new small levels with the real engine. Each try starts from a random
// board and changes one thing at a time (a tile, a star, the start, a portal),
// keeping a change when the shortest solution gets longer and every check
// still passes. The checks are what make a board worth playing: each asked-for
// mechanic is needed (the level can't be won without it), every portal is
// needed, and with two stars each star alone needs a push and the pair takes
// clearly longer than either. A tidy pass then calms the board without
// changing the solution's length. Pure TypeScript, so Vitest tests it.
import { loadLevel, validateLevel, type Direction, type GameEvent, type GameState, type LevelData } from '../core';
import { searchShortest, type MoveFilter, type Solution } from './solver';

/** What a level can be asked to need: pushing a box, flipping through a portal, carrying a portal by pushing, or pushing a star. */
export type Mechanic = 'push' | 'portal' | 'carry' | 'star-push';

export const MECHANICS: readonly Mechanic[] = ['push', 'portal', 'carry', 'star-push'];

/** The moves each mechanic is made of; the level must be unwinnable without them. */
const MOVES_BY_MECHANIC: Record<Mechanic, MoveFilter> = {
  push: (events) => events.some((event) => event.type === 'pushed'),
  portal: (events) => events.some((event) => event.type === 'flipped'),
  carry: (events) => events.some((event) => event.type === 'portalMoved'),
  'star-push': (events, stateBefore) => events.some((event) => isStarPush(event, stateBefore)),
};

function isStarPush(event: GameEvent, stateBefore: GameState): boolean {
  return event.type === 'pushed' && stateBefore.tiles.some((tile) => tile.id === event.tileId && tile.goal);
}

export interface GeneratorOptions {
  columnCount: number;
  rowCount: number;
  mechanics: Mechanic[];
  starCount: 1 | 2;
  portalCount: number;
  minMoves: number;
  maxMoves: number;
  /** Searches that reach this many states count as failed, which keeps each check quick. */
  maxStates: number;
  /** Changes tried on each board before it is judged. */
  climbStepCount: number;
}

/** Defaults for everything but the size and the mechanics. */
export const DEFAULT_GENERATOR_OPTIONS = {
  starCount: 1,
  minMoves: 10,
  maxMoves: 40,
  maxStates: 30_000,
  climbStepCount: 1500,
} as const;

/** With two stars, each one alone must take at least this many moves... */
const MIN_SINGLE_STAR_MOVES = 6;
/** ...and the pair at least this many more than the longer of the two. */
const MIN_EXTRA_MOVES_FOR_BOTH_STARS = 4;
/** Share of random cells that start as floor (white, the start's colour's opposite). */
const FLOOR_SHARE = 0.55;

type PortalEntry = [row: number, column: number, side: Direction];

interface Board {
  /** One letter per cell: b, w, or B / W for a star. */
  letters: string[][];
  start: [row: number, column: number];
  portals: PortalEntry[];
}

export interface GeneratedLevel {
  level: LevelData;
  solution: Direction[];
}

/** A seeded random number generator (mulberry32), so a run can be repeated from its seed. */
export function seededRandom(seed: number): () => number {
  let randomState = seed >>> 0;
  return () => {
    randomState = (randomState + 0x6d2b79f5) >>> 0;
    let mixed = randomState;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function levelFor(board: Board, id = 'generated'): LevelData {
  return { version: 2, id, chapter: 'lab', order: 1, grid: board.letters.map((rowLetters) => rowLetters.join(' ')), start: board.start, portals: board.portals };
}

/** The board's shortest solution when every check passes, else null. */
function checkedSolution(board: Board, options: GeneratorOptions): { solution: Solution; score: number } | null {
  const level = levelFor(board);
  if (validateLevel(level).length) return null;
  const start = loadLevel(level);
  const solution = searchShortest(start, options.maxStates).solution;
  if (!solution || solution.moveCount > options.maxMoves) return null;
  for (const mechanic of options.mechanics) {
    if (!unwinnable(start, options.maxStates, (events, stateBefore) => !MOVES_BY_MECHANIC[mechanic](events, stateBefore))) return null;
  }
  for (let portalIndex = 0; portalIndex < board.portals.length; portalIndex++) {
    const withoutPortal = levelFor({ ...board, portals: board.portals.filter((_, otherIndex) => otherIndex !== portalIndex) });
    if (validateLevel(withoutPortal).length || !unwinnable(loadLevel(withoutPortal), options.maxStates)) return null;
  }
  let shortestSingleStarMoves = 0;
  if (options.starCount === 2) {
    const singleStarMoves = singleStarMoveCounts(board, options.maxStates);
    if (!singleStarMoves) return null;
    if (solution.moveCount - Math.max(...singleStarMoves) < MIN_EXTRA_MOVES_FOR_BOTH_STARS) return null;
    shortestSingleStarMoves = Math.min(...singleStarMoves);
  }
  // Longer is better; a star that is a puzzle on its own counts too; a huge search space a little against.
  const score = solution.moveCount * 10 + shortestSingleStarMoves * 5 - solution.searchedStateCount / 2000;
  return { solution, score };
}

function unwinnable(start: GameState, maxStates: number, allowsMove?: MoveFilter): boolean {
  const result = searchShortest(start, maxStates, allowsMove);
  return result.solution === null && result.exhausted;
}

/** For a two-star board, how long each star takes with the other made plain; null if one needs no push or is too short. */
function singleStarMoveCounts(board: Board, maxStates: number): number[] | null {
  const starCells = cellsWhere(board, (letter) => letter === 'B' || letter === 'W');
  if (starCells.length !== 2) return null;
  const moveCounts: number[] = [];
  for (const [starRow, starColumn] of starCells) {
    const letters = board.letters.map((rowLetters) => [...rowLetters]);
    letters[starRow][starColumn] = letters[starRow][starColumn].toLowerCase();
    const level = levelFor({ ...board, letters });
    if (validateLevel(level).length) return null;
    const start = loadLevel(level);
    const solution = searchShortest(start, maxStates).solution;
    if (!solution || solution.moveCount < MIN_SINGLE_STAR_MOVES) return null;
    if (!unwinnable(start, maxStates, (events) => !MOVES_BY_MECHANIC.push(events, start))) return null;
    moveCounts.push(solution.moveCount);
  }
  return moveCounts;
}

function cellsWhere(board: Board, matches: (letter: string) => boolean): [number, number][] {
  const cells: [number, number][] = [];
  board.letters.forEach((rowLetters, row) => rowLetters.forEach((letter, column) => matches(letter) && cells.push([row, column])));
  return cells;
}

function randomBoard(options: GeneratorOptions, random: () => number): Board {
  const randomIndex = (count: number) => Math.floor(random() * count);
  const letters: string[][] = Array.from({ length: options.rowCount }, () =>
    Array.from({ length: options.columnCount }, () => (random() < FLOOR_SHARE ? 'w' : 'b')),
  );
  for (let starIndex = 0; starIndex < options.starCount; starIndex++) {
    letters[randomIndex(options.rowCount)][randomIndex(options.columnCount)] = random() < 0.5 ? 'B' : 'W';
  }
  const start: [number, number] = [randomIndex(options.rowCount), randomIndex(options.columnCount)];
  letters[start[0]][start[1]] = 'b';
  const portals = Array.from({ length: options.portalCount }, () => randomPortal(options, random));
  return { letters, start, portals };
}

function randomPortal(options: GeneratorOptions, random: () => number): PortalEntry {
  return [Math.floor(random() * options.rowCount), Math.floor(random() * options.columnCount), random() < 0.5 ? 'right' : 'down'];
}

/** The board with one random change: a tile's colour, a star moved, the start moved or a portal moved. */
function changedBoard(board: Board, options: GeneratorOptions, random: () => number): Board {
  const randomIndex = (count: number) => Math.floor(random() * count);
  const next: Board = { letters: board.letters.map((rowLetters) => [...rowLetters]), start: [...board.start], portals: board.portals.map((portal) => [...portal]) };
  const roll = random();
  if (roll < 0.6) {
    const row = randomIndex(options.rowCount);
    const column = randomIndex(options.columnCount);
    const flippedLetters: Record<string, string> = { b: 'w', w: 'b', B: 'W', W: 'B' };
    next.letters[row][column] = flippedLetters[next.letters[row][column]];
  } else if (roll < 0.7) {
    const starCells = cellsWhere(next, (letter) => letter === 'B' || letter === 'W');
    const [starRow, starColumn] = starCells[randomIndex(starCells.length)];
    const row = randomIndex(options.rowCount);
    const column = randomIndex(options.columnCount);
    if (/[BW]/.test(next.letters[row][column])) return next;
    [next.letters[starRow][starColumn], next.letters[row][column]] = [next.letters[row][column], next.letters[starRow][starColumn]];
  } else if (roll < 0.8 || options.portalCount === 0) {
    next.start = [randomIndex(options.rowCount), randomIndex(options.columnCount)];
  } else {
    next.portals[randomIndex(options.portalCount)] = randomPortal(options, random);
  }
  return next;
}

/**
 * One try: a random board that passes the checks, climbed toward a longer
 * solution, then tidied. Null when no starting board passed, or the climb
 * ended under `minMoves`. Call it again (same random) for the next try.
 */
export function generateLevel(options: GeneratorOptions, random: () => number, startingBoardTryCount = 2000): GeneratedLevel | null {
  let board: Board | null = null;
  let best: ReturnType<typeof checkedSolution> = null;
  for (let tryIndex = 0; tryIndex < startingBoardTryCount && !best; tryIndex++) {
    board = randomBoard(options, random);
    best = checkedSolution(board, options);
  }
  if (!board || !best) return null;
  for (let stepIndex = 0; stepIndex < options.climbStepCount; stepIndex++) {
    const nextBoard = changedBoard(board, options, random);
    const next = checkedSolution(nextBoard, options);
    if (next && next.score >= best.score) {
      board = nextBoard;
      best = next;
    }
  }
  if (best.solution.moveCount < options.minMoves) return null;
  const tidied = tidiedBoard(board, best.solution.moveCount, options);
  const level = levelFor(tidied.board);
  return { level: { ...level, par: tidied.solution.moveCount }, solution: tidied.solution.path };
}

/** How busy a board looks: neighbouring cells of different colours. */
export function boardNoise(grid: string[]): number {
  const letters = grid.map((rowText) => rowText.toLowerCase().split(' '));
  let noise = 0;
  letters.forEach((rowLetters, row) =>
    rowLetters.forEach((letter, column) => {
      if (column + 1 < rowLetters.length && rowLetters[column + 1] !== letter) noise++;
      if (row + 1 < letters.length && letters[row + 1][column] !== letter) noise++;
    }),
  );
  return noise;
}

/** Flips single plain tiles while the board gets calmer, the solution keeps its length and every check still passes. */
function tidiedBoard(board: Board, moveCount: number, options: GeneratorOptions): { board: Board; solution: Solution } {
  let current = board;
  let currentSolution = checkedSolution(current, options)!.solution;
  let improved = true;
  while (improved) {
    improved = false;
    for (const [row, column] of cellsWhere(current, (letter) => letter === 'b' || letter === 'w')) {
      if (row === current.start[0] && column === current.start[1]) continue;
      const letters = current.letters.map((rowLetters) => [...rowLetters]);
      letters[row][column] = letters[row][column] === 'b' ? 'w' : 'b';
      const candidate = { ...current, letters };
      if (boardNoise(levelFor(candidate).grid) >= boardNoise(levelFor(current).grid)) continue;
      const checked = checkedSolution(candidate, options);
      if (!checked || checked.solution.moveCount !== moveCount) continue;
      current = candidate;
      currentSolution = checked.solution;
      improved = true;
    }
  }
  return { board: current, solution: currentSolution };
}
