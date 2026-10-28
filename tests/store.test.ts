import { describe, expect, it } from 'vitest';
import { levels } from '../src/levels/index';
import { actions, createStore } from '../src/web/store';

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
