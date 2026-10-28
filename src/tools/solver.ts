// Breadth-first search for the shortest win, using the real engine.
// Meant for checking new, small levels; big open levels take too long.
import { DIRECTIONS, move, type Direction, type GameState } from '../core';

export interface Solution {
  moves: number;
  path: Direction[];
  states: number;
}

const key = (s: GameState) =>
  JSON.stringify([s.player, s.tiles.map((t) => t.id), s.doors, s.collected]);

/** Returns the shortest solution, or null if none is found within `maxStates`. */
export function solve(start: GameState, maxStates = 500_000): Solution | null {
  const parents = new Map<string, [string, Direction] | null>([[key(start), null]]);
  let frontier = [start];
  while (frontier.length && parents.size < maxStates) {
    const next: GameState[] = [];
    for (const s of frontier) {
      const k = key(s);
      for (const d of DIRECTIONS) {
        const r = move(s, d).state;
        if (r === s) continue;
        const rk = key(r);
        if (parents.has(rk)) continue;
        parents.set(rk, [k, d]);
        if (r.status === 'won') return { moves: r.moves - start.moves, path: pathTo(parents, rk), states: parents.size };
        next.push(r);
      }
    }
    frontier = next;
  }
  return null;
}

function pathTo(parents: Map<string, [string, Direction] | null>, k: string): Direction[] {
  const path: Direction[] = [];
  for (let p = parents.get(k); p; p = parents.get(p[0])) path.unshift(p[1]);
  return path;
}
