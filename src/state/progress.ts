// The player's progress: the fewest moves each level has been won in. A level
// with a best is a level the player has finished, so the level menu can read
// this too. Only the bests are saved; the last win is kept for the result card.
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

/** What gets saved: the bests only. */
export function progressToSave(progress: Progress): string {
  return JSON.stringify({ bestMovesByLevelId: progress.bestMovesByLevelId });
}

/** The bests from saved JSON. Anything that isn't a whole number of moves is left out, so a broken file still loads. */
export function bestMovesFromSaved(savedText: string | null): Record<string, number> {
  let saved: unknown = null;
  try {
    saved = savedText ? JSON.parse(savedText) : null;
  } catch {
    saved = null;
  }
  const savedBests = saved && typeof saved === 'object' ? (saved as Record<string, unknown>).bestMovesByLevelId : null;
  const bestMovesByLevelId: Record<string, number> = {};
  if (!savedBests || typeof savedBests !== 'object') return bestMovesByLevelId;
  for (const [levelId, bestMoves] of Object.entries(savedBests)) {
    if (Number.isInteger(bestMoves) && (bestMoves as number) > 0) bestMovesByLevelId[levelId] = bestMoves as number;
  }
  return bestMovesByLevelId;
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
  },
});

export const progressActions = progress.actions;
export const progressReducer = progress.reducer;
