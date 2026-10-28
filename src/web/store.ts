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
    selectLevel(state, action: PayloadAction<number>) {
      state.levelIndex = action.payload;
      state.history = startHistory(loadLevel(levels[action.payload]));
      state.events = [];
    },
    move(state, action: PayloadAction<Direction>) {
      const { state: nextGameState, events } = engineMove(state.history.present, action.payload);
      state.history = record(state.history, nextGameState);
      state.events = events;
    },
    undo(state) {
      state.history = undoHistory(state.history);
      state.events = [];
    },
    reset(state) {
      state.history = resetHistory(state.history);
      state.events = [];
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
  },
});

export const actions = game.actions;

const logActions: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);
  const { events, history } = store.getState().game;
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
