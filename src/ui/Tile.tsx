// One board tile: its colour, the outline that marks it as solid, dotted door
// edges and its crystal. The outline is the tile's background with the fill
// as a smaller view on top. Plain rectangles snap to whole screen pixels;
// borders and vector lines did not, and left a thin seam between tiles.
// Dots and the crystal use react-native-svg.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Line, Polygon } from 'react-native-svg';
import { opposite, type Colour, type Direction, type Tile as TileData } from '../core';
import { EDGE_WIDTH, tileColours } from './theme';

interface TileProps {
  tile: TileData;
  size: number;
  left: number;
  top: number;
  solid: boolean; // the player's colour, so it blocks and can be pushed
  doorSides: Direction[];
  showCrystal: boolean;
  overlap: number; // drawn this much past its right and bottom edges, under the next tile
}

/** How long the solid outline takes to fade in or out when the player flips colour. */
const OUTLINE_FADE_MILLISECONDS = 250;

const fillInsetKeys = { up: 'top', right: 'right', down: 'bottom', left: 'left' } as const;

/** The fill covers the tile except an outline band; door sides have no band, their dots are drawn on top. */
function fillInsets(doorSides: Direction[], overlap: number) {
  const insets = { top: EDGE_WIDTH, right: EDGE_WIDTH + overlap, bottom: EDGE_WIDTH + overlap, left: EDGE_WIDTH };
  for (const doorSide of doorSides) insets[fillInsetKeys[doorSide]] -= EDGE_WIDTH;
  return insets;
}

export function Tile({ tile, size, left, top, solid, doorSides, showCrystal, overlap }: TileProps) {
  // 0 paints the outline band in the tile's own colour, 1 in the outline colour; a flip fades between them.
  const outlineProgress = useSharedValue(solid ? 1 : 0);
  useEffect(() => {
    outlineProgress.value = withTiming(solid ? 1 : 0, { duration: OUTLINE_FADE_MILLISECONDS });
  }, [solid, outlineProgress]);

  const fillColour = tileColours[tile.colour];
  const outlineColour = tileColours[opposite(tile.colour)];
  const outlineStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(outlineProgress.value, [0, 1], [fillColour, outlineColour]),
  }));
  const doorStyle = useAnimatedStyle(() => ({ opacity: outlineProgress.value }));

  return (
    <Animated.View testID={`tile-${tile.id}`} style={[{ position: 'absolute', left, top, width: size + overlap, height: size + overlap }, outlineStyle]}>
      <View style={[styles.layer, fillInsets(doorSides, overlap), { backgroundColor: fillColour }]} />
      {doorSides.length > 0 && (
        <Animated.View style={[styles.layer, doorStyle]}>
          <Svg width={size} height={size}>
            <DoorEdges size={size} colour={opposite(tile.colour)} doorSides={doorSides} />
          </Svg>
        </Animated.View>
      )}
      {showCrystal && (
        <Svg width={size} height={size} style={styles.layer}>
          <Crystal size={size} colour={opposite(tile.colour)} />
        </Svg>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});

function DoorEdges({ size, colour, doorSides }: { size: number; colour: Colour; doorSides: Direction[] }) {
  const inset = EDGE_WIDTH / 2;
  const far = size - inset;
  const edgeEnds: Record<Direction, [number, number, number, number]> = {
    up: [0, inset, size, inset],
    right: [far, 0, far, size],
    down: [0, far, size, far],
    left: [inset, 0, inset, size],
  };
  return (
    <>
      {doorSides.map((doorSide) => {
        const [startX, startY, endX, endY] = edgeEnds[doorSide];
        return (
          <Line
            key={doorSide}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={tileColours[colour]}
            strokeWidth={EDGE_WIDTH}
            strokeDasharray={[EDGE_WIDTH, EDGE_WIDTH]}
          />
        );
      })}
    </>
  );
}

/** The crystal is drawn in the colour the player needs to be to reach it. */
function Crystal({ size, colour }: { size: number; colour: Colour }) {
  const centre = size / 2;
  const reach = size * 0.28;
  const points = [
    `${centre},${centre - reach}`,
    `${centre + reach},${centre}`,
    `${centre},${centre + reach}`,
    `${centre - reach},${centre}`,
  ].join(' ');
  return <Polygon points={points} fill={tileColours[colour]} />;
}
