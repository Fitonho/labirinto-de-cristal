// Plays each move's sound as soon as the move happens. Phones use expo-audio:
// every sound is loaded into memory once, then gets one player that is rewound
// before every play. The sounds mix with the player's own music. The web uses
// Web Audio (see webSounds.web.ts), because expo-audio's web players start late.
// The files come from scripts/make-sounds.mjs.
import { createAudioPlayer, preload, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { logger } from '../state/logger';
import { soundCueFor, type SoundCueKind } from './sounds';
import { useGameEventsListener } from './useGameEventsListener';
import { createWebSoundBank, type SoundBank } from './webSounds';

const SOUND_FILES_BY_CUE_KIND: Record<SoundCueKind, number> = {
  step: require('../../assets/sounds/step.wav'),
  push: require('../../assets/sounds/push.wav'),
  bump: require('../../assets/sounds/bump.wav'),
  door: require('../../assets/sounds/door.wav'),
  crystal: require('../../assets/sounds/crystal.wav'),
  win: require('../../assets/sounds/win.wav'),
};

function createPhoneSoundBank(): SoundBank<SoundCueKind> {
  // A game plays on Android's vibrate setting too, where expo-audio would otherwise stay silent.
  // The iPhone's mute switch still silences it.
  setAudioModeAsync({ playsInSilentMode: Platform.OS === 'android', interruptionMode: 'mixWithOthers' }).catch(
    (error: unknown) => logger.warn('audio mode not set', { error: String(error) }),
  );
  const playersByCueKind = new Map<SoundCueKind, AudioPlayer>();
  let released = false;
  // A player made from a preloaded sound reads it from memory. Otherwise Android streams it again on every
  // rewind, which in Expo Go means a round trip through the development server's tunnel.
  for (const [kind, soundFile] of Object.entries(SOUND_FILES_BY_CUE_KIND) as [SoundCueKind, number][]) {
    preload(soundFile)
      .catch((error: unknown) => logger.warn('sound not preloaded', { kind, error: String(error) }))
      .then(() => {
        if (!released) playersByCueKind.set(kind, createAudioPlayer(soundFile));
      });
  }
  return {
    play(kind) {
      const player = playersByCueKind.get(kind);
      if (!player) return;
      if (!player.playing && player.currentTime === 0) {
        player.play();
        return;
      }
      // A sound that has played, or still is, starts again from the top once the rewind is done.
      player
        .seekTo(0)
        .then(() => player.play())
        .catch((error: unknown) => logger.warn('sound failed', { kind, error: String(error) }));
    },
    release() {
      released = true;
      for (const player of playersByCueKind.values()) player.remove();
    },
  };
}

function play(soundBank: SoundBank<SoundCueKind>, kind: SoundCueKind) {
  logger.debug('sound', { kind });
  try {
    soundBank.play(kind);
  } catch (error) {
    // A missed sound is not worth an error on screen, but the log says why.
    logger.warn('sound failed', { kind, error: String(error) });
  }
}

export function useSounds(soundOn: boolean) {
  const soundBankRef = useRef<SoundBank<SoundCueKind> | null>(null);

  useEffect(() => {
    const soundBank =
      Platform.OS === 'web' ? createWebSoundBank(SOUND_FILES_BY_CUE_KIND) : createPhoneSoundBank();
    soundBankRef.current = soundBank;
    return () => {
      soundBankRef.current = null;
      soundBank.release();
    };
  }, []);

  useGameEventsListener((events) => {
    if (!soundOn) return;
    const cue = soundCueFor(events);
    const soundBank = soundBankRef.current;
    if (!cue || !soundBank) return;
    if (cue.delay === 0) {
      play(soundBank, cue.kind);
      return;
    }
    // The next move cancels a sound that hasn't started yet, so fast play never queues them up.
    const timer = setTimeout(() => play(soundBank, cue.kind), cue.delay);
    return () => clearTimeout(timer);
  });
}
