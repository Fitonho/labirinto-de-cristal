// The player's settings in components, and saving them between launches with
// AsyncStorage (local storage on the web). The slice is saved whole, so a new
// setting in src/state/settings.ts needs no change here.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { PaletteChoice } from '../state/palettes';
import { settingsActions, settingsFromSaved, type Settings } from '../state/settings';
import { logger } from '../state/logger';
import type { AppStore, RootState } from '../state/store';

const STORAGE_KEY = 'labirinto-de-cristal/settings';

export async function loadSettings(): Promise<Settings> {
  return settingsFromSaved(await AsyncStorage.getItem(STORAGE_KEY));
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

/** Loads the saved settings once, then saves them whenever they change. Call it once, next to the store. */
export function useSavedSettings(store: AppStore) {
  useEffect(() => {
    let lastSavedSettings = store.getState().settings;
    let unsubscribe = () => {};
    let cancelled = false;
    loadSettings()
      .catch((error: unknown) => {
        logger.warn('settings not loaded', { error: String(error) });
        return lastSavedSettings;
      })
      .then((loadedSettings) => {
        if (cancelled) return;
        store.dispatch(settingsActions.loadedSettings(loadedSettings));
        lastSavedSettings = store.getState().settings;
        // Only start saving after loading, so the defaults never overwrite what was saved.
        unsubscribe = store.subscribe(() => {
          const settings = store.getState().settings;
          if (settings === lastSavedSettings) return;
          lastSavedSettings = settings;
          saveSettings(settings).catch((error: unknown) => logger.warn('settings not saved', { error: String(error) }));
        });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store]);
}

/** The settings and their switches, for buttons and for the sound and haptic hooks. */
export function useSettings() {
  const dispatch = useDispatch();
  const settings = useSelector((rootState: RootState) => rootState.settings);
  const toggleSound = useCallback(() => dispatch(settingsActions.setSoundOn(!settings.soundOn)), [dispatch, settings.soundOn]);
  const toggleVibration = useCallback(
    () => dispatch(settingsActions.setVibrationOn(!settings.vibrationOn)),
    [dispatch, settings.vibrationOn],
  );
  const toggleTapMoves = useCallback(
    () => dispatch(settingsActions.setTapMovesOn(!settings.tapMovesOn)),
    [dispatch, settings.tapMovesOn],
  );
  const choosePalette = useCallback(
    (paletteChoice: PaletteChoice) => dispatch(settingsActions.setPaletteChoice(paletteChoice)),
    [dispatch],
  );
  return { ...settings, toggleSound, toggleVibration, toggleTapMoves, choosePalette };
}
