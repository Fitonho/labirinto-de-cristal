// Breadth-first search for the shortest win, using the real engine.
// Meant for checking new, small levels; big open levels take too long.
import { DIRECTIONS, move, type Direction, type GameEvent, type GameState } from '../core';

export interface Solution {
  moveCount: number;
  path: Direction[];
  searchedStateCount: number;
}

export interface SearchResult {
  solution: Solution | null;
  /** True when the whole state space was searched, so a missing solution means the level can't be won. */
  exhausted: boolean;
}

/** Says whether a move may be taken, from the events it caused and the state before it. */
export type MoveFilter = (events: GameEvent[], stateBefore: GameState) => boolean;

const stateKey = (state: GameState) =>
  JSON.stringify([state.player, state.tiles.map((tile) => tile.id), state.portals, state.collectedGoalIds]);

/** Returns the shortest solution, or null if none is found within `maxStates`. */
export function solve(start: GameState, maxStates = 500_000): Solution | null {
  return searchShortest(start, maxStates).solution;
}

/** The shortest solution using only the moves `allowsMove` accepts, and whether the search ran out of states first. */
export function searchShortest(start: GameState, maxStates: number, allowsMove: MoveFilter = () => true): SearchResult {
  const parentsByKey = new Map<string, [parentKey: string, direction: Direction] | null>([[stateKey(start), null]]);
  let frontierStates = [start];
  while (frontierStates.length && parentsByKey.size < maxStates) {
    const nextFrontierStates: GameState[] = [];
    for (const state of frontierStates) {
      const currentKey = stateKey(state);
      for (const direction of DIRECTIONS) {
        const { state: nextState, events } = move(state, direction);
        if (nextState === state || !allowsMove(events, state)) continue;
        const nextKey = stateKey(nextState);
        if (parentsByKey.has(nextKey)) continue;
        parentsByKey.set(nextKey, [currentKey, direction]);
        if (nextState.status === 'won') {
          const solution = {
            moveCount: nextState.moveCount - start.moveCount,
            path: pathTo(parentsByKey, nextKey),
            searchedStateCount: parentsByKey.size,
          };
          return { solution, exhausted: false };
        }
        nextFrontierStates.push(nextState);
      }
    }
    frontierStates = nextFrontierStates;
  }
  return { solution: null, exhausted: frontierStates.length === 0 };
}

function pathTo(parentsByKey: Map<string, [parentKey: string, direction: Direction] | null>, endKey: string): Direction[] {
  const path: Direction[] = [];
  for (let parent = parentsByKey.get(endKey); parent; parent = parentsByKey.get(parent[0])) path.unshift(parent[1]);
  return path;
}
