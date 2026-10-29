// The player's progress: the fewest moves each level has been won in. A level
// with a best is a level the player has finished, and one with a best at or
// under its par has a star; both are worked out from the bests, never saved,
// so a par changed later regrades old wins. The saved file also names the
// level the player was on, which comes from the game slice. The last win is
// only kept for the result card.
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface LastWin {
  levelId: string;
  moveCount: number;
  /** The best before this win, or null on the level's first win. */
  previousBestMoves: number | null;
}

export interface Progress {
  bestMovesByLevelId: Record<string, number>;
  lastWin: LastWin | null;
}

export const EMPTY_PROGRESS: Progress = { bestMovesByLevelId: {}, lastWin: null };

/** Version 1 (PR #15) saved only the bests and had no version field. */
export const PROGRESS_VERSION = 2;

export interface SavedProgress {
  bestMovesByLevelId: Record<string, number>;
  /** The level the player was on, or null when the file doesn't say. */
  currentLevelId: string | null;
}

/** What gets saved: the bests and the level the player is on. */
export function progressToSave(progress: Progress, currentLevelId: string): string {
  return JSON.stringify({ version: PROGRESS_VERSION, bestMovesByLevelId: progress.bestMovesByLevelId, currentLevelId });
}

/**
 * Progress from saved JSON, of any version. Anything that isn't a whole
 * number of moves is left out, so a broken file still loads.
 */
export function progressFromSaved(savedText: string | null): SavedProgress {
  let saved: unknown = null;
  try {
    saved = savedText ? JSON.parse(savedText) : null;
  } catch {
    saved = null;
  }
  const savedFields = saved && typeof saved === 'object' ? (saved as Record<string, unknown>) : {};
  const savedBests = savedFields.bestMovesByLevelId;
  const bestMovesByLevelId: Record<string, number> = {};
  if (savedBests && typeof savedBests === 'object') {
    for (const [levelId, bestMoves] of Object.entries(savedBests)) {
      if (Number.isInteger(bestMoves) && (bestMoves as number) > 0) bestMovesByLevelId[levelId] = bestMoves as number;
    }
  }
  const currentLevelId = typeof savedFields.currentLevelId === 'string' ? savedFields.currentLevelId : null;
  return { bestMovesByLevelId, currentLevelId };
}

const progress = createSlice({
  name: 'progress',
  initialState: EMPTY_PROGRESS,
  reducers: {
    recordWin(state, action: PayloadAction<{ levelId: string; moveCount: number }>) {
      const { levelId, moveCount } = action.payload;
      const previousBestMoves = state.bestMovesByLevelId[levelId] ?? null;
      state.lastWin = { levelId, moveCount, previousBestMoves };
      if (previousBestMoves === null || moveCount < previousBestMoves) state.bestMovesByLevelId[levelId] = moveCount;
    },
    /** Adds the saved bests after loading them; a level won before they loaded keeps the better of the two. */
    loadedBests(state, action: PayloadAction<Record<string, number>>) {
      for (const [levelId, savedBestMoves] of Object.entries(action.payload)) {
        const currentBestMoves = state.bestMovesByLevelId[levelId];
        state.bestMovesByLevelId[levelId] = currentBestMoves === undefined ? savedBestMoves : Math.min(currentBestMoves, savedBestMoves);
      }
    },
    /** Forgets every win. Settings are kept. */
    resetProgress() {
      return EMPTY_PROGRESS;
    },
  },
});

export const progressActions = progress.actions;
export const progressReducer = progress.reducer;
