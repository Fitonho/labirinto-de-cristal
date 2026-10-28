// Plays the last move's sound. Phones use expo-audio: each sound has one
// player, loaded at start and rewound before every play, mixing with the
// player's own music and following the iPhone's silent switch. The web uses
// Web Audio (see webSounds.web.ts), because expo-audio's web players start late.
// The files come from scripts/make-sounds.mjs.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { GameEvent } from '../core';
import { logger } from '../state/logger';
import { soundCueFor, type SoundCueKind } from './sounds';
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
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch((error: unknown) =>
    logger.warn('audio mode not set', { error: String(error) }),
  );
  const playersByCueKind = Object.fromEntries(
    Object.entries(SOUND_FILES_BY_CUE_KIND).map(([kind, soundFile]) => [kind, createAudioPlayer(soundFile)]),
  ) as Record<SoundCueKind, AudioPlayer>;
  return {
    play(kind) {
      const player = playersByCueKind[kind];
      // A sound that is still playing starts again from the top.
      player.seekTo(0);
      player.play();
    },
    release() {
      for (const player of Object.values(playersByCueKind)) player.remove();
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

/** `events` is a new array after every action, so each move plays once even when it repeats the last one. */
export function useSounds(events: GameEvent[], soundOn: boolean) {
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

  useEffect(() => {
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
  }, [events]);
}
