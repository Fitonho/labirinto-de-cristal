// App state: the current level, its undo history, the last move's events, the
// level's board palette and the player's settings.
// The game reducers only call the engine; all game rules live in src/core.
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
import { drawPalette, randomSeed, type PaletteId } from './palettes';
import { DEFAULT_SETTINGS, settingsReducer, type Settings } from './settings';

export type Language = 'pt' | 'en';

export interface GameSlice {
  levelIndex: number;
  history: History;
  events: GameEvent[]; // what the last action caused, for animation and logs
  language: Language;
  /** The palette this level drew. Undo and Restart keep it; selecting a level draws the next one. */
  paletteId: PaletteId;
  paletteBag: PaletteId[];
  paletteSeed: number;
}

function initialState(language: Language, paletteSeed: number): GameSlice {
  const { paletteId, bag, seed } = drawPalette([], paletteSeed, null);
  return {
    levelIndex: 0,
    history: startHistory(loadLevel(levels[0])),
    events: [],
    language,
    paletteId,
    paletteBag: bag,
    paletteSeed: seed,
  };
}

const game = createSlice({
  name: 'game',
  initialState: initialState('pt', 0),
  reducers: {
    selectLevel(state, action: PayloadAction<number>) {
      state.levelIndex = action.payload;
      state.history = startHistory(loadLevel(levels[action.payload]));
      state.events = [];
      const { paletteId, bag, seed } = drawPalette(state.paletteBag, state.paletteSeed, state.paletteId);
      state.paletteId = paletteId;
      state.paletteBag = bag;
      state.paletteSeed = seed;
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

/** `paletteSeed` starts the palette draws; tests pass one to get the same palettes every run. */
export function createStore(language: Language, paletteSeed: number = randomSeed()) {
  return configureStore({
    reducer: { game: game.reducer, settings: settingsReducer },
    preloadedState: { game: initialState(language, paletteSeed), settings: DEFAULT_SETTINGS },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(logActions),
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = { game: GameSlice; settings: Settings };

/** The palette the board is drawn in: the player's favourite if they chose one, otherwise the level's draw. */
export function selectPaletteId(rootState: RootState): PaletteId {
  const { paletteChoice } = rootState.settings;
  return paletteChoice === 'random' ? rootState.game.paletteId : paletteChoice;
}
