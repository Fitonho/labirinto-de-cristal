import { loadLevel, move, type Direction, type GameState, type LevelData } from '../src/core';
import { levels } from '../src/levels/index';

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

/** Breadth-first search for the shortest win, for tiny levels only. */
export function shortestWin(start: GameState, maxStates = 200_000): number | null {
  const key = (s: GameState) => JSON.stringify([s.player, s.tiles.map((t) => t.id), s.doors, s.collected]);
  const seen = new Set([key(start)]);
  let frontier = [start];
  for (let depth = 1; frontier.length && seen.size < maxStates; depth++) {
    const next: GameState[] = [];
    for (const s of frontier) {
      for (const d of ['up', 'right', 'down', 'left'] as const) {
        const r = move(s, d).state;
        if (r === s) continue;
        if (r.status === 'won') return depth;
        const k = key(r);
        if (!seen.has(k)) {
          seen.add(k);
          next.push(r);
        }
      }
    }
    frontier = next;
  }
  return null;
}
