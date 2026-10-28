// The phone side of webSounds.web.ts: phones play sound through expo-audio
// (see useSounds.ts), so this never runs. It keeps Web Audio and expo-asset out
// of the phone bundle.

/** A set of loaded sounds, on the web or on a phone. */
export interface SoundBank<KindType extends string> {
  play(kind: KindType): void;
  release(): void;
}

export function createWebSoundBank<KindType extends string>(
  soundFilesByKind: Record<KindType, number>,
): SoundBank<KindType> {
  throw new Error(`Web Audio is only for the web, not for ${Object.keys(soundFilesByKind).length} sounds on a phone`);
}
