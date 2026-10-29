import { describe, expect, it } from 'vitest';
import { levels } from '../src/levels/index';
import { drawPalette, PALETTE_IDS, type PaletteId } from '../src/state/palettes';
import { progressActions, progressFromSaved, progressToSave } from '../src/state/progress';
import { DEFAULT_SETTINGS, settingsActions, settingsFromSaved } from '../src/state/settings';
import { actions, createStore, selectNextPaletteId, selectPaletteId } from '../src/state/store';

describe('web store', () => {
  it('plays, undoes and resets through Redux actions', () => {
    const store = createStore('en');
    const sampleC = levels.findIndex((level) => level.id === 'sample-c');
    store.dispatch(actions.selectLevel(sampleC));
    for (const direction of ['right', 'up', 'right', 'right', 'right', 'up', 'left', 'left', 'left', 'left'] as const) {
      store.dispatch(actions.move(direction));
    }
    const game = () => store.getState().game;
    expect(game().history.present.status).toBe('won');
    expect(game().events.map((event) => event.type)).toContain('won');
    store.dispatch(actions.undo());
    expect(game().history.present.moveCount).toBe(9);
    store.dispatch(actions.reset());
    expect(game().history.present.moveCount).toBe(0);
    store.dispatch(actions.undo());
    expect(game().history.present.moveCount).toBe(9);
    store.dispatch(actions.reset());
    const restartedHistory = game().history;
    store.dispatch(actions.reset());
    expect(game().history).toBe(restartedHistory);
  });
});

describe('settings', () => {
  it('starts with sound, vibration and tap moves on and switches each one separately', () => {
    const store = createStore('en');
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: true, tapMovesOn: true, paletteChoice: 'random', languageChoice: 'phone', stuckTipSeen: false });
    store.dispatch(settingsActions.setSoundOn(false));
    expect(store.getState().settings).toEqual({ soundOn: false, vibrationOn: true, tapMovesOn: true, paletteChoice: 'random', languageChoice: 'phone', stuckTipSeen: false });
    store.dispatch(settingsActions.setTapMovesOn(false));
    expect(store.getState().settings).toEqual({ soundOn: false, vibrationOn: true, tapMovesOn: false, paletteChoice: 'random', languageChoice: 'phone', stuckTipSeen: false });
    store.dispatch(settingsActions.setVibrationOn(false));
    store.dispatch(settingsActions.loadedSettings({ soundOn: true, vibrationOn: false, tapMovesOn: true, paletteChoice: 'moss', languageChoice: 'phone', stuckTipSeen: false }));
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: false, tapMovesOn: true, paletteChoice: 'moss', languageChoice: 'phone', stuckTipSeen: false });
  });

  it('loads saved settings, filling anything missing, mistyped or unreadable with its default', () => {
    expect(settingsFromSaved(JSON.stringify({ soundOn: false, vibrationOn: false, tapMovesOn: false, paletteChoice: 'teal' }))).toEqual({
      soundOn: false,
      vibrationOn: false,
      tapMovesOn: false,
      paletteChoice: 'teal',
      languageChoice: 'phone',
      stuckTipSeen: false,
    });
    // A save from before tap moves and palettes existed gets tap moves on and random colours.
    expect(settingsFromSaved(JSON.stringify({ soundOn: false, vibrationOn: true }))).toEqual({
      soundOn: false,
      vibrationOn: true,
      tapMovesOn: true,
      paletteChoice: 'random',
      languageChoice: 'phone',
      stuckTipSeen: false,
    });
    // A palette that no longer exists falls back to random.
    expect(settingsFromSaved(JSON.stringify({ paletteChoice: 'classic' })).paletteChoice).toBe('random');
    expect(settingsFromSaved(JSON.stringify({ languageChoice: 'fr' })).languageChoice).toBe('phone');
    expect(settingsFromSaved(JSON.stringify({ soundOn: 'no', unknownSetting: 1 }))).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved('not json')).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps a language the player picked over the phone\'s, also after loading it', () => {
    const store = createStore('pt');
    store.dispatch(settingsActions.setLanguageChoice('en'));
    expect(store.getState().game.language).toBe('en');
    const reopenedStore = createStore('pt');
    reopenedStore.dispatch(settingsActions.loadedSettings(settingsFromSaved(JSON.stringify(store.getState().settings))));
    expect(reopenedStore.getState().game.language).toBe('en');
    // Following the phone leaves the phone's language alone.
    const phoneStore = createStore('pt');
    phoneStore.dispatch(settingsActions.loadedSettings(DEFAULT_SETTINGS));
    expect(phoneStore.getState().game.language).toBe('pt');
  });
});

