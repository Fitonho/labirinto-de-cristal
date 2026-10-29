// App state: the current level, its undo history and the steps that built it
// (for resuming), the last move's events, the level's board palette, the
// player's settings and their progress (best moves).
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
import { EMPTY_PROGRESS, progressActions, progressReducer, type Progress } from './progress';
import { RESTART_STEP_LETTER, replaySteps, STEP_LETTER_BY_DIRECTION } from './resume';
import { DEFAULT_SETTINGS, settingsActions, settingsReducer, type Settings } from './settings';

export type Language = 'pt' | 'en';

export interface GameSlice {
  levelIndex: number;
  history: History;
  /** One letter per step in the undo history (see resume.ts), so the board can be saved and rebuilt. */
  steps: string;
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
    steps: '',
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
      state.steps = '';
      state.events = [];
      const { paletteId, bag, seed } = drawPalette(state.paletteBag, state.paletteSeed, state.paletteId);
      state.paletteId = paletteId;
      state.paletteBag = bag;
      state.paletteSeed = seed;
    },
    move(state, action: PayloadAction<Direction>) {
      const { state: nextGameState, events } = engineMove(state.history.present, action.payload);
      const pastStateCount = state.history.pastStates.length;
      state.history = record(state.history, nextGameState);
      if (state.history.pastStates.length > pastStateCount) state.steps += STEP_LETTER_BY_DIRECTION[action.payload];
      state.events = events;
    },
    undo(state) {
      const pastStateCount = state.history.pastStates.length;
      state.history = undoHistory(state.history);
      if (state.history.pastStates.length < pastStateCount) state.steps = state.steps.slice(0, -1);
      state.events = [];
    },
    reset(state) {
      const pastStateCount = state.history.pastStates.length;
      state.history = resetHistory(state.history);
      if (state.history.pastStates.length > pastStateCount) state.steps += RESTART_STEP_LETTER;
      state.events = [];
    },
    /** Opens the level the player left, rebuilt from its saved steps, in the palette it had. */
    resumed(state, action: PayloadAction<{ levelIndex: number; steps: string; paletteId: PaletteId | null }>) {
      const { levelIndex, steps, paletteId } = action.payload;
      const replay = replaySteps(levels[levelIndex], steps);
      state.levelIndex = levelIndex;
      state.history = replay.history;
      state.steps = replay.steps;
      state.events = [];
      if (paletteId) {
        state.paletteId = paletteId;
        state.paletteBag = state.paletteBag.filter((baggedPaletteId) => baggedPaletteId !== paletteId);
      }
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload;
    },
  },
  extraReducers: (builder) => {
    // A language the player picked wins over the phone's.
    builder.addCase(settingsActions.setLanguageChoice, (state, action) => {
      if (action.payload !== 'phone') state.language = action.payload;
    });
    builder.addCase(settingsActions.loadedSettings, (state, action) => {
      if (action.payload.languageChoice !== 'phone') state.language = action.payload.languageChoice;
    });
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

/** Records a win in the player's progress, right after the move that won. */
const recordWins: Middleware<{}, RootState> = (store) => (next) => (action) => {
  const result = next(action);
  if (actions.move.match(action)) {
    const { events, levelIndex } = store.getState().game;
    const wonEvent = events.find((event): event is Extract<GameEvent, { type: 'won' }> => event.type === 'won');
    if (wonEvent) store.dispatch(progressActions.recordWin({ levelId: levels[levelIndex].id, moveCount: wonEvent.moveCount }));
  }
  return result;
};

/** `paletteSeed` starts the palette draws; tests pass one to get the same palettes every run. */
export function createStore(language: Language, paletteSeed: number = randomSeed()) {
  return configureStore({
    reducer: { game: game.reducer, settings: settingsReducer, progress: progressReducer },
    preloadedState: { game: initialState(language, paletteSeed), settings: DEFAULT_SETTINGS, progress: EMPTY_PROGRESS },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(recordWins, logActions),
  });
}

export type AppStore = ReturnType<typeof createStore>;
export type RootState = { game: GameSlice; settings: Settings; progress: Progress };

/** The palette the board is drawn in: the player's favourite if they chose one, otherwise the level's draw. */
export function selectPaletteId(rootState: RootState): PaletteId {
  const { paletteChoice } = rootState.settings;
  return paletteChoice === 'random' ? rootState.game.paletteId : paletteChoice;
}

/** The palette the next level will draw, or null when the player keeps one favourite. */
export function selectNextPaletteId(rootState: RootState): PaletteId | null {
  if (rootState.settings.paletteChoice !== 'random') return null;
  const { paletteBag, paletteSeed, paletteId } = rootState.game;
  return drawPalette(paletteBag, paletteSeed, paletteId).paletteId;
}
