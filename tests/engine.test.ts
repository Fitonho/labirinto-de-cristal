import { describe, expect, it } from 'vitest';
import { legalMoves, loadLevel, move, record, reset, startHistory, undo, validateLevel, type GameState } from '../src/core';
import { levels } from '../src/levels/index';
import { custom, level, play, shortestWin } from './helpers';

const deepFreeze = <T>(o: T): T => {
  Object.values(o as object).forEach((v) => typeof v === 'object' && v !== null && deepFreeze(v));
  return Object.freeze(o);
};
const tileColours = (s: GameState) => s.tiles.map((t) => t.colour[0]).join('');

describe('levels', () => {
  it('every level loads without errors', () => {
    expect(levels).toHaveLength(19);
    for (const l of levels) expect(validateLevel(l), l.id).toEqual([]);
  });

  it('level ids are unique', () => {
    expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length);
  });

  it('rejects broken levels', () => {
    const base = { version: 1 as const, id: 'x', chapter: 'x', order: 0, start: [0, 0] as [number, number] };
    expect(validateLevel({ ...base, grid: ['b w', 'w B'], doors: [[0, 0, 'up']] })).toContain('door-outside');
    expect(validateLevel({ ...base, grid: ['b b', 'w B'], doors: [[0, 0, 'right']] })).toContain('door-same-colour');
    expect(validateLevel({ ...base, grid: ['b w', 'w B'], doors: [[0, 0, 'right'], [0, 1, 'left']] })).toContain('door-duplicate');
    expect(validateLevel({ ...base, grid: ['b w', 'w b'] })).toContain('no-goal');
    expect(validateLevel({ ...base, grid: ['b w', 'w'] })).toContain('grid-ragged');
    expect(validateLevel({ ...base, grid: ['b x', 'w B'] })).toContain('grid-symbol');
    expect(validateLevel({ ...base, grid: ['B w', 'w b'] })).toContain('start-on-goal');
  });

  it('the player starts as the opposite of the start tile', () => {
    expect(loadLevel(level('draft-01')).player.colour).toBe('black');
    expect(loadLevel(level('sample-a')).player.colour).toBe('white');
  });
});

describe('walking and pushing', () => {
  // Player is white (stands on black). Black is floor, white blocks.
  const s0 = custom(['b w b b', 'b b b W'], [0, 0]);

  it('walks onto floor and is blocked by the board edge', () => {
    const down = move(s0, 'down');
    expect(down.state.player).toMatchObject({ row: 1, col: 0 });
    expect(down.events).toEqual([{ type: 'moved', from: { row: 0, col: 0 }, to: { row: 1, col: 0 } }]);
    const up = move(s0, 'up');
    expect(up.state).toBe(s0);
    expect(up.events).toEqual([{ type: 'blocked', reason: 'edge' }]);
  });

  it('pushes a tile of your colour onto floor and steps into its place', () => {
    const r = move(s0, 'right');
    expect(tileColours(r.state)).toBe('bbwb' + 'bbbw');
    expect(r.state.player).toMatchObject({ row: 0, col: 1 });
    expect(r.events[0]).toMatchObject({ type: 'pushed', from: { row: 0, col: 1 }, to: { row: 0, col: 2 } });
    expect(r.state.moves).toBe(1);
  });

  it('refuses pushes off the board, into your colour, or onto the goal', () => {
    const edge = custom(['b w', 'b W'], [0, 0]);
    expect(move(edge, 'right').events).toEqual([{ type: 'pushRefused', reason: 'edge', at: { row: 0, col: 1 } }]);
    const own = custom(['b w w', 'b b W'], [0, 0]);
    expect(move(own, 'right').events[0]).toMatchObject({ reason: 'ownColour' });
    const goal = custom(['b w B', 'b b b'], [0, 0]); // goal is black: floor, but nothing may be pushed onto it
    expect(move(goal, 'right').events[0]).toMatchObject({ reason: 'goal' });
  });

  it('can push the goal itself when it is your colour', () => {
    const s = custom(['b W b', 'b b b'], [0, 0]);
    const r = move(s, 'right');
    expect(r.state.tiles[2].goal).toBe(true);
    expect(r.state.status).toBe('playing');
  });

  it('never changes the state it is given', () => {
    const s = deepFreeze(custom(['b w b b', 'b b b W'], [0, 0]));
    expect(() => play(s, 'RDRRL')).not.toThrow();
  });
});

