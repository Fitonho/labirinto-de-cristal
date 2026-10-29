import { describe, expect, it } from 'vitest';
import { levels } from '../src/levels/index';
import { drawPalette, PALETTE_IDS, type PaletteId } from '../src/state/palettes';
import { DEFAULT_SETTINGS, settingsActions, settingsFromSaved } from '../src/state/settings';
import { actions, createStore, selectPaletteId } from '../src/state/store';

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
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: true, tapMovesOn: true, paletteChoice: 'random' });
    store.dispatch(settingsActions.setSoundOn(false));
    expect(store.getState().settings).toEqual({ soundOn: false, vibrationOn: true, tapMovesOn: true, paletteChoice: 'random' });
    store.dispatch(settingsActions.setTapMovesOn(false));
    expect(store.getState().settings).toEqual({ soundOn: false, vibrationOn: true, tapMovesOn: false, paletteChoice: 'random' });
    store.dispatch(settingsActions.setVibrationOn(false));
    store.dispatch(settingsActions.loadedSettings({ soundOn: true, vibrationOn: false, tapMovesOn: true, paletteChoice: 'moss' }));
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: false, tapMovesOn: true, paletteChoice: 'moss' });
  });

  it('loads saved settings, filling anything missing, mistyped or unreadable with its default', () => {
    expect(settingsFromSaved(JSON.stringify({ soundOn: false, vibrationOn: false, tapMovesOn: false, paletteChoice: 'teal' }))).toEqual({
      soundOn: false,
      vibrationOn: false,
      tapMovesOn: false,
      paletteChoice: 'teal',
    });
    // A save from before tap moves and palettes existed gets tap moves on and random colours.
    expect(settingsFromSaved(JSON.stringify({ soundOn: false, vibrationOn: true }))).toEqual({
      soundOn: false,
      vibrationOn: true,
      tapMovesOn: true,
      paletteChoice: 'random',
    });
    // A palette that no longer exists falls back to random.
    expect(settingsFromSaved(JSON.stringify({ paletteChoice: 'classic' })).paletteChoice).toBe('random');
    expect(settingsFromSaved(JSON.stringify({ soundOn: 'no', unknownSetting: 1 }))).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved('not json')).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved(null)).toEqual(DEFAULT_SETTINGS);
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
