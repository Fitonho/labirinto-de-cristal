import { loadLevel, move, type Direction, type GameState, type LevelData } from '../src/core';
import { levels } from '../src/levels/index';
import { solve } from '../src/tools/solver';

export const levelById = (levelId: string): LevelData => {
  const foundLevel = levels.find((candidate) => candidate.id === levelId);
  if (!foundLevel) throw new Error(`no level ${levelId}`);
  return foundLevel;
};

export const customLevelState = (grid: string[], start: [number, number], portals: LevelData['portals'] = []): GameState =>
  loadLevel({ version: 2, id: 'test', chapter: 'test', order: 0, grid, start, portals });

const directionsByLetter: Record<string, Direction> = { U: 'up', R: 'right', D: 'down', L: 'left' };

/** Plays a path like "RRU" and returns the final state. */
export function play(state: GameState, path: string): GameState {
  for (const letter of path) state = move(state, directionsByLetter[letter]).state;
  return state;
}

/** Shortest win length, for tiny levels only. */
export function shortestWin(start: GameState): number | null {
  return solve(start)?.moveCount ?? null;
}