describe('board palettes', () => {
  it('shows every palette once before any repeats, and never the same one twice in a row', () => {
    let bag: PaletteId[] = [];
    let seed = 12345;
    let lastPaletteId: PaletteId | null = null;
    const drawnPaletteIds: PaletteId[] = [];
    for (let drawIndex = 0; drawIndex < PALETTE_IDS.length * 5; drawIndex++) {
      const draw = drawPalette(bag, seed, lastPaletteId);
      expect(draw.paletteId).not.toBe(lastPaletteId);
      drawnPaletteIds.push(draw.paletteId);
      ({ bag, seed } = draw);
      lastPaletteId = draw.paletteId;
    }
    for (let roundStart = 0; roundStart < drawnPaletteIds.length; roundStart += PALETTE_IDS.length) {
      const round = drawnPaletteIds.slice(roundStart, roundStart + PALETTE_IDS.length);
      expect([...round].sort()).toEqual([...PALETTE_IDS].sort());
    }
  });

  it('draws the same palettes from the same seed, and different orders from different seeds', () => {
    const roundFrom = (seed: number) => {
      const paletteIds: PaletteId[] = [];
      let draw = drawPalette([], seed, null);
      paletteIds.push(draw.paletteId);
      while (draw.bag.length > 0) {
        draw = drawPalette(draw.bag, draw.seed, draw.paletteId);
        paletteIds.push(draw.paletteId);
      }
      return paletteIds;
    };
    expect(roundFrom(7)).toEqual(roundFrom(7));
    expect(roundFrom(7)).not.toEqual(roundFrom(8));
  });

  it('draws a new palette for each selected level, and keeps it through moves, undo and restart', () => {
    const store = createStore('en', 99);
    const paletteId = () => store.getState().game.paletteId;
    const firstPaletteId = paletteId();
    store.dispatch(actions.selectLevel(1));
    const levelPaletteId = paletteId();
    expect(levelPaletteId).not.toBe(firstPaletteId);
    store.dispatch(actions.move('right'));
    store.dispatch(actions.undo());
    store.dispatch(actions.reset());
    store.dispatch(actions.setLanguage('pt'));
    expect(paletteId()).toBe(levelPaletteId);
    store.dispatch(actions.selectLevel(1));
    expect(paletteId()).not.toBe(levelPaletteId);
  });

  it('uses the favourite palette on every level when the player picks one', () => {
    const store = createStore('en', 3);
    expect(selectPaletteId(store.getState())).toBe(store.getState().game.paletteId);
    store.dispatch(settingsActions.setPaletteChoice('clay'));
    expect(selectPaletteId(store.getState())).toBe('clay');
    store.dispatch(actions.selectLevel(2));
    expect(selectPaletteId(store.getState())).toBe('clay');
    store.dispatch(settingsActions.setPaletteChoice('random'));
    expect(selectPaletteId(store.getState())).toBe(store.getState().game.paletteId);
  });
});

describe('progress', () => {
  const sampleCMoves = ['right', 'up', 'right', 'right', 'right', 'up', 'left', 'left', 'left', 'left'] as const;
  const winSampleC = (store: ReturnType<typeof createStore>) => {
    store.dispatch(actions.selectLevel(levels.findIndex((level) => level.id === 'sample-c')));
    for (const direction of sampleCMoves) store.dispatch(actions.move(direction));
    expect(store.getState().game.history.present.status).toBe('won');
  };

  it('records each win with the best before it, and keeps the fewest moves', () => {
    const store = createStore('en', 1);
    winSampleC(store);
    expect(store.getState().progress.lastWin).toEqual({ levelId: 'sample-c', moveCount: 10, previousBestMoves: null });
    store.dispatch(progressActions.recordWin({ levelId: 'sample-c', moveCount: 12 }));
    expect(store.getState().progress.lastWin).toEqual({ levelId: 'sample-c', moveCount: 12, previousBestMoves: 10 });
    store.dispatch(progressActions.recordWin({ levelId: 'sample-c', moveCount: 8 }));
    expect(store.getState().progress.lastWin).toEqual({ levelId: 'sample-c', moveCount: 8, previousBestMoves: 10 });
    expect(store.getState().progress.bestMovesByLevelId).toEqual({ 'sample-c': 8 });
  });

  it('records nothing for a move that does not win', () => {
    const store = createStore('en', 1);
    store.dispatch(actions.move('right'));
    expect(store.getState().progress).toEqual({ bestMovesByLevelId: {}, lastWin: null });
  });

  it('saves the bests and the current level, loads them back, and keeps the better best after loading', () => {
    const store = createStore('en', 1);
    winSampleC(store);
    const savedText = progressToSave(store.getState().progress, 'sample-c');
    expect(JSON.parse(savedText)).toEqual({ version: 2, bestMovesByLevelId: { 'sample-c': 10 }, currentLevelId: 'sample-c' });
    expect(progressFromSaved(savedText)).toEqual({ bestMovesByLevelId: { 'sample-c': 10 }, currentLevelId: 'sample-c' });
    store.dispatch(progressActions.loadedBests({ 'sample-c': 14, 'sample-a': 6 }));
    expect(store.getState().progress.bestMovesByLevelId).toEqual({ 'sample-c': 10, 'sample-a': 6 });
  });

  it('loads a version 1 file, which saved only the bests', () => {
    expect(progressFromSaved('{"bestMovesByLevelId": {"sample-a": 4}}')).toEqual({ bestMovesByLevelId: { 'sample-a': 4 }, currentLevelId: null });
  });

  it('ignores a broken or odd progress file', () => {
    const empty = { bestMovesByLevelId: {}, currentLevelId: null };
    expect(progressFromSaved(null)).toEqual(empty);
    expect(progressFromSaved('not json')).toEqual(empty);
    expect(progressFromSaved('{"bestMovesByLevelId": {"a": 3, "b": "4", "c": -1, "d": 2.5}, "currentLevelId": 7}')).toEqual({
      bestMovesByLevelId: { a: 3 },
      currentLevelId: null,
    });
  });

  it('forgets every win on a reset', () => {
    const store = createStore('en', 1);
    winSampleC(store);
    store.dispatch(progressActions.resetProgress());
    expect(store.getState().progress).toEqual({ bestMovesByLevelId: {}, lastWin: null });
  });

  it('peeks at the palette the next level will draw, and at none with a favourite', () => {
    const store = createStore('en', 7);
    const peekedPaletteId = selectNextPaletteId(store.getState());
    store.dispatch(actions.selectLevel(1));
    expect(selectPaletteId(store.getState())).toBe(peekedPaletteId);
    store.dispatch(settingsActions.setPaletteChoice('forest'));
    expect(selectNextPaletteId(store.getState())).toBeNull();
  });
});
