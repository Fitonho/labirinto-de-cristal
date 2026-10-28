// Pure helpers that turn a GameState into what the board draws: which tile
// edges are doors and how big a tile can be. No React here, so Vitest tests it.
import { sides, tileAt, type Direction, type GameState } from '../core';

/**
 * Doors are drawn on the side that is the player's colour, as dotted edges of
 * that tile. Returns the dotted sides for each tile index that has any.
 */
export function doorSidesByTileIndex(state: GameState): Map<number, Direction[]> {
  const doorSides = new Map<number, Direction[]>();
  for (const door of state.doors) {
    const [firstCell, secondCell] = sides(door);
    const firstIsPlayersColour = tileAt(state, firstCell).colour === state.player.colour;
    const drawnCell = firstIsPlayersColour ? firstCell : secondCell;
    const drawnSide: Direction = firstIsPlayersColour ? door.side : door.side === 'right' ? 'left' : 'up';
    const drawnTileIndex = drawnCell.row * state.columnCount + drawnCell.column;
    doorSides.set(drawnTileIndex, [...(doorSides.get(drawnTileIndex) ?? []), drawnSide]);
  }
  return doorSides;
}

export const MAX_TILE_SIZE = 56;

/**
 * Tiles fill the width on phones, keep the board under 65% of the height, and
 * stop at 56 points. The size is also a whole number of screen pixels: phones
 * round each tile's position to pixels, and a fractional size left a one-pixel
 * gap between some rows.
 */
export function tileSizeFor(
  board: Pick<GameState, 'rowCount' | 'columnCount'>,
  screenWidth: number,
  screenHeight: number,
  pixelRatio = 1,
): number {
  const sizeByWidth = (screenWidth - 32) / board.columnCount;
  const sizeByHeight = (screenHeight * 0.65) / board.rowCount;
  const size = Math.min(MAX_TILE_SIZE, sizeByWidth, sizeByHeight);
  return Math.floor(size * pixelRatio) / pixelRatio;
}
