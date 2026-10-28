// Pure helpers that turn a GameState into what the board draws: the floor
// colour, which tiles are boxes and their shape, which tile edges are doors
// and how big a tile can be. No React here, so Vitest tests it.
import { opposite, sides, tileAt, type Colour, type Direction, type GameState, type Tile } from '../core';
import { EDGE_WIDTH } from './theme';

/**
 * The floor layer is one rectangle in this colour. With two colours it is the
 * one the player is not; a third colour or a neutral floor changes only this.
 */
export function floorColour(state: GameState): Colour {
  return opposite(state.player.colour);
}

/** Boxes are the tiles in the player's colour: the ones that block and can be pushed. */
export function isBox(state: GameState, tile: Tile): boolean {
  return tile.colour === state.player.colour;
}

export interface BoxInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * How far a box sits inside its cell on each side. The floor shows through
 * the gap, which is what outlines a box. On a door side the box reaches the
 * edge so the dotted door sits on it.
 */
export function boxInsets(doorSides: Direction[]): BoxInsets {
  return {
    top: doorSides.includes('up') ? 0 : EDGE_WIDTH,
    right: doorSides.includes('right') ? 0 : EDGE_WIDTH,
    bottom: doorSides.includes('down') ? 0 : EDGE_WIDTH,
    left: doorSides.includes('left') ? 0 : EDGE_WIDTH,
  };
}

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
