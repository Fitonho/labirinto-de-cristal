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
    selectLevel(s, a: PayloadAction<number>) {
      s.levelIndex = a.payload;
      s.history = startHistory(loadLevel(levels[a.payload]));
      s.events = [];
    },
    move(s, a: PayloadAction<Direction>) {
      const { state, events } = engineMove(s.history.present, a.payload);
      s.history = record(s.history, state);
      s.events = events;
    },
    undo(s) {
      s.history = undoHistory(s.history);
      s.events = [];
    },
    reset(s) {
      s.history = resetHistory(s.history);
      s.events = [];
    },
    setLanguage(s, a: PayloadAction<Language>) {
      s.language = a.payload;
    },
  },
});

export const actions = game.actions;

const logActions: Middleware<{}, RootState> = (api) => (next) => (action) => {
  const result = next(action);
  const { events, history } = api.getState().game;
  logger.debug((action as { type: string }).type, {
    payload: (action as { payload?: unknown }).payload,
    events,
    moves: history.present.moves,
  });
  return result;
};

export function createStore(language: Language) {
  return configureStore({
    reducer: { game: game.reducer },
    preloadedState: { game: initialState(language) },
    middleware: (getDefault) => getDefault().concat(logActions),
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = { game: GameSlice };
