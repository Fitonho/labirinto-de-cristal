// One tile of the board, drawn as a box or as floor. A box is inset from its
// cell with rounded corners, so the floor showing between boxes is their
// outline and no seam can open between tiles; a floor tile is a full square in
// the floor colour, invisible on the floor layer. Drawing every tile lets a
// flip turn boxes into floor and back. A box's doors are glowing seams just
// outside it, and they and its crystal move with it when it slides.
//
// A flip animates every tile, so a tile without doors is a plain rounded view
// that only scales; just the few door tiles need an SVG outline. Tiles of one
// colour share their box amount and the board's drawn box colour, so a flip
// changes no props and redraws no tile in React.
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { opposite, type Colour, type Direction, type Tile } from '../core';
import { boxOutline, seamFrame, seamPath } from './boardLayout';
import { Crystal } from './Crystal';
import { BOX_BUMP_DISTANCE, bumpDirectionFor, type BoardMotion } from './motion';
import { BOX_CORNER_RADIUS, BOX_INSET, SEAM_CAP_LENGTH, SEAM_FRAME_WIDTH, SEAM_GLOW, SEAM_OVERLAP, SEAM_WIDTH } from './theme';
import { useAnimatedPosition } from './useAnimatedPosition';
import { drawnColourOf, type DrawnBoxColour } from './useBoxAmounts';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const SVG_MARGIN = 2;

interface BoardTileProps {
  tile: Tile;
  size: number;
  left: number; // the cell's position; the box's own shape comes from boxOutline
  top: number;
  doorSides: Direction[];
  boxAmount: SharedValue<number>; // shared by every tile of this colour: 1 is a box, 0 is floor
  drawnBoxColour: DrawnBoxColour; // boxes sit above floor tiles; during a flip this switches halfway
  tileColours: Record<Colour, string>; // the level's palette
  seamColour: string;
  showCrystal: boolean;
  motion: BoardMotion;
}

/**
 * Most tiles neither move nor bump on a given move, so they skip rendering;
 * the motion only matters to the ones it touches. A flip runs on shared values.
 */
function drawsTheSame(previous: BoardTileProps, next: BoardTileProps): boolean {
  const motionTouchesTile = previous.motion !== next.motion && bumpDirectionFor(next.motion, next.tile.id) !== null;
  return (
    !motionTouchesTile &&
    previous.tile === next.tile &&
    previous.size === next.size &&
    previous.left === next.left &&
    previous.top === next.top &&
    previous.boxAmount === next.boxAmount &&
    previous.drawnBoxColour === next.drawnBoxColour &&
    previous.tileColours === next.tileColours &&
    previous.seamColour === next.seamColour &&
    previous.showCrystal === next.showCrystal &&
    previous.doorSides.join() === next.doorSides.join()
  );
}

export const BoardTile = memo(function BoardTile({
  tile,
  size,
  left,
  top,
  doorSides,
  boxAmount,
  drawnBoxColour,
  tileColours,
  seamColour,
  showCrystal,
  motion,
}: BoardTileProps) {
  const positionStyle = useAnimatedPosition({
    left,
    top,
    motion,
    pieceId: tile.id,
    bumpDistance: size * BOX_BUMP_DISTANCE,
  });
  const tileColour = tile.colour;
  const stackingStyle = useAnimatedStyle(() => ({ zIndex: drawnColourOf(drawnBoxColour.value) === tileColour ? 2 : 0 }));
  return (
    <Animated.View
      testID={`tile-${tile.id}`}
      style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, positionStyle, stackingStyle]}
    >
      {doorSides.length > 0 ? (
        <FlaredShape size={size} doorSides={doorSides} colour={tileColours[tile.colour]} boxAmount={boxAmount} />
      ) : (
        <RoundedShape size={size} colour={tileColours[tile.colour]} boxAmount={boxAmount} />
      )}
      {doorSides.map((doorSide) => (
        <DoorSeam key={doorSide} side={doorSide} size={size} seamColour={seamColour} boxAmount={boxAmount} />
      ))}
      {showCrystal && (
        <Crystal
          size={size}
          colour={opposite(tile.colour)}
          tileColour={tile.colour}
          tileColours={tileColours}
          drawnBoxColour={drawnBoxColour}
        />
      )}
    </Animated.View>
  );
}, drawsTheSame);

interface ShapeProps {
  size: number;
  colour: string;
  boxAmount: SharedValue<number>;
}

/** A tile without doors: a square that scales down into a rounded box. */
function RoundedShape({ size, colour, boxAmount }: ShapeProps) {
  const shapeStyle = useAnimatedStyle(() => {
    const scale = 1 - 2 * BOX_INSET * boxAmount.value;
    // The radius is drawn before scaling, so it is set larger to end up the right size.
    return { transform: [{ scale }], borderRadius: (size * BOX_CORNER_RADIUS * boxAmount.value) / scale };
  });
  return <Animated.View style={[styles.fill, { width: size, height: size, backgroundColor: colour }, shapeStyle]} />;
}

