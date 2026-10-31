// The touch that moves the player, shared by the touch area under the board
// and the area round the board. A stroke longer than a swipe moves at once and
// keeps moving that way while the finger stays down; dragging a swipe's
// length another way turns it, like a joystick. A finger that rests instead
// walks wherever `restingDirectionAt` says (a tap zone, or a seek) once it has
// rested `restDelay`, following the finger as it moves. A touch that lifts
// before either is a tap.
import { useRef } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import type { Direction } from '../core';
import { swipeDirection, type Command } from './commands';
import { HOLD_FIRST_REPEAT_DELAY } from './motion';
import { useHeldMove } from './useHeldMove';

interface HoldGestureOptions {
  onCommand: (command: Command) => unknown;
  /** Where a finger resting at (x, y) walks, or null for nowhere; asked on every beat. Null turns resting off. */
  restingDirectionAt: ((x: number, y: number) => Direction | null) | null;
  restDelay: number;
  /** Called when the finger lifts; `wasTap` when it neither swiped nor rested long enough to walk. */
  onLift?: (x: number, y: number, wasTap: boolean) => void;
}

export function useHoldGesture(options: HoldGestureOptions) {
  // Read through a ref, so the gesture always uses the latest handlers without being rebuilt.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const { startHold, stopHold, holdHasBeaten } = useHeldMove((command) => optionsRef.current.onCommand(command));
  const touch = useRef({ x: 0, y: 0, anchorX: 0, anchorY: 0, swipedDirection: null as Direction | null });

  return usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onBegin: (panEvent) => {
      touch.current = { x: panEvent.x, y: panEvent.y, anchorX: panEvent.x, anchorY: panEvent.y, swipedDirection: null };
      const { restingDirectionAt, restDelay } = optionsRef.current;
      if (restingDirectionAt) {
        startHold(() => optionsRef.current.restingDirectionAt?.(touch.current.x, touch.current.y) ?? null, restDelay);
      }
    },
    onUpdate: (panEvent) => {
      const currentTouch = touch.current;
      currentTouch.x = panEvent.x;
      currentTouch.y = panEvent.y;
      // Once a resting finger walks, moving it steers that walk instead of swiping.
      if (!currentTouch.swipedDirection && holdHasBeaten()) return;
      const direction = swipeDirection(currentTouch.x - currentTouch.anchorX, currentTouch.y - currentTouch.anchorY);
      if (!direction) return;
      // Turns are measured from the last swipe's length of travel, so a long drag can still turn quickly.
      currentTouch.anchorX = currentTouch.x;
      currentTouch.anchorY = currentTouch.y;
      if (direction === currentTouch.swipedDirection) return;
      currentTouch.swipedDirection = direction;
      stopHold();
      optionsRef.current.onCommand({ type: 'move', direction });
      startHold(() => direction, HOLD_FIRST_REPEAT_DELAY, direction);
    },
    onFinalize: () => {
      const walked = stopHold();
      const { x, y, swipedDirection } = touch.current;
      optionsRef.current.onLift?.(x, y, !walked && !swipedDirection);
    },
  });
}
