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
    expect(game().history.pastStates).toEqual([]);
  });
});

describe('settings', () => {
  it('starts with sound and vibration on and switches each one separately', () => {
    const store = createStore('en');
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: true });
    store.dispatch(settingsActions.setSoundOn(false));
    expect(store.getState().settings).toEqual({ soundOn: false, vibrationOn: true });
    store.dispatch(settingsActions.setVibrationOn(false));
    store.dispatch(settingsActions.loadedSettings({ soundOn: true, vibrationOn: false }));
    expect(store.getState().settings).toEqual({ soundOn: true, vibrationOn: false });
  });

  it('loads saved settings, filling anything missing, mistyped or unreadable with its default', () => {
    expect(settingsFromSaved(JSON.stringify({ soundOn: false, vibrationOn: false }))).toEqual({ soundOn: false, vibrationOn: false });
    expect(settingsFromSaved(JSON.stringify({ soundOn: false }))).toEqual({ soundOn: false, vibrationOn: true });
    expect(settingsFromSaved(JSON.stringify({ soundOn: 'no', unknownSetting: 1 }))).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved('not json')).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromSaved(null)).toEqual(DEFAULT_SETTINGS);
  });
});
