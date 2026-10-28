// Sound on the web through the Web Audio API. expo-audio plays the web through
// <audio> elements, which start late, often by a tenth of a second or more.
// Decoded buffers start on the next audio frame and can overlap themselves.
// Phones load webSounds.ts instead, so their bundle never needs expo-asset.
import { Asset } from 'expo-asset';
import { logger } from '../state/logger';
import type { SoundBank } from './webSounds';

export function createWebSoundBank<KindType extends string>(
  soundFilesByKind: Record<KindType, number>,
): SoundBank<KindType> {
  const audioContext = new AudioContext();
  const buffersByKind = new Map<KindType, AudioBuffer>();

  for (const [kind, soundFile] of Object.entries(soundFilesByKind) as [KindType, number][]) {
    fetch(Asset.fromModule(soundFile).uri)
      .then((response) => response.arrayBuffer())
      .then((encodedSound) => audioContext.decodeAudioData(encodedSound))
      .then((buffer) => buffersByKind.set(kind, buffer))
      .catch((error: unknown) => logger.warn('sound not loaded', { kind, error: String(error) }));
  }

  // Browsers keep audio suspended until the page gets a key press or a tap. Safari on iPhone counts only touchend.
  const UNLOCKING_EVENT_NAMES = ['keydown', 'pointerdown', 'touchend'];
  const resume = () => {
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  };
  for (const eventName of UNLOCKING_EVENT_NAMES) document.addEventListener(eventName, resume, true);

  return {
    play(kind) {
      const buffer = buffersByKind.get(kind);
      if (!buffer) return;
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
    },
    release() {
      for (const eventName of UNLOCKING_EVENT_NAMES) document.removeEventListener(eventName, resume, true);
      audioContext.close().catch(() => {});
    },
  };
}
