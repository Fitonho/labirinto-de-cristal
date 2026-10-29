// Pure helper that picks the one sound a move deserves from its engine events,
// and when it should play. It shares the haptic cues and their timing, and adds
// a quiet step for a plain move. No React or Expo here, so Vitest tests it.
import type { GameEvent } from '../core';
import { hapticCueFor, type HapticCueKind } from './haptics';

export type SoundCueKind = HapticCueKind | 'step';

export interface SoundCue {
  kind: SoundCueKind;
  delay: number; // milliseconds after the move
}

/** Every sound, in the order of the files in assets/sounds/. */
export const SOUND_CUE_KINDS: SoundCueKind[] = ['step', 'push', 'bump', 'door', 'crystal', 'win', 'par'];

/** The sound for the last move, or null for undo, restart, a new level or a move after winning. */
export function soundCueFor(events: GameEvent[]): SoundCue | null {
  const hapticCue = hapticCueFor(events);
  if (hapticCue) return hapticCue;
  // A step plays as the player starts sliding, so it never lags behind the key press.
  return events.some((event) => event.type === 'moved') ? { kind: 'step', delay: 0 } : null;
}
