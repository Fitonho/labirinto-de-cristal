// How much the tiles of each colour look like boxes: 1 is a box, 0 is a full,
// square tile, which is how floor looks. Every tile of a colour shares one
// value, because a flip turns all of them at once: the old boxes grow into
// full tiles, the floor and player colours swap, then the new boxes shrink out
// of theirs. It all runs on the UI thread, so a flip redraws no tile in React
// and the swap lands on the frame it should. Undo, restart and a new level
// jump straight to the end. Reanimated skips these animations when the phone
// or browser asks for reduced motion.
import { useLayoutEffect } from 'react';
import { Easing, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import type { Colour } from '../core';
import { FLIP_GROW_DURATION, FLIP_SHRINK_DURATION, type BoardMotion } from './motion';

const grow = { duration: FLIP_GROW_DURATION, easing: Easing.in(Easing.quad) };
const shrink = { duration: FLIP_SHRINK_DURATION, easing: Easing.out(Easing.quad) };

/** 1 while white tiles are drawn as boxes, 0 while black ones are: a number, so it can wait for the swap. */
export type DrawnBoxColour = SharedValue<number>;

export function drawnColourOf(drawnBoxColour: number): Colour {
  'worklet';
  return drawnBoxColour >= 0.5 ? 'white' : 'black';
}

export interface BoxAmounts {
  boxAmountsByColour: Record<Colour, SharedValue<number>>;
  drawnBoxColour: DrawnBoxColour;
}

export function useBoxAmounts(playerColour: Colour, motion: BoardMotion): BoxAmounts {
  const blackBoxAmount = useSharedValue(playerColour === 'black' ? 1 : 0);
  const whiteBoxAmount = useSharedValue(playerColour === 'white' ? 1 : 0);
  const drawnBoxColour = useSharedValue(playerColour === 'white' ? 1 : 0);
  const boxAmountsByColour = { black: blackBoxAmount, white: whiteBoxAmount };

  // A layout effect starts the flip in the same commit as the move, not a frame later.
  useLayoutEffect(() => {
    const newBoxAmount = playerColour === 'black' ? blackBoxAmount : whiteBoxAmount;
    const oldBoxAmount = playerColour === 'black' ? whiteBoxAmount : blackBoxAmount;
    const drawnTarget = playerColour === 'white' ? 1 : 0;
    if (motion.flips) {
      // The new boxes wait as full tiles while the old ones grow, then shrink into shape.
      oldBoxAmount.value = withTiming(0, grow);
      newBoxAmount.value = withDelay(FLIP_GROW_DURATION, withTiming(1, shrink));
      drawnBoxColour.value = withDelay(FLIP_GROW_DURATION, withTiming(drawnTarget, { duration: 0 }));
    } else if (!motion.slides && !motion.bump) {
      // Undo, restart or a new level. During play a flip the next move interrupted carries on to the same end.
      newBoxAmount.value = 1;
      oldBoxAmount.value = 0;
      drawnBoxColour.value = drawnTarget;
    }
  }, [playerColour, motion, blackBoxAmount, whiteBoxAmount, drawnBoxColour]);

  return { boxAmountsByColour, drawnBoxColour };
}

