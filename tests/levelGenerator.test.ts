// The level generator and the Lab: generated boards really need what was asked
// for, tidying keeps the solution's length, and a board survives the trip
// through a page address.
import { describe, expect, it } from 'vitest';
import { loadLevel, move } from '../src/core';
import { directionsFor, levelFromLink, linkQueryFor, solutionLettersFor, type LabLevel } from '../src/levels/lab';
import { boardNoise, DEFAULT_GENERATOR_OPTIONS, generateLevel, seededRandom, type GeneratorOptions } from '../src/tools/levelGenerator';
import { searchShortest } from '../src/tools/solver';

const smallOptions: GeneratorOptions = {
  ...DEFAULT_GENERATOR_OPTIONS,
  columnCount: 4,
  rowCount: 4,
  mechanics: ['push'],
  portalCount: 0,
  minMoves: 4,
  maxMoves: 12,
  climbStepCount: 60,
};

describe('level generator', () => {
  it('finds a level whose solution wins, within the moves asked for, that needs a push', () => {
    const random = seededRandom(7);
    let generated = null;
    for (let tryIndex = 0; tryIndex < 10 && !generated; tryIndex++) generated = generateLevel(smallOptions, random);
    expect(generated).not.toBeNull();
    const { level, solution } = generated!;
    let state = loadLevel(level);
    for (const direction of solution) state = move(state, direction).state;
    expect(state.status).toBe('won');
    expect(level.par).toBe(solution.length);
    expect(solution.length).toBeGreaterThanOrEqual(smallOptions.minMoves);
    expect(solution.length).toBeLessThanOrEqual(smallOptions.maxMoves);
    const withoutPushes = searchShortest(loadLevel(level), 30_000, (events) => !events.some((event) => event.type === 'pushed'));
    expect(withoutPushes).toMatchObject({ solution: null, exhausted: true });
  });

  it('repeats a run from the same seed', () => {
    const first = generateLevel(smallOptions, seededRandom(3));
    const second = generateLevel(smallOptions, seededRandom(3));
    expect(second).toEqual(first);
  });

  it('counts how busy a board looks', () => {
    expect(boardNoise(['w w', 'w w'])).toBe(0);
    expect(boardNoise(['w b', 'w W'])).toBe(2);
  });
});

describe('Lab links', () => {
  const labLevel: LabLevel = {
    version: 2,
    id: 'lab-link',
    chapter: 'lab',
    order: 0,
    grid: ['w w B', 'b w w'],
    start: [0, 0],
    portals: [[1, 1, 'right']],
    par: 3,
    solution: 'rrd',
  };

  it('brings a board back whole from its page address', () => {
    expect(levelFromLink(linkQueryFor(labLevel))).toEqual(labLevel);
    expect(levelFromLink('?debug')).toBeNull();
  });

  it('turns a solution into moves and back', () => {
    expect(directionsFor('udlr')).toEqual(['up', 'down', 'left', 'right']);
    expect(solutionLettersFor(['up', 'down', 'left', 'right'])).toBe('udlr');
  });
});
