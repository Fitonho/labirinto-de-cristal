// Moves a piece (the player or a box) to its cell on the board: a slide after
// a move, a jump after undo, restart or a new level, and a short bump out and
// back when the move went nowhere. Reanimated skips these animations when the
// phone or browser asks for reduced motion, so pieces then jump into place.
//
// The piece is drawn at the board's corner and moved by a transform, never by
// left and top: those are layout, and animating them recalculates the layout
// on every frame.
import { useLayoutEffect, useRef } from 'react';
import { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import {
  BUMP_BACK_DURATION,
  BUMP_OUT_DURATION,
  bumpDirectionFor,
  bumpOffset,
  SLIDE_DURATION,
  type BoardMotion,
  type PieceId,
} from './motion';

interface PiecePosition {
  left: number;
  top: number;
  motion: BoardMotion; // a new object for every action, so a repeated bump plays again
  pieceId: PieceId;
  bumpDistance: number; // in points
}

export function useAnimatedPosition({ left, top, motion, pieceId, bumpDistance }: PiecePosition) {
  const animatedLeft = useSharedValue(left);
  const animatedTop = useSharedValue(top);
  const restingPosition = useRef({ left, top });

  // A layout effect starts the slide in the same commit as the move, not a frame later.
  useLayoutEffect(() => {
    const bumpDirection = bumpDirectionFor(motion, pieceId);
    // Most pieces stay put on a move; starting no animation for them keeps a big board quick on phones.
    const stays = left === restingPosition.current.left && top === restingPosition.current.top;
    restingPosition.current = { left, top };
    if (stays && !bumpDirection) return;
    if (bumpDirection) {
      const { offsetLeft, offsetTop } = bumpOffset(bumpDirection, bumpDistance);
      const bump = (restingValue: number, offset: number) =>
        withSequence(
          withTiming(restingValue + offset, { duration: BUMP_OUT_DURATION, easing: Easing.out(Easing.quad) }),
          withTiming(restingValue, { duration: BUMP_BACK_DURATION, easing: Easing.inOut(Easing.quad) }),
        );
      animatedLeft.value = bump(left, offsetLeft);
      animatedTop.value = bump(top, offsetTop);
    } else if (motion.slides) {
      // Starts from wherever the piece is drawn now, so a swipe mid-slide carries on smoothly.
      const slide = { duration: SLIDE_DURATION, easing: Easing.out(Easing.quad) };
      animatedLeft.value = withTiming(left, slide);
      animatedTop.value = withTiming(top, slide);
    } else {
      animatedLeft.value = left;
      animatedTop.value = top;
    }
  }, [left, top, motion, pieceId, bumpDistance, animatedLeft, animatedTop]);

  return useAnimatedStyle(() => ({ transform: [{ translateX: animatedLeft.value }, { translateY: animatedTop.value }] }));
}
