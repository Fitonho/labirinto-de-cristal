// Pure helpers that turn a GameState into what the board draws: the floor
// colour, which tiles are boxes and their outline, which tile edges are doors
// and how big a tile can be. No React here, so Vitest tests it.
import { opposite, sides, type Colour, type Direction, type GameState, type Tile } from '../core';
import { BOX_CORNER_RADIUS, BOX_INSET, DOOR_FLARE_LENGTH, SEAM_CAP_LENGTH, SEAM_FRAME_WIDTH, SEAM_OVERLAP, SEAM_WIDTH } from './theme';

/**
 * The floor layer is one rectangle in this colour. With two colours it is the
 * one the boxes are not; a third colour or a neutral floor changes only this.
 */
export function floorColour(boxColour: Colour): Colour {
  return opposite(boxColour);
}

/** Boxes are the tiles in the player's colour: the ones that block and can be pushed. */
export function isBox(state: GameState, tile: Tile): boolean {
  return tile.colour === state.player.colour;
}

/**
 * The sides of each tile that are doors, by tile index. A door belongs to the
 * edge, so both tiles beside it list it; only the one drawn as a box shows it.
 */
export function doorSidesByTileIndex(state: GameState): Map<number, Direction[]> {
  const doorSides = new Map<number, Direction[]>();
  const addSide = (cell: { row: number; column: number }, side: Direction) => {
    const tileIndex = cell.row * state.columnCount + cell.column;
    doorSides.set(tileIndex, [...(doorSides.get(tileIndex) ?? []), side]);
  };
  for (const door of state.doors) {
    const [firstCell, secondCell] = sides(door);
    addSide(firstCell, door.side);
    addSide(secondCell, door.side === 'right' ? 'left' : 'up');
  }
  return doorSides;
}

interface BoxCorner {
  cornerX: number; // the cell's corner, as a share of the tile size
  cornerY: number;
  alongX: number; // the way the outline runs into the corner
  alongY: number;
  nextX: number; // the way it runs out of the corner
  nextY: number;
  sideBefore: Direction;
  sideAfter: Direction;
}

/** The four corners of a cell, clockwise from the top right. */
const BOX_CORNERS: BoxCorner[] = [
  { cornerX: 1, cornerY: 0, alongX: 1, alongY: 0, nextX: 0, nextY: 1, sideBefore: 'up', sideAfter: 'right' },
  { cornerX: 1, cornerY: 1, alongX: 0, alongY: 1, nextX: -1, nextY: 0, sideBefore: 'right', sideAfter: 'down' },
  { cornerX: 0, cornerY: 1, alongX: -1, alongY: 0, nextX: 0, nextY: -1, sideBefore: 'down', sideAfter: 'left' },
  { cornerX: 0, cornerY: 0, alongX: 0, alongY: -1, nextX: 1, nextY: 0, sideBefore: 'left', sideAfter: 'up' },
];

/**
 * A tile's outline as an SVG path. `boxAmount` 1 is a box: inset from its
 * cell with rounded corners, except that a door side reaches the whole cell
 * edge and the box's sides curve outward into it. 0 is the full, square cell,
 * which is how a floor tile looks and where a flip passes through. Runs on the
 * UI thread while a flip animates.
 */
