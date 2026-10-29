import { describe, expect, it } from 'vitest';
import { legalMoves, loadLevel, move, record, reset, startHistory, undo, validateLevel, type GameState } from '../src/core';
import { levels } from '../src/levels/index';
import { customLevelState, levelById, play, shortestWin } from './helpers';

const deepFreeze = <ValueType>(object: ValueType): ValueType => {
  Object.values(object as object).forEach((value) => typeof value === 'object' && value !== null && deepFreeze(value));
  return Object.freeze(object);
};
const tileColours = (state: GameState) => state.tiles.map((tile) => tile.colour[0]).join('');

describe('levels', () => {
  it('every level loads without errors', () => {
    expect(levels).toHaveLength(19);
    for (const levelData of levels) expect(validateLevel(levelData), levelData.id).toEqual([]);
  });

  it('level ids are unique', () => {
    expect(new Set(levels.map((levelData) => levelData.id)).size).toBe(levels.length);
  });

  it('rejects broken levels', () => {
    const base = { version: 2 as const, id: 'x', chapter: 'x', order: 0, start: [0, 0] as [number, number] };
    expect(validateLevel({ ...base, grid: ['b w', 'w B'], portals: [[0, 0, 'up']] })).toContain('portal-outside');
    expect(validateLevel({ ...base, grid: ['b b', 'w B'], portals: [[0, 0, 'right']] })).toContain('portal-same-colour');
    expect(validateLevel({ ...base, grid: ['b w', 'w B'], portals: [[0, 0, 'right'], [0, 1, 'left']] })).toContain('portal-duplicate');
    expect(validateLevel({ ...base, grid: ['b w', 'w b'] })).toContain('no-goal');
    expect(validateLevel({ ...base, grid: ['b w', 'w'] })).toContain('grid-ragged');
    expect(validateLevel({ ...base, grid: ['b x', 'w B'] })).toContain('grid-symbol');
    expect(validateLevel({ ...base, grid: ['B w', 'w b'] })).toContain('start-on-goal');
  });

  it('the player starts as the opposite of the start tile', () => {
    expect(loadLevel(levelById('draft-01')).player.colour).toBe('black');
    expect(loadLevel(levelById('sample-a')).player.colour).toBe('white');
  });
});

describe('walking and pushing', () => {
  // Player is white (stands on black). Black is floor, white blocks.
  const startState = customLevelState(['b w b b', 'b b b W'], [0, 0]);

  it('walks onto floor and is blocked by the board edge', () => {
    const movedDown = move(startState, 'down');
    expect(movedDown.state.player).toMatchObject({ row: 1, column: 0 });
    expect(movedDown.events).toEqual([{ type: 'moved', from: { row: 0, column: 0 }, to: { row: 1, column: 0 } }]);
    const blockedAtEdge = move(startState, 'up');
    expect(blockedAtEdge.state).toBe(startState);
    expect(blockedAtEdge.events).toEqual([{ type: 'blocked', reason: 'edge', direction: 'up' }]);
  });

  it('pushes a tile of your colour onto floor and steps into its place', () => {
    const result = move(startState, 'right');
    expect(tileColours(result.state)).toBe('bbwb' + 'bbbw');
    expect(result.state.player).toMatchObject({ row: 0, column: 1 });
    expect(result.events[0]).toMatchObject({ type: 'pushed', from: { row: 0, column: 1 }, to: { row: 0, column: 2 } });
    expect(result.state.moveCount).toBe(1);
  });

  it('refuses pushes off the board, into your colour, or onto the goal', () => {
    const pushAtEdgeState = customLevelState(['b w', 'b W'], [0, 0]);
    expect(move(pushAtEdgeState, 'right').events).toEqual([{ type: 'pushRefused', reason: 'edge', at: { row: 0, column: 1 } }]);
    const pushIntoOwnColourState = customLevelState(['b w w', 'b b W'], [0, 0]);
    expect(move(pushIntoOwnColourState, 'right').events[0]).toMatchObject({ reason: 'ownColour' });
    const pushOntoGoalState = customLevelState(['b w B', 'b b b'], [0, 0]); // goal is black: floor, but nothing may be pushed onto it
    expect(move(pushOntoGoalState, 'right').events[0]).toMatchObject({ reason: 'goal' });
  });

  it('can push the goal itself when it is your colour', () => {
    const state = customLevelState(['b W b', 'b b b'], [0, 0]);
    const result = move(state, 'right');
    expect(result.state.tiles[2].goal).toBe(true);
    expect(result.state.status).toBe('playing');
  });

  it('never changes the state it is given', () => {
    const state = deepFreeze(customLevelState(['b w b b', 'b b b W'], [0, 0]));
    expect(() => play(state, 'RDRRL')).not.toThrow();
  });
});

