// Saving the player's progress between launches, with AsyncStorage (local
// storage on the web), the same way as the settings. Two entries: the bests and
// the level the player is on, written after a win or a level change; and the
// board in progress, written when the app is put away. Nothing is written on a
// move, so playing costs nothing extra. Once loaded, it says whether this is a
// returning player, who starts on home.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { levels } from '../levels/index';
import { logger } from '../state/logger';
import { progressActions, progressFromSaved, progressToSave, type SavedProgress } from '../state/progress';
import { replaySteps, resumeFromSaved, resumeToSave, type SavedResume } from '../state/resume';
import { isReturningPlayer, sessionActions } from '../state/session';
import { actions, type AppStore } from '../state/store';

const PROGRESS_KEY = 'labirinto-de-cristal/progress';
const RESUME_KEY = 'labirinto-de-cristal/resume';

async function loadSaved(): Promise<{ progress: SavedProgress; resume: SavedResume | null }> {
  const [[, progressText], [, resumeText]] = await AsyncStorage.multiGet([PROGRESS_KEY, RESUME_KEY]);
  return { progress: progressFromSaved(progressText), resume: resumeFromSaved(resumeText) };
}

/**
 * Opens the level the player was on. Its saved board comes back with its undo
 * history, unless that board was already won: then the next level opens, as
 * the result card's Next would have done.
 */
function openSavedLevel(store: AppStore, progress: SavedProgress, resume: SavedResume | null) {
  const levelIndex = levels.findIndex((level) => level.id === progress.currentLevelId);
  if (levelIndex < 0) return;
  const savedResume = resume && resume.levelId === progress.currentLevelId ? resume : null;
  if (savedResume && replaySteps(levels[levelIndex], savedResume.steps).history.present.status === 'won') {
    store.dispatch(actions.selectLevel(Math.min(levelIndex + 1, levels.length - 1)));
    return;
  }
  store.dispatch(actions.resumed({ levelIndex, steps: savedResume?.steps ?? '', paletteId: savedResume?.paletteId ?? null }));
}

/** Loads the saved progress once and opens the level it names, then saves whenever it changes. Call it once, next to the store. */
export function useSavedProgress(store: AppStore) {
  useEffect(() => {
    let unsubscribe = () => {};
    let stopWatchingAppState = () => {};
    let cancelled = false;

    const saveResume = () => {
      const rootState = store.getState();
      const { levelIndex, steps } = rootState.game;
      const resume = { levelId: levels[levelIndex].id, steps, paletteId: rootState.game.paletteId };
      AsyncStorage.setItem(RESUME_KEY, resumeToSave(resume)).catch((error: unknown) =>
        logger.warn('board not saved', { error: String(error) }),
      );
    };

    loadSaved()
      .catch((error: unknown) => {
        logger.warn('progress not loaded', { error: String(error) });
        return { progress: progressFromSaved(null), resume: null };
      })
      .then(({ progress, resume }) => {
        if (cancelled) return;
        store.dispatch(progressActions.loadedBests(progress.bestMovesByLevelId));
        // A player who already moved or picked a level before loading finished keeps what they did.
        const { levelIndex, steps } = store.getState().game;
        if (levelIndex === 0 && steps === '') openSavedLevel(store, progress, resume);
        store.dispatch(sessionActions.savedLoaded({ returning: isReturningPlayer(progress, resume, levels[0].id) }));

        let lastSavedBests = store.getState().progress.bestMovesByLevelId;
        let lastSavedLevelIndex = store.getState().game.levelIndex;
        // Only start saving after loading, so an empty start never overwrites what was saved.
        unsubscribe = store.subscribe(() => {
          const rootState = store.getState();
          const bests = rootState.progress.bestMovesByLevelId;
          if (bests === lastSavedBests && rootState.game.levelIndex === lastSavedLevelIndex) return;
          if (rootState.game.levelIndex !== lastSavedLevelIndex) saveResume();
          lastSavedBests = bests;
          lastSavedLevelIndex = rootState.game.levelIndex;
          AsyncStorage.setItem(PROGRESS_KEY, progressToSave(rootState.progress, levels[lastSavedLevelIndex].id)).catch(
            (error: unknown) => logger.warn('progress not saved', { error: String(error) }),
          );
        });

        // The board in progress is saved when the app is put away; a closed web tab fires pagehide.
        const appStateSubscription = AppState.addEventListener('change', (appState) => {
          if (appState !== 'active') saveResume();
        });
        if (Platform.OS === 'web') window.addEventListener('pagehide', saveResume);
        stopWatchingAppState = () => {
          appStateSubscription.remove();
          if (Platform.OS === 'web') window.removeEventListener('pagehide', saveResume);
        };
      });
    return () => {
      cancelled = true;
      unsubscribe();
      stopWatchingAppState();
    };
  }, [store]);
}