export function boxOutline(size: number, doorSides: Direction[], boxAmount: number): string {
  'worklet';
  const inset = size * BOX_INSET * boxAmount;
  const cornerRadius = size * BOX_CORNER_RADIUS * boxAmount;
  const flareLength = size * DOOR_FLARE_LENGTH * boxAmount;
  const pointText = (pointX: number, pointY: number) => `${pointX.toFixed(2)} ${pointY.toFixed(2)}`;
  const segments: string[] = [];
  for (const corner of BOX_CORNERS) {
    const cornerX = corner.cornerX * size;
    const cornerY = corner.cornerY * size;
    const beforeIsDoor = doorSides.includes(corner.sideBefore);
    const afterIsDoor = doorSides.includes(corner.sideAfter);
    // Where the two sides meet once each is pushed into the cell by its inset.
    const innerX = cornerX + corner.nextX * (beforeIsDoor ? 0 : inset) - corner.alongX * (afterIsDoor ? 0 : inset);
    const innerY = cornerY + corner.nextY * (beforeIsDoor ? 0 : inset) - corner.alongY * (afterIsDoor ? 0 : inset);
    let segment: string;
    if (beforeIsDoor && afterIsDoor) {
      segment = `${pointText(cornerX, cornerY)} Q${pointText(cornerX, cornerY)} ${pointText(cornerX, cornerY)}`;
    } else if (beforeIsDoor) {
      // Leaving a door side: curve from the cell corner back in to the inset side.
      segment = `${pointText(cornerX, cornerY)} Q${pointText(innerX, innerY)} ${pointText(innerX + corner.nextX * flareLength, innerY + corner.nextY * flareLength)}`;
    } else if (afterIsDoor) {
      // Reaching a door side: curve out from the inset side to the cell corner.
      segment = `${pointText(innerX - corner.alongX * flareLength, innerY - corner.alongY * flareLength)} Q${pointText(innerX, innerY)} ${pointText(cornerX, cornerY)}`;
    } else {
      segment = `${pointText(innerX - corner.alongX * cornerRadius, innerY - corner.alongY * cornerRadius)} Q${pointText(innerX, innerY)} ${pointText(innerX + corner.nextX * cornerRadius, innerY + corner.nextY * cornerRadius)}`;
    }
    segments.push((segments.length === 0 ? 'M' : 'L') + segment);
  }
  return `${segments.join(' ')} Z`;
}

export interface SeamFrame {
  left: number; // relative to the tile the door belongs to
  top: number;
  width: number;
  height: number;
}

/**
 * A door's seam is drawn just outside its box, on the floor side of the edge,
 * inside a frame one cell long so its glow can't spill past the cell corners.
 * The frame starts a pixel inside the box, so the seam always touches it.
 */
export const seamFrameThickness = SEAM_FRAME_WIDTH + SEAM_OVERLAP;

export function seamFrame(side: Direction, size: number): SeamFrame {
  const frames: Record<Direction, SeamFrame> = {
    right: { left: size - SEAM_OVERLAP, top: 0, width: seamFrameThickness, height: size },
    left: { left: -SEAM_FRAME_WIDTH, top: 0, width: seamFrameThickness, height: size },
    down: { left: 0, top: size - SEAM_OVERLAP, width: size, height: seamFrameThickness },
    up: { left: 0, top: -SEAM_FRAME_WIDTH, width: size, height: seamFrameThickness },
  };
  return frames[side];
}

/**
 * The seam's visible half as an SVG path in its frame: a half pill along the
 * door edge, rounded at both ends on the floor side.
 */
export function seamPath(side: Direction, size: number): string {
  // Points are given as (distance along the edge, distance out from the frame's box side) and turned into frame coordinates.
  const pillThickness = SEAM_OVERLAP + SEAM_WIDTH;
  const framePoint = (alongEdge: number, outFromEdge: number): string => {
    const points: Record<Direction, [number, number]> = {
      right: [outFromEdge, alongEdge],
      left: [seamFrameThickness - outFromEdge, alongEdge],
      down: [alongEdge, outFromEdge],
      up: [alongEdge, seamFrameThickness - outFromEdge],
    };
    return points[side].join(' ');
  };
  return [
    `M${framePoint(0, 0)}`,
    `Q${framePoint(0, pillThickness)} ${framePoint(SEAM_CAP_LENGTH, pillThickness)}`,
    `L${framePoint(size - SEAM_CAP_LENGTH, pillThickness)}`,
    `Q${framePoint(size, pillThickness)} ${framePoint(size, 0)}`,
    'Z',
  ].join(' ');
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
