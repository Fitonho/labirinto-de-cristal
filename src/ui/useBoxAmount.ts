// How much a tile looks like a box: 1 is a box, 0 is a full, square tile,
// which is how floor looks. A flip grows the old boxes into full tiles and
// then shrinks the new boxes out of theirs; undo, restart and a new level
// jump straight to the end. Reanimated skips these animations when the phone
// or browser asks for reduced motion.
import { useEffect } from 'react';
import { Easing, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { FLIP_GROW_DURATION, FLIP_SHRINK_DURATION, type BoardMotion } from './motion';

const grow = { duration: FLIP_GROW_DURATION, easing: Easing.in(Easing.quad) };
const shrink = { duration: FLIP_SHRINK_DURATION, easing: Easing.out(Easing.quad) };

export function useBoxAmount(isBox: boolean, motion: BoardMotion) {
  const boxAmount = useSharedValue(isBox ? 1 : 0);

  useEffect(() => {
    const targetAmount = isBox ? 1 : 0;
    if (motion.flips) {
      // A new box waits as a full tile while the old boxes grow, then shrinks into shape.
      boxAmount.value = isBox ? withSequence(withTiming(0, grow), withTiming(1, shrink)) : withTiming(0, grow);
    } else if (motion.slides || motion.bump) {
      // Finishes a flip that the next move interrupted, from wherever it got to.
      if (boxAmount.value !== targetAmount) boxAmount.value = withTiming(targetAmount, shrink);
    } else {
      boxAmount.value = targetAmount;
    }
  }, [isBox, motion, boxAmount]);

  return boxAmount;
}
