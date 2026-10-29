// The player: the Pebble, a soft blob in its colour with two eyes in the
// floor colour, centred on its cell. It slides from cell to cell and bumps
// when a move goes nowhere, and on top of that it squishes and its eyes react
// (usePebbleMotion). Its colours are the board's drawn box colour, so on a
// flip they swap with the floor halfway through. Once the level is won it
// smiles. The colours come from the level's palette.
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { Colour } from '../core';
import { floorColour } from './boardLayout';
import { PLAYER_BUMP_DISTANCE, type BoardMotion } from './motion';
import { ACROSS_RATIO, type PebbleReaction } from './pieceLooks';
import { PEBBLE_HEIGHT_RATIO, PEBBLE_RADIUS } from './theme';
import { useAnimatedPosition } from './useAnimatedPosition';
import { drawnColourOf, type DrawnBoxColour } from './useBoxAmounts';
import { usePebbleMotion, type PebbleMotion } from './usePebbleMotion';

interface PlayerProps {
  drawnBoxColour: DrawnBoxColour;
  tileColours: Record<Colour, string>;
  tileSize: number;
  left: number; // the cell's position; the Pebble is centred inside it
  top: number;
  motion: BoardMotion;
  reaction: PebbleReaction;
  glanceTarget: { lookX: number; lookY: number } | null; // the nearest reachable star, for idle glances
  won: boolean;
}

export function Player({ drawnBoxColour, tileColours, tileSize, left, top, motion, reaction, glanceTarget, won }: PlayerProps) {
  const radius = tileSize * PEBBLE_RADIUS;
  const bodyWidth = radius * 2;
  const bodyHeight = bodyWidth * PEBBLE_HEIGHT_RATIO;
  const positionStyle = useAnimatedPosition({
    left: left + (tileSize - bodyWidth) / 2,
    top: top + (tileSize - bodyHeight) / 2,
    motion,
    pieceId: 'player',
    bumpDistance: tileSize * PLAYER_BUMP_DISTANCE,
  });
  const pebbleMotion = usePebbleMotion(reaction, glanceTarget);
  return (
    <Animated.View
      testID="player"
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, width: bodyWidth, height: bodyHeight }, positionStyle]}
    >
      <PebbleBody radius={radius} drawnBoxColour={drawnBoxColour} tileColours={tileColours} pebbleMotion={pebbleMotion} won={won} />
    </Animated.View>
  );
}

interface PebbleBodyProps {
  radius: number;
  drawnBoxColour: DrawnBoxColour;
  tileColours: Record<Colour, string>;
  pebbleMotion: PebbleMotion;
  won: boolean;
}

/** The body and eyes. Its props stay the same from move to move, so a move redraws only the Player around it. */
const PebbleBody = memo(function PebbleBody({ radius, drawnBoxColour, tileColours, pebbleMotion, won }: PebbleBodyProps) {
  const { stretch, vertical, anchor, eyeWidth, eyeHeight, blink, lookX, lookY } = pebbleMotion;
  const bodyWidth = radius * 2;
  const bodyHeight = bodyWidth * PEBBLE_HEIGHT_RATIO;
  const squishStyle = useAnimatedStyle(() => {
    const along = 1 + stretch.value;
    const across = 1 - stretch.value * ACROSS_RATIO;
    // Squashing against a wall keeps the side that touches it in place.
    const shift = anchor.value * radius * (1 - along);
    const runsVertically = vertical.value === 1;
    return {
      transform: [
        { translateX: runsVertically ? 0 : shift },
        { translateY: runsVertically ? shift : 0 },
        { scaleX: runsVertically ? across : along },
        { scaleY: runsVertically ? along : across },
      ],
    };
  });
  const bodyColourStyle = useAnimatedStyle(() => {
    const playerColour = drawnColourOf(drawnBoxColour.value);
    return { backgroundColor: tileColours[playerColour], borderColor: tileColours[floorColour(playerColour)] };
  });
  const eyeStyle = useAnimatedStyle(() => ({
    backgroundColor: tileColours[floorColour(drawnColourOf(drawnBoxColour.value))],
    transform: [
      { translateX: lookX.value * radius * 0.3 },
      { translateY: lookY.value * radius * 0.3 },
      { scaleX: eyeWidth.value },
      { scaleY: eyeHeight.value * (1 - 0.83 * blink.value) },
    ],
  }));
  const happyEyeStyle = useAnimatedStyle(() => ({ borderColor: tileColours[floorColour(drawnColourOf(drawnBoxColour.value))] }));

  const eyeHalfWidth = radius * 0.11;
  const eyeHalfHeight = radius * 0.24;
  const eyeCentreTop = bodyHeight / 2 - radius * 0.08;
  const eyeCentreLefts = [bodyWidth / 2 - radius * 0.32, bodyWidth / 2 + radius * 0.32];
  const happyEyeWidth = radius * 0.34;
  const happyEyeThickness = Math.max(1.5, radius * 0.09);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, squishStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: bodyWidth / 2, borderWidth: 1 }, bodyColourStyle]} />
        {eyeCentreLefts.map((eyeCentreLeft) =>
          won ? (
            // Happy closed eyes: an upturned arc.
            <Animated.View
              key={eyeCentreLeft}
              style={[
                styles.happyEye,
                {
                  left: eyeCentreLeft - happyEyeWidth / 2,
                  top: eyeCentreTop - happyEyeWidth / 4,
                  width: happyEyeWidth,
                  height: happyEyeWidth / 2,
                  borderTopLeftRadius: happyEyeWidth / 2,
                  borderTopRightRadius: happyEyeWidth / 2,
                  borderTopWidth: happyEyeThickness,
                  borderLeftWidth: happyEyeThickness,
                  borderRightWidth: happyEyeThickness,
                },
                happyEyeStyle,
              ]}
            />
          ) : (
            <View key={eyeCentreLeft} style={[styles.eyeFrame, { left: eyeCentreLeft - eyeHalfWidth, top: eyeCentreTop - eyeHalfHeight }]}>
              <Animated.View style={[{ width: eyeHalfWidth * 2, height: eyeHalfHeight * 2, borderRadius: eyeHalfWidth }, eyeStyle]} />
            </View>
          ),
        )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  eyeFrame: { position: 'absolute' },
  happyEye: { position: 'absolute', borderBottomWidth: 0 },
});