/** A tile with doors: its door sides reach the cell edge and curve out into it, so it needs an SVG outline. */
function FlaredShape({ size, doorSides, colour, boxAmount }: ShapeProps & { doorSides: Direction[] }) {
  // The board builds new arrays on every move; keeping the same one avoids rebuilding the animation.
  const doorSidesKey = doorSides.join();
  const steadyDoorSides = useMemo(() => doorSides, [doorSidesKey]);
  const outlineProps = useAnimatedProps(() => ({ d: boxOutline(size, steadyDoorSides, boxAmount.value) }));
  // The drawing area has a margin all round: Android left a sliver short of a door edge drawn exactly on the
  // right or bottom border of its view.
  return (
    <Svg
      width={size + SVG_MARGIN * 2}
      height={size + SVG_MARGIN * 2}
      style={[styles.fill, { left: -SVG_MARGIN, top: -SVG_MARGIN }]}
    >
      <G x={SVG_MARGIN} y={SVG_MARGIN}>
        <AnimatedPath animatedProps={outlineProps} fill={colour} />
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, left: 0 },
});

/** Which corners of a seam's frame are rounded, and where it pulls back to on a flip. */
const seamShapes: Record<Direction, { roundedCorners: object; transformOrigin: string; scaleAxis: 'scaleX' | 'scaleY' }> = {
  right: {
    roundedCorners: { borderTopRightRadius: SEAM_FRAME_WIDTH, borderBottomRightRadius: SEAM_FRAME_WIDTH },
    transformOrigin: 'left',
    scaleAxis: 'scaleX',
  },
  left: {
    roundedCorners: { borderTopLeftRadius: SEAM_FRAME_WIDTH, borderBottomLeftRadius: SEAM_FRAME_WIDTH },
    transformOrigin: 'right',
    scaleAxis: 'scaleX',
  },
  down: {
    roundedCorners: { borderBottomLeftRadius: SEAM_FRAME_WIDTH, borderBottomRightRadius: SEAM_FRAME_WIDTH },
    transformOrigin: 'top',
    scaleAxis: 'scaleY',
  },
  up: {
    roundedCorners: { borderTopLeftRadius: SEAM_FRAME_WIDTH, borderTopRightRadius: SEAM_FRAME_WIDTH },
    transformOrigin: 'bottom',
    scaleAxis: 'scaleY',
  },
};

/**
 * A door: a half pill along the edge with a soft glow, on the floor side of
 * its box. It pulls back into the edge as its box turns into floor, and comes
 * out as a new box forms.
 */
interface DoorSeamProps {
  side: Direction;
  size: number;
  seamColour: string;
  boxAmount: SharedValue<number>;
}

function DoorSeam({ side, size, seamColour, boxAmount }: DoorSeamProps) {
  const frame = seamFrame(side, size);
  const shape = seamShapes[side];
  const isVertical = side === 'left' || side === 'right';
  const seamStyle = useAnimatedStyle(() => {
    const transform = shape.scaleAxis === 'scaleX' ? [{ scaleX: boxAmount.value }] : [{ scaleY: boxAmount.value }];
    return { opacity: Math.min(1, boxAmount.value * 2), transform };
  });
  // The glow comes from a pill centred on the edge that stops short of the half pill's rounded ends, so it
  // stays hidden under the seam and only its blur shows. The frame cuts off the half on the box side.
  const glowSource = {
    position: 'absolute' as const,
    backgroundColor: seamColour,
    borderRadius: SEAM_WIDTH,
    boxShadow: `0 0 ${SEAM_GLOW}px ${seamColour}`,
    left: isVertical ? (side === 'left' ? SEAM_FRAME_WIDTH - SEAM_WIDTH : SEAM_OVERLAP - SEAM_WIDTH) : SEAM_CAP_LENGTH,
    top: isVertical ? SEAM_CAP_LENGTH : side === 'up' ? SEAM_FRAME_WIDTH - SEAM_WIDTH : SEAM_OVERLAP - SEAM_WIDTH,
    width: isVertical ? SEAM_WIDTH * 2 : size - SEAM_CAP_LENGTH * 2,
    height: isVertical ? size - SEAM_CAP_LENGTH * 2 : SEAM_WIDTH * 2,
  };

  return (
    <View pointerEvents="none" style={[{ position: 'absolute', overflow: 'hidden', ...frame }, shape.roundedCorners]}>
      <Animated.View style={[styles.fill, { width: frame.width, height: frame.height, transformOrigin: shape.transformOrigin }, seamStyle]}>
        <View style={glowSource} />
        <Svg width={frame.width} height={frame.height} style={styles.fill}>
          <Path d={seamPath(side, size)} fill={seamColour} />
        </Svg>
      </Animated.View>
    </View>
  );
}
