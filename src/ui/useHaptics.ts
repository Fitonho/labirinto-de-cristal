// Plays the last move's haptic cue on phones. The web stays silent. iOS gets
// its impact and notification styles; Android gets the system's own haptic
// patterns, which feel crisper than buzzing the vibration motor.
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { GameEvent } from '../core';
import { hapticCueFor, type HapticCueKind } from './haptics';

const IOS_PLAYERS_BY_CUE_KIND: Record<HapticCueKind, () => Promise<void>> = {
  win: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  door: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  crystal: () => Haptics.selectionAsync(),
  push: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  bump: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
};

const ANDROID_HAPTICS_BY_CUE_KIND: Record<HapticCueKind, Haptics.AndroidHaptics> = {
  win: Haptics.AndroidHaptics.Confirm,
  door: Haptics.AndroidHaptics.Virtual_Key,
  crystal: Haptics.AndroidHaptics.Segment_Tick,
  push: Haptics.AndroidHaptics.Context_Click,
  bump: Haptics.AndroidHaptics.Reject,
};

function play(kind: HapticCueKind) {
  const playing =
    Platform.OS === 'android'
      ? Haptics.performAndroidHapticsAsync(ANDROID_HAPTICS_BY_CUE_KIND[kind])
      : IOS_PLAYERS_BY_CUE_KIND[kind]();
  // A missed tap is not worth an error on screen.
  playing.catch(() => {});
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
