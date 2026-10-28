// One board tile: its colour, the outline that marks it as solid, dotted door
// edges and its crystal. Drawn with react-native-svg so it looks the same on
// phones and the web.
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
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
}

/** How long the solid outline takes to fade in or out when the player flips colour. */
const OUTLINE_FADE_MILLISECONDS = 250;

export function Tile({ tile, size, left, top, solid, doorSides, showCrystal }: TileProps) {
  // Every tile keeps its outline; only its opacity changes, so a flip fades it.
  const outlineOpacity = useSharedValue(solid ? 1 : 0);
  useEffect(() => {
    outlineOpacity.value = withTiming(solid ? 1 : 0, { duration: OUTLINE_FADE_MILLISECONDS });
  }, [solid, outlineOpacity]);
  const outlineStyle = useAnimatedStyle(() => ({ opacity: outlineOpacity.value }));

  return (
    <View
      testID={`tile-${tile.id}`}
      style={{ position: 'absolute', left, top, width: size, height: size, backgroundColor: tileColours[tile.colour] }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, outlineStyle]}>
        <Svg width={size} height={size}>
          <TileOutline size={size} colour={opposite(tile.colour)} doorSides={doorSides} />
        </Svg>
      </Animated.View>
      {showCrystal && (
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Crystal size={size} colour={opposite(tile.colour)} />
        </Svg>
      )}
    </View>
  );
}

const edgeDirections: Direction[] = ['up', 'right', 'down', 'left'];

function TileOutline({ size, colour, doorSides }: { size: number; colour: Colour; doorSides: Direction[] }) {
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
      {edgeDirections.map((direction) => {
        const [startX, startY, endX, endY] = edgeEnds[direction];
        const isDoor = doorSides.includes(direction);
        return (
          <Line
            key={direction}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={tileColours[colour]}
            strokeWidth={EDGE_WIDTH}
            strokeDasharray={isDoor ? [EDGE_WIDTH, EDGE_WIDTH] : undefined}
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
