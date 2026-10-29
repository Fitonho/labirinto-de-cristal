// The touch area under the board. A swipe anywhere in it moves the player,
// and with tap moves on, a tap moves toward the side it lands on: the two
// diagonals split the area into four triangles, drawn faintly with an arrow
// in each. A tap counts when the finger lifts, so a tap and a swipe can share
// the space. Its colours follow the level's palette.
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, useCompetingGestures, useTapGesture } from 'react-native-gesture-handler';
import Svg, { Line, Polygon } from 'react-native-svg';
import { MIN_SWIPE_PIXELS, tapDirection, type Command } from './commands';
import { useAppColours } from './AppColours';
import { useSwipeGesture } from './useSwipeGesture';

interface TouchPadProps {
  tapMovesOn: boolean;
  /** Shown in the middle until the first move of a level. */
  hint: string | null;
  label: string;
  onCommand: (command: Command) => void;
}

/** How far each arrow sits from its edge, as a share of the distance from the edge to the centre. */
const ARROW_INSET = 0.3;
const ARROW_SIZE = 9;

export function TouchPad({ tapMovesOn, hint, label, onCommand }: TouchPadProps) {
  const appColours = useAppColours();
  const padColours = useMemo(
    () => ({
      pad: { borderColor: appColours.touchPadLine, backgroundColor: appColours.touchPadFill },
      hint: { color: appColours.quiet, backgroundColor: appColours.page },
    }),
    [appColours],
  );
  const [padSize, setPadSize] = useState({ width: 0, height: 0 });
  // The tap reads the size from a ref, so it always uses the latest layout.
  const padSizeRef = useRef(padSize);
  const onLayout = useCallback((layoutEvent: LayoutChangeEvent) => {
    const { width, height } = layoutEvent.nativeEvent.layout;
    padSizeRef.current = { width, height };
    setPadSize({ width, height });
  }, []);
  const tap = useTapGesture({
    runOnJS: true,
    enabled: tapMovesOn,
    // Further than a swipe needs, and it is a swipe, not a tap.
    maxDistance: MIN_SWIPE_PIXELS,
    onActivate: (tapEvent) => {
      const direction = tapDirection(tapEvent.x, tapEvent.y, padSizeRef.current.width, padSizeRef.current.height);
      if (direction) onCommand({ type: 'move', direction });
    },
  });
  const swipe = useSwipeGesture(onCommand);
  const gestures = useCompetingGestures(tap, swipe);

  const { width, height } = padSize;
  const centreX = width / 2;
  const centreY = height / 2;
  const arrows = [
    { x: centreX, y: centreY * ARROW_INSET, rotation: 0 },
    { x: width - centreX * ARROW_INSET, y: centreY, rotation: 90 },
    { x: centreX, y: height - centreY * ARROW_INSET, rotation: 180 },
    { x: centreX * ARROW_INSET, y: centreY, rotation: 270 },
  ];
  return (
    <GestureDetector gesture={gestures}>
      <View
        accessibilityLabel={label}
        onLayout={onLayout}
        style={[styles.pad, padColours.pad]}
      >
        {tapMovesOn && width > 0 && (
          <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line x1={0} y1={0} x2={width} y2={height} stroke={appColours.touchPadLine} strokeWidth={1} />
            <Line x1={width} y1={0} x2={0} y2={height} stroke={appColours.touchPadLine} strokeWidth={1} />
            {arrows.map((arrow) => (
              <Polygon
                key={arrow.rotation}
                points={`0,${-ARROW_SIZE} ${ARROW_SIZE},${ARROW_SIZE * 0.6} ${-ARROW_SIZE},${ARROW_SIZE * 0.6}`}
                fill={appColours.touchPadArrow}
                transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.rotation})`}
              />
            ))}
          </Svg>
        )}
        {hint && (
          <Text pointerEvents="none" style={[styles.hint, padColours.hint]}>
            {hint}
          </Text>
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  pad: {
    flex: 1,
    minHeight: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // In the centre, where the diagonals cross and a tap does nothing anyway.
  hint: { fontSize: 14, textAlign: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
});
