// Small helpers for cells, directions and door edges.
import type { Cell, Colour, Direction, Door, GameState, Tile } from './types';

const OFFSETS: Record<Direction, Cell> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
};

export function opposite(colour: Colour): Colour {
  return colour === 'black' ? 'white' : 'black';
}

export function step(cell: Cell, dir: Direction): Cell {
  return { row: cell.row + OFFSETS[dir].row, col: cell.col + OFFSETS[dir].col };
}

export function inside(s: Pick<GameState, 'rows' | 'cols'>, c: Cell): boolean {
  return c.row >= 0 && c.row < s.rows && c.col >= 0 && c.col < s.cols;
}

export function tileAt(s: GameState, c: Cell): Tile {
  return s.tiles[c.row * s.cols + c.col];
}

/** The door between `cell` and its neighbour in `dir`, in stored form. */
export function edge(cell: Cell, dir: Direction): Door {
  switch (dir) {
    case 'right':
      return { row: cell.row, col: cell.col, side: 'right' };
    case 'down':
      return { row: cell.row, col: cell.col, side: 'down' };
    case 'left':
      return { row: cell.row, col: cell.col - 1, side: 'right' };
    case 'up':
      return { row: cell.row - 1, col: cell.col, side: 'down' };
  }
}

/** The two cells a door separates (the second may be off the board). */
export function sides(door: Door): [Cell, Cell] {
  const a = { row: door.row, col: door.col };
  return [a, step(a, door.side)];
}

export function sameDoor(a: Door, b: Door): boolean {
  return a.row === b.row && a.col === b.col && a.side === b.side;
}

export function hasDoor(s: GameState, d: Door): boolean {
  return s.doors.some((x) => sameDoor(x, d));
}

/** A door is valid when both sides are on the board and differ in colour. */
export function doorIsValid(s: GameState, d: Door): boolean {
  const [a, b] = sides(d);
  return inside(s, a) && inside(s, b) && tileAt(s, a).colour !== tileAt(s, b).colour;
}
