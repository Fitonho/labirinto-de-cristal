import { loadLevel, move, type Direction, type GameState, type LevelData } from '../src/core';
import { levels } from '../src/levels/index';
import { solve } from '../src/tools/solver';

export const level = (id: string): LevelData => {
  const found = levels.find((l) => l.id === id);
  if (!found) throw new Error(`no level ${id}`);
  return found;
};

export const custom = (grid: string[], start: [number, number], doors: LevelData['doors'] = []): GameState =>
  loadLevel({ version: 1, id: 'test', chapter: 'test', order: 0, grid, start, doors });

const letters: Record<string, Direction> = { U: 'up', R: 'right', D: 'down', L: 'left' };

/** Plays a path like "RRU" and returns the final state. */
export function play(state: GameState, path: string): GameState {
  for (const ch of path) state = move(state, letters[ch]).state;
  return state;
}

/** Shortest win length, for tiny levels only. */
export function shortestWin(start: GameState): number | null {
  return solve(start)?.moves ?? null;
}
