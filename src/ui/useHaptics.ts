// Plays the last move's haptic cue on phones. The web stays silent. Both
// platforms use the impact and notification styles: on Android these run the
// vibration motor, because the system haptic patterns are dropped whenever the
// phone's touch feedback setting is off, which is the default on many phones.
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { GameEvent } from '../core';
import { logger } from '../state/logger';
import { hapticCueFor, type HapticCueKind } from './haptics';

const PLAYERS_BY_CUE_KIND: Record<HapticCueKind, () => Promise<void>> = {
  win: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  door: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  crystal: () => Haptics.selectionAsync(),
  push: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  bump: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
};

function play(kind: HapticCueKind) {
  logger.debug('haptic', { kind, platform: Platform.OS });
  // A missed tap is not worth an error on screen, but the log says why.
  PLAYERS_BY_CUE_KIND[kind]().catch((error: unknown) => logger.warn('haptic failed', { kind, error: String(error) }));
}

/** `events` is a new array after every action, so each move plays once even when it repeats the last one. */
export function useHaptics(events: GameEvent[]) {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const cue = hapticCueFor(events);
    if (!cue) return;
    if (cue.delay === 0) {
      play(cue.kind);
      return;
    }
    // The next move cancels a tap that hasn't played yet, so fast play never queues them up.
    const timer = setTimeout(() => play(cue.kind), cue.delay);
    return () => clearTimeout(timer);
  }, [events]);
}
