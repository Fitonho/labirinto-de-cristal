// Saving the player's progress (best moves per level) between launches, with
// AsyncStorage (local storage on the web), the same way as the settings.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { logger } from '../state/logger';
import { bestMovesFromSaved, progressActions, progressToSave } from '../state/progress';
import type { AppStore } from '../state/store';

const STORAGE_KEY = 'labirinto-de-cristal/progress';

/** Loads the saved bests once, then saves them whenever they change. Call it once, next to the store. */
export function useSavedProgress(store: AppStore) {
  useEffect(() => {
    let lastSavedBests = store.getState().progress.bestMovesByLevelId;
    let unsubscribe = () => {};
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(bestMovesFromSaved)
      .catch((error: unknown) => {
        logger.warn('progress not loaded', { error: String(error) });
        return {};
      })
      .then((savedBests) => {
        if (cancelled) return;
        store.dispatch(progressActions.loadedBests(savedBests));
        lastSavedBests = store.getState().progress.bestMovesByLevelId;
        // Only start saving after loading, so an empty start never overwrites what was saved.
        unsubscribe = store.subscribe(() => {
          const progress = store.getState().progress;
          if (progress.bestMovesByLevelId === lastSavedBests) return;
          lastSavedBests = progress.bestMovesByLevelId;
          AsyncStorage.setItem(STORAGE_KEY, progressToSave(progress)).catch((error: unknown) =>
            logger.warn('progress not saved', { error: String(error) }),
          );
        });
      });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [store]);
}
