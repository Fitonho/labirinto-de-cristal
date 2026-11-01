// Seek: which way the Pebble steps toward a tile, for a tap on the board or a
// finger resting on it. It walks the shortest way over floor and never pushes
// a box or goes through a portal on the way, so it never makes a puzzle move
// for the player. Only the last step, onto the tile itself, may be a push or a
// portal: tapping a box walks up to a side it can be pushed from and pushes
// it. If the tile can't be
// reached, it walks to the reachable tile closest to it. Steps are tried with
// the engine, so seek follows the same rules as every other move. No React
// here, so Vitest tests it.
import { DIRECTIONS, move, type Cell, type Direction, type GameState } from '../core';
import { directionBetween } from './motion';

/** The first step toward `target`, or null when the Pebble is there or as close as it can walk. */
export function seekDirection(state: GameState, target: Cell): Direction | null {
  const nextToTarget = directionBetween(state.player, target);
  if (nextToTarget) return nextToTarget;

  // Breadth-first over the tiles a plain step reaches, remembering each tile's first step from the Pebble.
  const keyOf = (cell: Cell) => cell.row * state.columnCount + cell.column;
  const firstStepsByTileKey = new Map<number, Direction | null>([[keyOf(state.player), null]]);
  const walkableCells: Cell[] = [{ row: state.player.row, column: state.player.column }];
  for (let queueIndex = 0; queueIndex < walkableCells.length; queueIndex += 1) {
    const cell = walkableCells[queueIndex];
    const stateAtCell = { ...state, player: { ...state.player, row: cell.row, column: cell.column } };
    for (const direction of DIRECTIONS) {
      const { state: stateAfter, events } = move(stateAtCell, direction);
      const plainStep = events.some((event) => event.type === 'moved') && !events.some((event) => event.type === 'pushed' || event.type === 'flipped');
      if (!plainStep || firstStepsByTileKey.has(keyOf(stateAfter.player))) continue;
      firstStepsByTileKey.set(keyOf(stateAfter.player), firstStepsByTileKey.get(keyOf(cell)) ?? direction);
      walkableCells.push({ row: stateAfter.player.row, column: stateAfter.player.column });
    }
  }
  if (firstStepsByTileKey.has(keyOf(target))) return firstStepsByTileKey.get(keyOf(target)) ?? null;
  // Tiles come out of the search nearest first, so the first one beside the target is the closest place to take the
  // last step from. One where that step works (the push isn't refused) comes first.
  const besideCells = walkableCells.filter((cell) => directionBetween(cell, target));
  const lastStepWorks = (cell: Cell) => {
    const stateAtCell = { ...state, player: { ...state.player, row: cell.row, column: cell.column } };
    return move(stateAtCell, directionBetween(cell, target) as Direction).events.some((event) => event.type === 'moved');
  };
  const besideTarget = besideCells.find(lastStepWorks) ?? besideCells[0];
  if (besideTarget) return firstStepsByTileKey.get(keyOf(besideTarget)) ?? null;
  const distanceToTarget = (cell: Cell) => Math.abs(cell.row - target.row) + Math.abs(cell.column - target.column);
  const closestCell = walkableCells.reduce((closest, cell) => (distanceToTarget(cell) < distanceToTarget(closest) ? cell : closest));
  return firstStepsByTileKey.get(keyOf(closestCell)) ?? null;
}

/**
 * The board tile under a point in an area that holds the board centred, so a
 * finger beside the board counts as the nearest edge tile.
 */
export function cellAtPoint(
  x: number,
  y: number,
  areaWidth: number,
  areaHeight: number,
  board: Pick<GameState, 'rowCount' | 'columnCount'>,
  tileSize: number,
): Cell {
  const boardLeft = (areaWidth - board.columnCount * tileSize) / 2;
  const boardTop = (areaHeight - board.rowCount * tileSize) / 2;
  const clamp = (value: number, count: number) => Math.max(0, Math.min(count - 1, Math.floor(value)));
  return {
    row: clamp((y - boardTop) / tileSize, board.rowCount),
    column: clamp((x - boardLeft) / tileSize, board.columnCount),
  };
}
