// What this run of the app is showing above the game: whether the saved
// progress has loaded yet, and whether the home screen is open. A brand-new
// player goes straight into the first level; anyone with something saved
// starts on home. Nothing here is saved.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { SavedProgress } from './progress';
import type { SavedResume } from './resume';

export interface Session {
  /** False until the saved progress has been read, so the first screen drawn is already the right one. */
  savedLoaded: boolean;
  homeOpen: boolean;
  /** How home last closed: sliding away on Continue, or at once when a level was picked under the levels screens. */
  homeExit: 'slide' | 'instant';
}

export const INITIAL_SESSION: Session = { savedLoaded: false, homeOpen: false, homeExit: 'slide' };

/** True when anything was saved: a win, a board with a move on it, or a level past the first. */
export function isReturningPlayer(progress: SavedProgress, resume: SavedResume | null, firstLevelId: string): boolean {
  if (Object.keys(progress.bestMovesByLevelId).length > 0) return true;
  if (resume && resume.steps !== '') return true;
  return progress.currentLevelId !== null && progress.currentLevelId !== firstLevelId;
}

const session = createSlice({
  name: 'session',
  initialState: INITIAL_SESSION,
  reducers: {
    savedLoaded(state, action: PayloadAction<{ returning: boolean }>) {
      state.savedLoaded = true;
      state.homeOpen = action.payload.returning;
    },
    openHome(state) {
      state.homeOpen = true;
    },
    closeHome(state, action: PayloadAction<{ animated: boolean }>) {
      state.homeOpen = false;
      state.homeExit = action.payload.animated ? 'slide' : 'instant';
    },
  },
});

export const sessionActions = session.actions;
export const sessionReducer = session.reducer;
