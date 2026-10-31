// The area round the board, the board included. A finger that rests here walks
// the Pebble toward the tile under it (seek & hold), following the finger as
// it moves; outside the board it counts as the nearest edge tile. A thin ring
// marks that tile while seeking, since the finger covers it. A quick stroke
// is a swipe instead, held or not.
import { useCallback, useRef, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useStore } from 'react-redux';
import type { RootState } from '../state/store';
import type { Command } from './commands';
import { SEEK_START_DELAY } from './motion';
import { cellAtPoint, seekDirection } from './seek';
import { useHoldGesture } from './useHoldGesture';

interface SeekAreaProps {
  tileSize: number;
  /** The portal seam's glow colour, which stands out on both tile colours. */
  ringColour: string;
  onCommand: (command: Command) => unknown;
  children: ReactNode;
}

/** How far the ring sits inside its tile, as a share of the tile size. */
const RING_INSET = 0.08;

export function SeekArea({ tileSize, ringColour, onCommand, children }: SeekAreaProps) {
  const store = useStore<RootState>();
  const areaSizeRef = useRef({ width: 0, height: 0 });
  const onLayout = useCallback((layoutEvent: LayoutChangeEvent) => {
    const { width, height } = layoutEvent.nativeEvent.layout;
    areaSizeRef.current = { width, height };
  }, []);
  // The ring moves on the UI thread, so following the finger redraws nothing else.
  const ringLeft = useSharedValue(0);
  const ringTop = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const ringStyle = useAnimatedStyle(() => ({ left: ringLeft.value, top: ringTop.value, opacity: ringOpacity.value }));

  const tileSizeRef = useRef(tileSize);
  tileSizeRef.current = tileSize;
  const seekDirectionAt = useCallback(
    (x: number, y: number) => {
      const state = store.getState().game.history.present;
      const { width, height } = areaSizeRef.current;
      const size = tileSizeRef.current;
      const target = cellAtPoint(x, y, width, height, state, size);
      ringLeft.value = (width - state.columnCount * size) / 2 + target.column * size;
      ringTop.value = (height - state.rowCount * size) / 2 + target.row * size;
      ringOpacity.value = 1;
      return seekDirection(state, target);
    },
    [store, ringLeft, ringTop, ringOpacity],
  );
  const gesture = useHoldGesture({
    onCommand,
    restingDirectionAt: seekDirectionAt,
    restDelay: SEEK_START_DELAY,
    onLift: () => {
      ringOpacity.value = 0;
    },
  });

  const ringSize = tileSize * (1 - RING_INSET * 2);
  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.area} onLayout={onLayout}>
        {children}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: ringSize, height: ringSize, marginLeft: tileSize * RING_INSET, marginTop: tileSize * RING_INSET, borderColor: ringColour },
            ringStyle,
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 3 },
});
