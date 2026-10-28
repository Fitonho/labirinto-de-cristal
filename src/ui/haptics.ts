// Pure helper that picks the one haptic cue a move deserves from its engine
// events, and when it should play so it lands on the animation frame where
// the thing happens. No React or Expo here, so Vitest tests it.
import type { GameEvent } from '../core';
import { BUMP_OUT_DURATION, FLIP_GROW_DURATION, SLIDE_DURATION } from './motion';

export type HapticCueKind = 'win' | 'door' | 'crystal' | 'push' | 'bump';

export interface HapticCue {
  kind: HapticCueKind;
  delay: number; // milliseconds after the move
}

/** Strongest first: a move that does several things gets only the first matching cue. */
const CUE_KINDS_BY_PRIORITY: HapticCueKind[] = ['win', 'door', 'crystal', 'push', 'bump'];

/** When each cue plays: a push as the box starts, a bump when it hits, a door when the colours swap, the rest on arrival. */
const DELAYS_BY_CUE_KIND: Record<HapticCueKind, number> = {
  win: SLIDE_DURATION,
  door: FLIP_GROW_DURATION,
  crystal: SLIDE_DURATION,
  push: 0,
  bump: BUMP_OUT_DURATION,
};

/** The cue for the last move, or null for a plain step, undo, restart, a new level or a move after winning. */
export function hapticCueFor(events: GameEvent[]): HapticCue | null {
  const cueKinds = new Set(events.map(cueKindFor));
  const kind = CUE_KINDS_BY_PRIORITY.find((candidateKind) => cueKinds.has(candidateKind));
  return kind ? { kind, delay: DELAYS_BY_CUE_KIND[kind] } : null;
}

function cueKindFor(event: GameEvent): HapticCueKind | null {
  switch (event.type) {
    case 'won':
      return 'win';
    case 'flipped':
      return 'door';
    case 'collected':
      return 'crystal';
    case 'pushed':
      return 'push';
    case 'pushRefused':
      return 'bump';
    case 'blocked':
      return event.reason === 'edge' ? 'bump' : null;
    default:
      return null;
  }
}
