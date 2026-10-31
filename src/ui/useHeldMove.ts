// Repeats a move at the hold beat while a key, a tap, a swipe or a seek is
// held. One hold runs at a time: starting another replaces it. A bump stops
// the walk in that direction until the hold asks to go another way, so the
// Pebble never hammers a wall; a win ends the hold.
import { useCallback, useEffect, useRef } from 'react';
import { useStore } from 'react-redux';
import type { Direction } from '../core';
import type { RootState } from '../state/store';
import type { Command } from './commands';
import { HOLD_REPEAT_INTERVAL, motionFor } from './motion';

interface Hold {
  /** Asked on every beat, so a moving finger can steer the walk. Null waits a beat. */
  nextDirection: () => Direction | null;
  timer: ReturnType<typeof setTimeout> | null;
  bumpedDirection: Direction | null;
  beatCount: number;
}

export function useHeldMove(onCommand: (command: Command) => unknown) {
  const store = useStore<RootState>();
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const holdRef = useRef<Hold | null>(null);

  const lastMoveBumped = useCallback(() => {
    const { events, history } = store.getState().game;
    return motionFor(events, history.present).bump !== null;
  }, [store]);

  /** Ends the hold, and says whether it had already moved (or, for a seek, started). */
  const stopHold = useCallback(() => {
    const hold = holdRef.current;
    if (!hold) return false;
    if (hold.timer) clearTimeout(hold.timer);
    holdRef.current = null;
    return hold.beatCount > 0;
  }, []);

  /**
   * Starts beating after `firstBeatDelay`, then every HOLD_REPEAT_INTERVAL.
   * `movedDirection` is a move the caller has just made itself, such as a
   * swipe's: if it bumped, the hold won't repeat it.
   */
  const startHold = useCallback(
    (nextDirection: () => Direction | null, firstBeatDelay: number, movedDirection: Direction | null = null) => {
      stopHold();
      const hold: Hold = {
        nextDirection,
        timer: null,
        bumpedDirection: movedDirection && lastMoveBumped() ? movedDirection : null,
        beatCount: 0,
      };
      const beat = () => {
        hold.beatCount += 1;
        hold.timer = setTimeout(beat, HOLD_REPEAT_INTERVAL);
        const direction = hold.nextDirection();
        if (!direction || direction === hold.bumpedDirection) return;
        hold.bumpedDirection = null;
        onCommandRef.current({ type: 'move', direction });
        if (holdRef.current !== hold) return;
        if (store.getState().game.history.present.status === 'won') stopHold();
        else if (lastMoveBumped()) hold.bumpedDirection = direction;
      };
      hold.timer = setTimeout(beat, firstBeatDelay);
      holdRef.current = hold;
    },
    [stopHold, lastMoveBumped, store],
  );

  const holdHasBeaten = useCallback(() => (holdRef.current?.beatCount ?? 0) > 0, []);

  useEffect(
    () => () => {
      stopHold();
    },
    [stopHold],
  );
  return { startHold, stopHold, holdHasBeaten };
}
