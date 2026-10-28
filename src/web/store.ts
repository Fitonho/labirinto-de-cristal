// App state: the current level, its undo history and the last move's events.
// The reducers only call the engine; all game rules live in src/core.
import { configureStore, createSlice, type Middleware, type PayloadAction } from '@reduxjs/toolkit';
import {
  loadLevel,
  move as engineMove,
  record,
  reset as resetHistory,
  startHistory,
  undo as undoHistory,
  type Direction,
  type GameEvent,
  type History,
} from '../core';
import { levels } from '../levels/index';
import { logger } from './logger';
import type { Language } from './i18n';

export interface GameSlice {
  levelIndex: number;
  history: History;
  events: GameEvent[]; // what the last action caused, for animation and logs
  language: Language;
}

function initialState(language: Language): GameSlice {
  return { levelIndex: 0, history: startHistory(loadLevel(levels[0])), events: [], language };
}

const game = createSlice({
  name: 'game',
  initialState: initialState('pt'),
  reducers: {
    selectLevel(slice, action: PayloadAction<number>) {
      slice.levelIndex = action.payload;
      slice.history = startHistory(loadLevel(levels[action.payload]));
      slice.events = [];
    },
    move(slice, action: PayloadAction<Direction>) {
      const { state, events } = engineMove(slice.history.present, action.payload);
      slice.history = record(slice.history, state);
      slice.events = events;
    },
    undo(slice) {
      slice.history = undoHistory(slice.history);
      slice.events = [];
    },
    reset(slice) {
      slice.history = resetHistory(slice.history);
      slice.events = [];
    },
    setLanguage(slice, action: PayloadAction<Language>) {
      slice.language = action.payload;
    },
  },
});

export const actions = game.actions;

const logActions: Middleware<{}, RootState> = (storeApi) => (nextDispatch) => (action) => {
  const result = nextDispatch(action);
  const { events, history } = storeApi.getState().game;
  logger.debug((action as { type: string }).type, {
    payload: (action as { payload?: unknown }).payload,
    events,
    moveCount: history.present.moveCount,
  });
  return result;
};

export function createStore(language: Language) {
  return configureStore({
    reducer: { game: game.reducer },
    preloadedState: { game: initialState(language) },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logActions),
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = { game: GameSlice };
