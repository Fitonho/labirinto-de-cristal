// The player's settings: sound, vibration and tap moves on or off, and the board
// colours. The whole slice is saved as one object, so a new setting only needs a
// field here and a default.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { isPaletteChoice, type PaletteChoice } from './palettes';

export interface Settings {
  soundOn: boolean;
  vibrationOn: boolean;
  /** Whether tapping a side of the touch area under the board moves that way. Swipes always work. */
  tapMovesOn: boolean;
  /** 'random' gives every level a new palette; a palette id keeps that one on every level. */
  paletteChoice: PaletteChoice;
}

export const DEFAULT_SETTINGS: Settings = { soundOn: true, vibrationOn: true, tapMovesOn: true, paletteChoice: 'random' };

/**
 * Settings from saved JSON. Anything missing or of the wrong type takes its
 * default, so files saved by an older version, or a broken file, still load.
 */
export function settingsFromSaved(savedText: string | null): Settings {
  let saved: unknown = null;
  try {
    saved = savedText ? JSON.parse(savedText) : null;
  } catch {
    saved = null;
  }
  const savedFields = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};
  const settings = { ...DEFAULT_SETTINGS };
  for (const settingName of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const savedValue = savedFields[settingName];
    if (typeof savedValue === typeof DEFAULT_SETTINGS[settingName]) settings[settingName] = savedValue as never;
  }
  // A palette that was renamed or removed falls back to random.
  if (!isPaletteChoice(settings.paletteChoice)) settings.paletteChoice = DEFAULT_SETTINGS.paletteChoice;
  return settings;
}

const settings = createSlice({
  name: 'settings',
  initialState: DEFAULT_SETTINGS,
  reducers: {
    setSoundOn(state, action: PayloadAction<boolean>) {
      state.soundOn = action.payload;
    },
    setVibrationOn(state, action: PayloadAction<boolean>) {
      state.vibrationOn = action.payload;
    },
    setTapMovesOn(state, action: PayloadAction<boolean>) {
      state.tapMovesOn = action.payload;
    },
    setPaletteChoice(state, action: PayloadAction<PaletteChoice>) {
      state.paletteChoice = action.payload;
    },
    /** Replaces every setting at once, after loading them from storage. */
    loadedSettings(state, action: PayloadAction<Settings>) {
      return action.payload;
    },
  },
});

export const settingsActions = settings.actions;
export const settingsReducer = settings.reducer;
