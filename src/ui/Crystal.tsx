// The goal, drawn as the Beacon star: a four-point star in the colour the
// player needs to be, on the floor layer or riding inside a box. While the
// player is that colour, its tile is floor and the star sends out two rings.
//
// The rings are a Reanimated CSS animation: a real CSS animation on the web,
// so the browser runs it without any JavaScript per frame, and the UI thread
// runs it on phones. Their opacity reads the board's drawn box colour, which
// changes only at a flip's midpoint, so waking or resting a star redraws
// nothing in React. With reduced motion an awake star shows one still ring.
// Uses react-native-svg.
import { useMemo } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import type { Colour } from '../core';
import { RING_PERIOD } from './motion';
import { beaconStateFor, starPoints } from './pieceLooks';
import { RING_GROWTH, RING_START_RADIUS, RING_WIDTH, STAR_INNER_RADIUS, STAR_OUTER_RADIUS, tileColours } from './theme';
import { drawnColourOf, type DrawnBoxColour } from './useBoxAmounts';

const RING_END_RADIUS = RING_START_RADIUS + RING_GROWTH;
/** A ring is drawn at its largest and scaled, so growing it moves no layout. */
const ringGrowth = {
  from: { opacity: 1, transform: [{ scale: RING_START_RADIUS / RING_END_RADIUS }] },
  to: { opacity: 0, transform: [{ scale: 1 }] },
};

interface CrystalProps {
  size: number;
  colour: Colour; // the colour the player needs to be to reach it
  tileColour: Colour;
  drawnBoxColour: DrawnBoxColour;
}

export function Crystal({ size, colour, tileColour, drawnBoxColour }: CrystalProps) {
  const reducedMotion = useReducedMotion();
  const points = useMemo(() => starPoints(size / 2, size / 2, size * STAR_OUTER_RADIUS, size * STAR_INNER_RADIUS), [size]);
  const awakeStyle = useAnimatedStyle(() => ({
    opacity: beaconStateFor(tileColour, drawnColourOf(drawnBoxColour.value)) === 'awake' ? 1 : 0,
  }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, awakeStyle]}>
        {reducedMotion ? (
          <Ring size={size} colour={colour} still />
        ) : (
          <>
            <Ring size={size} colour={colour} delay={0} />
            <Ring size={size} colour={colour} delay={RING_PERIOD / 2} />
          </>
        )}
      </Animated.View>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Polygon points={points} fill={tileColours[colour]} />
      </Svg>
    </>
  );
}

interface RingProps {
  size: number;
  colour: Colour;
  delay?: number; // when this ring starts its first cycle, in milliseconds
  still?: boolean; // with reduced motion: one faint ring that doesn't grow
}

function Ring({ size, colour, delay = 0, still = false }: RingProps) {
  const diameter = size * RING_END_RADIUS * 2;
  const ringShape = {
    position: 'absolute' as const,
    left: (size - diameter) / 2,
    top: (size - diameter) / 2,
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    // Thicker at full size, so it looks about RING_WIDTH thick in the middle of its growth.
    borderWidth: Math.max(1, (size * RING_WIDTH) / 0.66),
    borderColor: tileColours[colour],
  };
  if (still) return <Animated.View style={[ringShape, { opacity: 0.35, transform: [{ scale: 0.66 }] }]} />;
  return (
    <Animated.View
      style={[
        ringShape,
        {
          opacity: 0,
          animationName: ringGrowth,
          animationDuration: RING_PERIOD,
          animationDelay: delay,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        },
      ]}
    />
  );
}