describe('doors', () => {
  it('going through a door flips your colour and leaves the door on its edge', () => {
    // White player on black; door on the edge between (0,0) black and (0,1) white.
    const s = custom(['b w b', 'b w W'], [0, 0], [[0, 0, 'right']]);
    const r = move(s, 'right');
    expect(r.state.player).toEqual({ row: 0, col: 1, colour: 'black' });
    expect(r.state.doors).toEqual(s.doors);
    expect(r.events[0]).toMatchObject({ type: 'flipped', colour: 'black' });
    // And back again.
    const back = move(r.state, 'left');
    expect(back.state.player).toEqual({ row: 0, col: 0, colour: 'white' });
  });

  it('a pushed tile carries its doors, including the one on its leading edge', () => {
    // White player at (1,0). (1,1) is white with a door on its top and right edges.
    const s = custom(['b b b b', 'b w b b', 'b b b W'], [1, 0], [[1, 1, 'up'], [1, 1, 'right']]);
    const r = move(s, 'right');
    expect(r.state.doors).toEqual([
      { row: 0, col: 2, side: 'down' },
      { row: 1, col: 2, side: 'right' },
    ]);
    expect(r.events.filter((e) => e.type === 'doorMoved')).toHaveLength(2);
  });

  it('refuses a push that would leave a door between two tiles of one colour, or facing the edge', () => {
    // Door between (0,1) white and (1,1) black. Pushing (0,1) right would put it
    // between (0,2) and (1,2), both white.
    const s = custom(['b w b', 'b b W'], [0, 0], [[0, 1, 'down']]);
    const r = move(s, 'right');
    expect(r.events[0]).toMatchObject({ type: 'pushRefused', reason: 'door' });
    expect(r.state).toBe(s);
    const edge = custom(['b w b', 'b b W'], [0, 0], [[0, 1, 'right']]);
    expect(move(edge, 'right').events[0]).toMatchObject({ reason: 'door' }); // door would face off the board
  });

  it('a plain block cannot bury a door (door as a doorstop)', () => {
    // Door between (0,2) black floor and (0,3) white. Pushing (0,1) white onto (0,2) makes both sides white.
    const s = custom(['b w b w', 'b b b W'], [0, 0], [[0, 2, 'right']]);
    expect(move(s, 'right').events[0]).toMatchObject({ type: 'pushRefused', reason: 'door' });
  });
});

describe('winning', () => {
  it('reaching the goal wins and stops further moves', () => {
    const s = play(custom(['b b', 'w B'], [0, 0]), '');
    const r = move(move(s, 'right').state, 'down');
    expect(r.state.status).toBe('won');
    expect(r.events.map((e) => e.type)).toEqual(['moved', 'collected', 'won']);
    expect(move(r.state, 'up').events).toEqual([{ type: 'blocked', reason: 'won' }]);
  });

  it('can win by stepping through a door onto the goal', () => {
    const s = custom(['b W', 'b b'], [0, 0], [[0, 0, 'right']]);
    expect(move(s, 'right').state.status).toBe('won');
  });

  it('needs every crystal when there are several', () => {
    const s = custom(['b B', 'b B'], [0, 0]); // white player walks on black crystals
    const one = move(s, 'right').state;
    expect(one.status).toBe('playing');
    expect(play(one, 'L').status).toBe('playing');
    expect(play(one, 'D').status).toBe('won');
  });
});

describe('sample levels', () => {
  // Shortest solutions from the design doc, found by the separate tiny solver.
  const cases: [string, string, number][] = [
    ['sample-a', 'RRRU', 4],
    ['sample-b', 'UUUURRRR', 8],
    ['sample-c', 'RURRRULLLL', 10],
    ['sample-d', 'RDDRUURRUU', 10],
    ['sample-e', 'URURDRRUUR', 10],
  ];
  for (const [id, path, best] of cases) {
    it(`${id} is won by the known solution in ${best} moves, and no faster`, () => {
      const start = loadLevel(level(id));
      const end = play(start, path);
      expect(end.status).toBe('won');
      expect(end.moves).toBe(best);
      expect(shortestWin(start)).toBe(best);
    });
  }
});

describe('helpers', () => {
  it('legalMoves lists only moves that change something', () => {
    const s = custom(['b w w', 'b b W'], [0, 0]);
    expect(legalMoves(s)).toEqual(['down']);
  });

  it('undo and reset walk back through history', () => {
    const s = custom(['b b b', 'b b W'], [0, 0]);
    let h = startHistory(s);
    h = record(h, move(h.present, 'right').state);
    h = record(h, move(h.present, 'up').state); // blocked: not recorded
    h = record(h, move(h.present, 'right').state);
    expect(h.past).toHaveLength(2);
    expect(undo(h).present.player.col).toBe(1);
    expect(reset(h).present).toBe(s);
    expect(undo(startHistory(s)).present).toBe(s);
  });
});
