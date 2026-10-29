import { describe, expect, it } from 'vitest';
import { levels } from '../src/levels/index';
import { DEFAULT_SETTINGS, settingsActions, settingsFromSaved } from '../src/state/settings';
import { actions, createStore } from '../src/state/store';

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
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: true, tapMovesOn: true });
    store.dispatch(settingsActions.setSoundOn(false));
    expect(store.getState().settings).toEqual({ soundOn: false, vibrationOn: true, tapMovesOn: true });
    store.dispatch(settingsActions.setTapMovesOn(false));
    expect(store.getState().settings).toEqual({ soundOn: false, vibrationOn: true, tapMovesOn: false });
    store.dispatch(settingsActions.setVibrationOn(false));
    store.dispatch(settingsActions.loadedSettings({ soundOn: true, vibrationOn: false, tapMovesOn: true }));
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: false, tapMovesOn: true });
  });

  it('loads saved settings, filling anything missing, mistyped or unreadable with its default', () => {
    expect(settingsFromSaved(JSON.stringify({ soundOn: false, vibrationOn: false, tapMovesOn: false }))).toEqual({
      soundOn: false,
      vibrationOn: false,
      tapMovesOn: false,
    });
    // A save from before tap moves existed gets them switched on.
    expect(settingsFromSaved(JSON.stringify({ soundOn: false, vibrationOn: true }))).toEqual({ soundOn: false, vibrationOn: true, tapMovesOn: true });
    expect(settingsFromSaved(JSON.stringify({ soundOn: 'no', unknownSetting: 1 }))).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved('not json')).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved(null)).toEqual(DEFAULT_SETTINGS);
  });
});