describe('portals', () => {
  it('going through a portal flips your colour and leaves the portal on its edge', () => {
    // White player on black; portal on the edge between (0,0) black and (0,1) white.
    const state = customLevelState(['b w b', 'b w W'], [0, 0], [[0, 0, 'right']]);
    const result = move(state, 'right');
    expect(result.state.player).toEqual({ row: 0, column: 1, colour: 'black' });
    expect(result.state.portals).toEqual(state.portals);
    expect(result.events[0]).toMatchObject({ type: 'flipped', colour: 'black' });
    // And back again.
    const steppedBack = move(result.state, 'left');
    expect(steppedBack.state.player).toEqual({ row: 0, column: 0, colour: 'white' });
  });

  it('a pushed tile carries its portals, including the afterFirstCrystal on its leading edge', () => {
    // White player at (1,0). (1,1) is white with a portal on its top and right edges.
    const state = customLevelState(['b b b b', 'b w b b', 'b b b W'], [1, 0], [[1, 1, 'up'], [1, 1, 'right']]);
    const result = move(state, 'right');
    expect(result.state.portals).toEqual([
      { row: 0, column: 2, side: 'down' },
      { row: 1, column: 2, side: 'right' },
    ]);
    expect(result.events.filter((event) => event.type === 'portalMoved')).toHaveLength(2);
  });

  it('refuses a push that would leave a portal between two tiles of afterFirstCrystal colour, or facing the edge', () => {
    // Portal between (0,1) white and (1,1) black. Pushing (0,1) right would put it
    // between (0,2) and (1,2), both white.
    const state = customLevelState(['b w b', 'b b W'], [0, 0], [[0, 1, 'down']]);
    const result = move(state, 'right');
    expect(result.events[0]).toMatchObject({ type: 'pushRefused', reason: 'portal' });
    expect(result.state).toBe(state);
    const portalAtEdgeState = customLevelState(['b w b', 'b b W'], [0, 0], [[0, 1, 'right']]);
    expect(move(portalAtEdgeState, 'right').events[0]).toMatchObject({ reason: 'portal' }); // portal would face off the board
  });

  it('a plain block cannot bury a portal (portal as a doorstop)', () => {
    // Portal between (0,2) black floor and (0,3) white. Pushing (0,1) white onto (0,2) makes both sides white.
    const state = customLevelState(['b w b w', 'b b b W'], [0, 0], [[0, 2, 'right']]);
    expect(move(state, 'right').events[0]).toMatchObject({ type: 'pushRefused', reason: 'portal' });
  });
});

describe('winning', () => {
  it('reaching the goal wins and stops further moves', () => {
    const state = play(customLevelState(['b b', 'w B'], [0, 0]), '');
    const result = move(move(state, 'right').state, 'down');
    expect(result.state.status).toBe('won');
    expect(result.events.map((event) => event.type)).toEqual(['moved', 'collected', 'won']);
    expect(move(result.state, 'up').events).toEqual([{ type: 'blocked', reason: 'won', direction: 'up' }]);
  });

  it('can win by stepping through a portal onto the goal', () => {
    const state = customLevelState(['b W', 'b b'], [0, 0], [[0, 0, 'right']]);
    expect(move(state, 'right').state.status).toBe('won');
  });

  it('needs every crystal when there are several', () => {
    const state = customLevelState(['b B', 'b B'], [0, 0]); // white player walks on black crystals
    const afterFirstCrystal = move(state, 'right').state;
    expect(afterFirstCrystal.status).toBe('playing');
    expect(play(afterFirstCrystal, 'L').status).toBe('playing');
    expect(play(afterFirstCrystal, 'D').status).toBe('won');
  });
});

describe('sample levels', () => {
  // Shortest solutions from the design doc, found by the separate tiny solver.
  const solvedSamples: [string, string, number][] = [
    ['sample-a', 'RRRU', 4],
    ['sample-b', 'UUUURRRR', 8],
    ['sample-c', 'RURRRULLLL', 10],
    ['sample-d', 'RDDRUURRUU', 10],
    ['sample-e', 'URURDRRUUR', 10],
  ];
  for (const [levelId, path, shortestMoveCount] of solvedSamples) {
    it(`${levelId} is won by the known solution in ${shortestMoveCount} moves, and no faster`, () => {
      const startState = loadLevel(levelById(levelId));
      const endState = play(startState, path);
      expect(endState.status).toBe('won');
      expect(endState.moveCount).toBe(shortestMoveCount);
      expect(shortestWin(startState)).toBe(shortestMoveCount);
    });
  }
});

describe('helpers', () => {
  it('legalMoves lists only moves that change something', () => {
    const state = customLevelState(['b w w', 'b b W'], [0, 0]);
    expect(legalMoves(state)).toEqual(['down']);
  });

  it('undo and reset walk back through history', () => {
    const state = customLevelState(['b b b', 'b b W'], [0, 0]);
    let history = startHistory(state);
    history = record(history, move(history.present, 'right').state);
    history = record(history, move(history.present, 'up').state); // blocked: not recorded
    history = record(history, move(history.present, 'right').state);
    expect(history.pastStates).toHaveLength(2);
    expect(undo(history).present.player.column).toBe(1);
    expect(reset(history).present).toBe(state);
    expect(undo(startHistory(state)).present).toBe(state);
  });

  it('restart can be undone, and restarting at the start changes nothing', () => {
    const state = customLevelState(['b b b', 'b b W'], [0, 0]);
    let history = startHistory(state);
    history = record(history, move(history.present, 'right').state);
    history = record(history, move(history.present, 'right').state);
    const beforeRestart = history.present;
    const restarted = reset(history);
    expect(restarted.present).toBe(state);
    expect(undo(restarted).present).toBe(beforeRestart);
    expect(reset(restarted)).toBe(restarted);
    expect(reset(startHistory(state)).present).toBe(state);
  });
});
