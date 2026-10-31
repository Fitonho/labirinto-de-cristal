// Seek & hold: which way the Pebble steps toward the tile under the finger.
// It walks the shortest way over floor, never pushing a box or going through a
// portal on its own; it takes any step, push or portal included, only when
// the finger is on the very next tile. Steps are tried with the engine, so
// seek follows the same rules as every other move. No React here, so Vitest
// tests it.
import { DIRECTIONS, move, type Cell, type Direction, type GameState } from '../core';
import { directionBetween } from './motion';

/** The first step toward `target`, or null when the Pebble is already as close as it can walk. */
export function seekDirection(state: GameState, target: Cell): Direction | null {
  const nextToTarget = directionBetween(state.player, target);
  if (nextToTarget) return nextToTarget;

  // Breadth-first over the tiles a plain step reaches, remembering each tile's first step from the Pebble.
  const keyOf = (cell: Cell) => cell.row * state.columnCount + cell.column;
  const firstStepsByTileKey = new Map<number, Direction | null>([[keyOf(state.player), null]]);
  const queue: Cell[] = [{ row: state.player.row, column: state.player.column }];
  const distanceToTarget = (cell: Cell) => Math.abs(cell.row - target.row) + Math.abs(cell.column - target.column);
  let closestCell = queue[0];
  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const cell = queue[queueIndex];
    if (distanceToTarget(cell) < distanceToTarget(closestCell)) closestCell = cell;
    const stateAtCell = { ...state, player: { ...state.player, row: cell.row, column: cell.column } };
    for (const direction of DIRECTIONS) {
      const { state: stateAfter, events } = move(stateAtCell, direction);
      const plainStep = events.some((event) => event.type === 'moved') && !events.some((event) => event.type === 'pushed' || event.type === 'flipped');
      if (!plainStep || firstStepsByTileKey.has(keyOf(stateAfter.player))) continue;
      firstStepsByTileKey.set(keyOf(stateAfter.player), firstStepsByTileKey.get(keyOf(cell)) ?? direction);
      queue.push({ row: stateAfter.player.row, column: stateAfter.player.column });
    }
  }
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
