// Small helpers for cells, directions and portal edges.
import type { Cell, Colour, Direction, Portal, GameState, Tile } from './types';

const OFFSETS: Record<Direction, Cell> = {
  up: { row: -1, column: 0 },
  right: { row: 0, column: 1 },
  down: { row: 1, column: 0 },
  left: { row: 0, column: -1 },
};

export function opposite(colour: Colour): Colour {
  return colour === 'black' ? 'white' : 'black';
}

export function neighbour(cell: Cell, direction: Direction): Cell {
  return { row: cell.row + OFFSETS[direction].row, column: cell.column + OFFSETS[direction].column };
}

export function inside(board: Pick<GameState, 'rowCount' | 'columnCount'>, cell: Cell): boolean {
  return cell.row >= 0 && cell.row < board.rowCount && cell.column >= 0 && cell.column < board.columnCount;
}

export function tileIndex(board: Pick<GameState, 'columnCount'>, cell: Cell): number {
  return cell.row * board.columnCount + cell.column;
}

export function tileAt(state: GameState, cell: Cell): Tile {
  return state.tiles[tileIndex(state, cell)];
}

/** The portal between `cell` and its neighbour in `direction`, in stored form. */
export function edge(cell: Cell, direction: Direction): Portal {
  switch (direction) {
    case 'right':
      return { row: cell.row, column: cell.column, side: 'right' };
    case 'down':
      return { row: cell.row, column: cell.column, side: 'down' };
    case 'left':
      return { row: cell.row, column: cell.column - 1, side: 'right' };
    case 'up':
      return { row: cell.row - 1, column: cell.column, side: 'down' };
  }
}

/** The two cells a portal separates (the second may be off the board). */
export function sides(portal: Portal): [Cell, Cell] {
  const firstCell = { row: portal.row, column: portal.column };
  return [firstCell, neighbour(firstCell, portal.side)];
}

export function samePortal(firstPortal: Portal, secondPortal: Portal): boolean {
  return firstPortal.row === secondPortal.row && firstPortal.column === secondPortal.column && firstPortal.side === secondPortal.side;
}

export function hasPortal(state: GameState, portal: Portal): boolean {
  return state.portals.some((existingPortal) => samePortal(existingPortal, portal));
}

/** A portal is valid when both sides are on the board and differ in colour. */
export function portalIsValid(state: GameState, portal: Portal): boolean {
  const [firstCell, secondCell] = sides(portal);
  return (
    inside(state, firstCell) &&
    inside(state, secondCell) &&
    tileAt(state, firstCell).colour !== tileAt(state, secondCell).colour
  );
}
