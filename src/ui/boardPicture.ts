// A level's start drawn small, for the levels screens: one floor rectangle,
// one path for every box, one for every door and a star per crystal. A
// picture is a handful of SVG shapes whatever the board's size, so a screen
// of them stays cheap. No React here, so Vitest tests it.
import { loadLevel, opposite, type Colour, type LevelData } from '../core';
import { starPoints } from './pieceLooks';
import { BOX_CORNER_RADIUS, BOX_INSET, PEBBLE_RADIUS, STAR_INNER_RADIUS, STAR_OUTER_RADIUS } from './theme';

export interface BoardPictureShapes {
  width: number;
  height: number;
  floorColour: Colour;
  boxColour: Colour;
  /** Every box as a rounded square, in one path. */
  boxesPath: string;
  /** Every door as a line on its edge, in one path. */
  doorsPath: string;
  doorWidth: number;
  crystals: { points: string; colour: Colour }[];
  pebble: { centreX: number; centreY: number; radius: number };
}

/** A rounded square as a path, starting after its top-left corner. */
function roundedSquarePath(left: number, top: number, size: number, cornerRadius: number): string {
  const right = left + size;
  const bottom = top + size;
  return (
    `M${left + cornerRadius} ${top}H${right - cornerRadius}Q${right} ${top} ${right} ${top + cornerRadius}` +
    `V${bottom - cornerRadius}Q${right} ${bottom} ${right - cornerRadius} ${bottom}` +
    `H${left + cornerRadius}Q${left} ${bottom} ${left} ${bottom - cornerRadius}` +
    `V${top + cornerRadius}Q${left} ${top} ${left + cornerRadius} ${top}Z`
  );
}

/** The largest whole tile size that fits the level in the box, but at least 2. */
export function pictureTileSizeFor(levelData: LevelData, maxWidth: number, maxHeight: number): number {
  const columnCount = levelData.grid[0].split(' ').length;
  return Math.max(2, Math.floor(Math.min(maxWidth / columnCount, maxHeight / levelData.grid.length)));
}

export function boardPictureShapesFor(levelData: LevelData, tileSize: number): BoardPictureShapes {
  const state = loadLevel(levelData);
  const boxColour = state.player.colour;
  const inset = tileSize * BOX_INSET;
  const boxSize = tileSize - 2 * inset;
  const boxPaths: string[] = [];
  const crystals: BoardPictureShapes['crystals'] = [];
  state.tiles.forEach((tile, tileIndex) => {
    const left = (tileIndex % state.columnCount) * tileSize;
    const top = Math.floor(tileIndex / state.columnCount) * tileSize;
    if (tile.colour === boxColour) boxPaths.push(roundedSquarePath(left + inset, top + inset, boxSize, boxSize * BOX_CORNER_RADIUS));
    if (tile.goal) {
      const centreX = left + tileSize / 2;
      const centreY = top + tileSize / 2;
      // Below about 8 points a star is a blur; it still shows as a dot of its colour.
      const innerRadius = tileSize < 8 ? tileSize * 0.25 : tileSize * STAR_INNER_RADIUS;
      crystals.push({ points: starPoints(centreX, centreY, tileSize * STAR_OUTER_RADIUS * 1.3, innerRadius), colour: opposite(tile.colour) });
    }
  });
  const doorsPath = state.doors
    .map((door) => {
      const left = door.column * tileSize;
      const top = door.row * tileSize;
      return door.side === 'right' ? `M${left + tileSize} ${top}V${top + tileSize}` : `M${left} ${top + tileSize}H${left + tileSize}`;
    })
    .join('');
  return {
    width: state.columnCount * tileSize,
    height: state.rowCount * tileSize,
    floorColour: opposite(boxColour),
    boxColour,
    boxesPath: boxPaths.join(''),
    doorsPath,
    doorWidth: Math.max(1.5, tileSize * 0.14),
    crystals,
    pebble: {
      centreX: (state.player.column + 0.5) * tileSize,
      centreY: (state.player.row + 0.5) * tileSize,
      radius: Math.max(1, tileSize * PEBBLE_RADIUS),
    },
  };
}
