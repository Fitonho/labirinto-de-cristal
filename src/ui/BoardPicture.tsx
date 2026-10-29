// A small still picture of a level's start, or of a board as it stands, in
// the screen's palette: the floor, the boxes, the portal seams, the stars and
// the Pebble. Each picture is one SVG of a few shapes (see boardPicture.ts),
// drawn once. Uses react-native-svg.
import { memo, useMemo } from 'react';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import type { GameState, LevelData } from '../core';
import { boardPictureShapesFor, boardPictureShapesForState, pictureTileSizeFor, pictureTileSizeForGrid } from './boardPicture';
import type { BoardPalette } from './theme';

interface BoardPictureProps {
  /** The level whose start is drawn, unless `state` is given. */
  levelData: LevelData;
  /** A board as it stands, drawn instead of the level's start. */
  state?: GameState;
  maxWidth: number;
  maxHeight: number;
  palette: BoardPalette;
}

export const BoardPicture = memo(function BoardPicture({ levelData, state, maxWidth, maxHeight, palette }: BoardPictureProps) {
  const shapes = useMemo(
    () =>
      state
        ? boardPictureShapesForState(state, pictureTileSizeForGrid(state.columnCount, state.rowCount, maxWidth, maxHeight))
        : boardPictureShapesFor(levelData, pictureTileSizeFor(levelData, maxWidth, maxHeight)),
    [levelData, state, maxWidth, maxHeight],
  );
  const { tileColours, seamColour } = palette;
  return (
    <Svg width={shapes.width} height={shapes.height} viewBox={`0 0 ${shapes.width} ${shapes.height}`} accessible={false}>
      <Rect width={shapes.width} height={shapes.height} rx={Math.min(4, shapes.width * 0.04)} fill={tileColours[shapes.floorColour]} />
      <Path d={shapes.boxesPath} fill={tileColours[shapes.boxColour]} />
      {shapes.portalsPath !== '' && (
        <Path d={shapes.portalsPath} stroke={seamColour} strokeWidth={shapes.portalWidth} strokeLinecap="round" fill="none" />
      )}
      {shapes.crystals.map((crystal) => (
        <Polygon key={crystal.points} points={crystal.points} fill={tileColours[crystal.colour]} stroke={seamColour} strokeWidth={0.75} />
      ))}
      <Circle cx={shapes.pebble.centreX} cy={shapes.pebble.centreY} r={shapes.pebble.radius} fill={tileColours[shapes.boxColour]} />
    </Svg>
  );
});
