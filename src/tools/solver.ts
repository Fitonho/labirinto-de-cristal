// Breadth-first search for the shortest win, using the real engine.
// Meant for checking new, small levels; big open levels take too long.
import { DIRECTIONS, move, type Direction, type GameState } from '../core';

export interface Solution {
  moveCount: number;
  path: Direction[];
  searchedStateCount: number;
}

const stateKey = (state: GameState) =>
  JSON.stringify([state.player, state.tiles.map((tile) => tile.id), state.portals, state.collectedGoalIds]);

/** Returns the shortest solution, or null if none is found within `maxStates`. */
export function solve(start: GameState, maxStates = 500_000): Solution | null {
  const parentsByKey = new Map<string, [parentKey: string, direction: Direction] | null>([[stateKey(start), null]]);
  let frontierStates = [start];
  while (frontierStates.length && parentsByKey.size < maxStates) {
    const nextFrontierStates: GameState[] = [];
    for (const state of frontierStates) {
      const currentKey = stateKey(state);
      for (const direction of DIRECTIONS) {
        const nextState = move(state, direction).state;
        if (nextState === state) continue;
        const nextKey = stateKey(nextState);
        if (parentsByKey.has(nextKey)) continue;
        parentsByKey.set(nextKey, [currentKey, direction]);
        if (nextState.status === 'won') {
          return {
            moveCount: nextState.moveCount - start.moveCount,
            path: pathTo(parentsByKey, nextKey),
            searchedStateCount: parentsByKey.size,
          };
        }
        nextFrontierStates.push(nextState);
      }
    }
    frontierStates = nextFrontierStates;
  }
  return null;
}

function pathTo(parentsByKey: Map<string, [parentKey: string, direction: Direction] | null>, endKey: string): Direction[] {
  const path: Direction[] = [];
  for (let parent = parentsByKey.get(endKey); parent; parent = parentsByKey.get(parent[0])) path.unshift(parent[1]);
  return path;
}
