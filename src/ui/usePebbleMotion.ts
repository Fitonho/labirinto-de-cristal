// The Pebble's squish and its eyes. Each move strikes a pose from
// pieceLooks.ts (stretch on a slide, squash on a bump or push, squeeze
// through a door) that ends in the same jelly spring, and the eyes turn the
// way it goes and squint or widen. Everything runs on shared values started
// in a layout effect, so no pose redraws anything in React.
//
// Blinking and the idle glances are started by JavaScript timers that only
// set shared values: between them nothing runs on any thread, so a Pebble at
// rest costs nothing per frame. Every move clears the idle timer and starts it
// again. With reduced motion there is no blinking or glancing, and Reanimated
// jumps the poses to their end.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BLINK_DURATION, BLINK_INTERVAL, IDLE_GLANCE_DELAY } from './motion';
import {
  EYE_SCALES,
  GLANCE_REPEAT,
  isVertical,
  JELLY_SPRING,
  LOOK_AROUND,
  lookFor,
  PEBBLE_POSES,
  signOf,
  STAR_GLANCE_HOLD,
  type EyeLook,
  type Glance,
  type Keyframe,
  type PebbleReaction,
} from './pieceLooks';

/** How fast the eyes turn to a new direction: quicker than the 120 ms slide, so they lead it. */
const EYE_TURN_DURATION = 60;
/** How fast they turn to glance at something while the player rests, and how fast they open after a squint. */
const EYE_GLANCE_DURATION = 150;
const EYE_OPEN_DURATION = 80;

export interface PebbleMotion {
  stretch: SharedValue<number>; // 0 at rest; positive is longer along the move
  vertical: SharedValue<number>; // 1 when the last move was up or down, so the stretch runs top to bottom
  anchor: SharedValue<number>; // -1, 0 or 1: which side stays put while it squashes, or 0 for its centre
  eyeWidth: SharedValue<number>;
  eyeHeight: SharedValue<number>;
  blink: SharedValue<number>; // 1 is shut
  lookX: SharedValue<number>;
  lookY: SharedValue<number>;
}

export function usePebbleMotion(reaction: PebbleReaction, glanceTarget: { lookX: number; lookY: number } | null): PebbleMotion {
  const reducedMotion = useReducedMotion();
  const stretch = useSharedValue(0);
  const vertical = useSharedValue(0);
  const anchor = useSharedValue(0);
  const eyeWidth = useSharedValue(1);
  const eyeHeight = useSharedValue(1);
  const blink = useSharedValue(0);
  const lookX = useSharedValue(1);
  const lookY = useSharedValue(0);
  // The same object on every render, so the memoised body never redraws on a move.
  const pebbleMotion = useMemo(
    () => ({ stretch, vertical, anchor, eyeWidth, eyeHeight, blink, lookX, lookY }),
    [stretch, vertical, anchor, eyeWidth, eyeHeight, blink, lookX, lookY],
  );
  const facing = useRef({ lookX: 1, lookY: 0 });

  // A layout effect starts the pose in the same commit as the move, not a frame later.
  useLayoutEffect(() => {
    const { action, direction } = reaction;
    if (direction) {
      facing.current = lookFor(direction);
      turnEyes(lookX, lookY, facing.current, EYE_TURN_DURATION);
    }
    if (!action || !direction) {
      // Undo, restart or a new level: no pose, eyes open.
      stretch.value = 0;
      eyeWidth.value = 1;
      eyeHeight.value = 1;
      return;
    }
    const pose = PEBBLE_POSES[action];
    vertical.value = isVertical(direction) ? 1 : 0;
    if (pose.uprightAfter !== undefined) vertical.value = withDelay(pose.uprightAfter, withTiming(1, { duration: 0 }));
    anchor.value = pose.anchored ? signOf(direction) : 0;
    const stretchSteps = pose.stretches.map((keyframe) => withTiming(keyframe.to, { duration: keyframe.duration, easing: Easing.out(Easing.quad) }));
    stretch.value = withSequence(...stretchSteps, withSpring(0, JELLY_SPRING));
    // A slide leaves the eyes alone, so it starts no animation for them.
    if (pose.eyeLooks.length > 0) {
      eyeWidth.value = eyeSequence(pose.eyeLooks, 'width');
      eyeHeight.value = eyeSequence(pose.eyeLooks, 'height');
    }
  }, [reaction, stretch, vertical, anchor, eyeWidth, eyeHeight, lookX, lookY]);

  useEffect(() => {
    if (reducedMotion) return;
    const blinkTimer = setInterval(() => {
      blink.value = withSequence(withTiming(1, { duration: BLINK_DURATION / 2 }), withTiming(0, { duration: BLINK_DURATION / 2 }));
    }, BLINK_INTERVAL);
    return () => clearInterval(blinkTimer);
  }, [reducedMotion, blink]);

  // After a pause, glance at the nearest reachable star, or look around when there is none, then look back. The
  // waits are timers, not animation delays, so the eyes cost nothing while they rest. Every move starts the wait again.
  useEffect(() => {
    if (reducedMotion) return;
    const glances: Glance[] = glanceTarget ? [{ look: glanceTarget, hold: STAR_GLANCE_HOLD }] : LOOK_AROUND;
    let glanceIndex = 0;
    let glanceTimer: ReturnType<typeof setTimeout>;
    const nextGlance = () => {
      if (glanceIndex < glances.length) {
        turnEyes(lookX, lookY, glances[glanceIndex].look, EYE_GLANCE_DURATION);
        glanceTimer = setTimeout(nextGlance, glances[glanceIndex].hold);
        glanceIndex += 1;
      } else {
        turnEyes(lookX, lookY, facing.current, EYE_GLANCE_DURATION);
        glanceIndex = 0;
        glanceTimer = setTimeout(nextGlance, GLANCE_REPEAT);
      }
    };
    glanceTimer = setTimeout(nextGlance, IDLE_GLANCE_DELAY);
    return () => clearTimeout(glanceTimer);
  }, [reaction, glanceTarget?.lookX, glanceTarget?.lookY, reducedMotion, lookX, lookY]);

  return pebbleMotion;
}

/** The eyes' width or height through a pose's looks, then open again. */
function eyeSequence(eyeLooks: Keyframe<EyeLook>[], dimension: 'width' | 'height') {
  const steps = eyeLooks.map((keyframe) => withTiming(EYE_SCALES[keyframe.to][dimension], { duration: keyframe.duration }));
  return withSequence(...steps, withTiming(1, { duration: EYE_OPEN_DURATION }));
}

/** Turns the eyes toward a look, unless they already face it: an animation to where they are would still run every frame. */
function turnEyes(lookX: SharedValue<number>, lookY: SharedValue<number>, look: { lookX: number; lookY: number }, duration: number) {
  if (lookX.value !== look.lookX) lookX.value = withTiming(look.lookX, { duration });
  if (lookY.value !== look.lookY) lookY.value = withTiming(look.lookY, { duration });
}
