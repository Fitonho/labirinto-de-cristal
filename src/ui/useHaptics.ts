// Plays the last move's haptic cue on phones. The web stays silent. iOS uses
// expo-haptics' impact and notification styles. Android runs the vibration
// motor through React Native's Vibration at the phone's normal strength:
// the system haptic patterns are dropped whenever the touch feedback setting
// is off, and expo-haptics' Android pulses are too faint to feel on many phones.
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { logger } from '../state/logger';
import { hapticCueFor, parCueFor, type HapticCueKind } from './haptics';
import { useGameEventsListener } from './useGameEventsListener';

const IOS_PLAYERS_BY_CUE_KIND: Record<HapticCueKind, () => Promise<void>> = {
  win: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  door: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  crystal: () => Haptics.selectionAsync(),
  push: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  bump: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  par: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};

/**
 * Android 13+ files any app vibration of up to three steps under touch feedback,
 * so the phone's touch feedback setting mutes it. Ending each pulse with a 1 ms
 * pause and a 1 ms buzz makes it four steps, which plays like the win's double
 * pulse does. Many motors also need about 40 ms to spin up, so shorter pulses
 * are never felt.
 */
const singlePulse = (milliseconds: number) => [0, milliseconds, 1, 1];

/** A pattern of pause, vibration, pause, vibration, in milliseconds. */
const ANDROID_VIBRATIONS_BY_CUE_KIND: Record<HapticCueKind, number[]> = {
  win: [0, 60, 80, 80],
  door: singlePulse(80),
  crystal: singlePulse(50),
  push: singlePulse(40),
  bump: singlePulse(60),
  par: singlePulse(40),
};

function play(kind: HapticCueKind) {
  logger.debug('haptic', { kind, platform: Platform.OS });
  if (Platform.OS === 'android') {
    Vibration.vibrate(ANDROID_VIBRATIONS_BY_CUE_KIND[kind]);
    return;
  }
  // A missed tap is not worth an error on screen, but the log says why.
  IOS_PLAYERS_BY_CUE_KIND[kind]().catch((error: unknown) => logger.warn('haptic failed', { kind, error: String(error) }));
}

/** Plays as soon as the move happens, not after the board redraws (see useGameEventsListener). */
export function useHaptics(vibrationOn: boolean, par: number | undefined) {
  useGameEventsListener((events) => {
    if (Platform.OS === 'web' || !vibrationOn) return;
    const cues = [hapticCueFor(events), parCueFor(events, par)].filter((cue) => cue !== null);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const cue of cues) {
      if (cue.delay === 0) play(cue.kind);
      else timers.push(setTimeout(() => play(cue.kind), cue.delay));
    }
    // The next action cancels a tap that hasn't played yet, so fast play never queues them up.
    return () => timers.forEach(clearTimeout);
  });
}
