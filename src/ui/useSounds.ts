// Plays the last move's sound on Android, iOS and the web with expo-audio. Each
// sound has one player, loaded at start and rewound before every play. The
// sounds mix with the player's own music and follow the iPhone's silent switch.
// The files come from scripts/make-sounds.mjs.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';
import type { GameEvent } from '../core';
import { logger } from '../state/logger';
import { soundCueFor, type SoundCueKind } from './sounds';

const SOUND_FILES_BY_CUE_KIND: Record<SoundCueKind, number> = {
  step: require('../../assets/sounds/step.wav'),
  push: require('../../assets/sounds/push.wav'),
  bump: require('../../assets/sounds/bump.wav'),
  door: require('../../assets/sounds/door.wav'),
  crystal: require('../../assets/sounds/crystal.wav'),
  win: require('../../assets/sounds/win.wav'),
};

function play(player: AudioPlayer, kind: SoundCueKind) {
  logger.debug('sound', { kind });
  try {
    // A sound that is still playing starts again from the top.
    player.seekTo(0);
    player.play();
  } catch (error) {
    // A missed sound is not worth an error on screen, but the log says why.
    logger.warn('sound failed', { kind, error: String(error) });
  }
}

/** `events` is a new array after every action, so each move plays once even when it repeats the last one. */
export function useSounds(events: GameEvent[], soundOn: boolean) {
  const playersByCueKind = useRef<Record<SoundCueKind, AudioPlayer> | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch((error: unknown) =>
      logger.warn('audio mode not set', { error: String(error) }),
    );
    const players = Object.fromEntries(
      Object.entries(SOUND_FILES_BY_CUE_KIND).map(([kind, soundFile]) => [kind, createAudioPlayer(soundFile)]),
    ) as Record<SoundCueKind, AudioPlayer>;
    playersByCueKind.current = players;
    return () => {
      playersByCueKind.current = null;
      for (const player of Object.values(players)) player.remove();
    };
  }, []);

  useEffect(() => {
    if (!soundOn) return;
    const cue = soundCueFor(events);
    const player = cue && playersByCueKind.current?.[cue.kind];
    if (!cue || !player) return;
    if (cue.delay === 0) {
      play(player, cue.kind);
      return;
    }
    // The next move cancels a sound that hasn't started yet, so fast play never queues them up.
    const timer = setTimeout(() => play(player, cue.kind), cue.delay);
    return () => clearTimeout(timer);
  }, [events]);
}
