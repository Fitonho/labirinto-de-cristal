// One tile of the board, drawn as a box or as floor. A box is inset from its
// cell with rounded corners, so the floor showing between boxes is their
// outline and no seam can open between tiles; a floor tile is a full square in
// the floor colour, invisible on the floor layer. Drawing every tile lets a
// flip turn boxes into floor and back. A box's doors are glowing seams just
// outside it, and they and its crystal move with it when it slides.
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { opposite, type Direction, type Tile } from '../core';
import { boxOutline, seamFrame, seamPath } from './boardLayout';
import { Crystal } from './Crystal';
import { BOX_BUMP_DISTANCE, type BoardMotion } from './motion';
import { SEAM_CAP_LENGTH, SEAM_FRAME_WIDTH, SEAM_GLOW, SEAM_WIDTH, seamColour, tileColours } from './theme';
import { useAnimatedPosition } from './useAnimatedPosition';
import { useBoxAmount } from './useBoxAmount';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface BoardTileProps {
  tile: Tile;
  size: number;
  left: number; // the cell's position; the box's own shape comes from boxOutline
  top: number;
  doorSides: Direction[];
  isBox: boolean; // what the tile is after this move
  isDrawnAbove: boolean; // boxes sit above floor tiles; during a flip this switches halfway
  showCrystal: boolean;
  motion: BoardMotion;
}

export function BoardTile({ tile, size, left, top, doorSides, isBox, isDrawnAbove, showCrystal, motion }: BoardTileProps) {
  const positionStyle = useAnimatedPosition({
    left,
    top,
    motion,
    pieceId: tile.id,
    bumpDistance: size * BOX_BUMP_DISTANCE,
  });
  const boxAmount = useBoxAmount(isBox, motion);
  const outlineProps = useAnimatedProps(() => ({ d: boxOutline(size, doorSides, boxAmount.value) }));
  return (
    <Animated.View
      testID={isBox ? `box-${tile.id}` : `floor-${tile.id}`}
      style={[{ position: 'absolute', width: size, height: size, zIndex: isDrawnAbove ? 2 : 0 }, positionStyle]}
    >
      <Svg width={size} height={size} style={styles.fill}>
        <AnimatedPath animatedProps={outlineProps} fill={tileColours[tile.colour]} />
      </Svg>
      {doorSides.map((doorSide) => (
        <DoorSeam key={doorSide} side={doorSide} size={size} boxAmount={boxAmount} />
      ))}
      {showCrystal && <Crystal size={size} colour={opposite(tile.colour)} />}
    </Animated.View>
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
function DoorSeam({ side, size, boxAmount }: { side: Direction; size: number; boxAmount: SharedValue<number> }) {
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
    left: isVertical ? (side === 'left' ? SEAM_FRAME_WIDTH - SEAM_WIDTH : -SEAM_WIDTH) : SEAM_CAP_LENGTH,
    top: isVertical ? SEAM_CAP_LENGTH : side === 'up' ? SEAM_FRAME_WIDTH - SEAM_WIDTH : -SEAM_WIDTH,
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
