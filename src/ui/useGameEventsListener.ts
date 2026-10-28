// Calls back with each action's engine events straight from the store, right
// after the reducer runs and before React redraws the board. Sound and haptics
// listen here, because redrawing every tile can take most of a second in a
// development build, and a cue that waited for it would land late.
import { useEffect, useRef } from 'react';
import { useStore } from 'react-redux';
import type { GameEvent } from '../core';
import type { RootState } from '../state/store';

/** What to do about one action's events. It may return a cleanup, which runs when the next action arrives. */
export type GameEventsHandler = (events: GameEvent[]) => (() => void) | void;

/** `events` is a new array after every game action, so a move plays once even when it repeats the last one. */
export function useGameEventsListener(onEvents: GameEventsHandler) {
  const store = useStore<RootState>();
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;

  useEffect(() => {
    let lastEvents = store.getState().game.events;
    let cleanUp: (() => void) | void;
    const unsubscribe = store.subscribe(() => {
      const events = store.getState().game.events;
      if (events === lastEvents) return;
      lastEvents = events;
      cleanUp?.();
      cleanUp = onEventsRef.current(events);
    });
    return () => {
      unsubscribe();
      cleanUp?.();
    };
  }, [store]);
}
