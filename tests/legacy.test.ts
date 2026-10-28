import { describe, expect, it } from 'vitest';
import { Levels } from './legacy/levels';
import { LegacyGame, legacyLevelNames } from './legacy/rules';
import { side } from './legacy/block';

// Pins down how the original game behaves, so the engine can be compared to it.
describe('legacy rules', () => {
  const levels = new Levels() as any;

  it('has 14 levels', () => {
    expect(legacyLevelNames(levels)).toHaveLength(14);
  });

  it('level 1: own colour blocks when it cannot be pushed, floor can be walked', () => {
    const g = new LegacyGame(levels.level_1);
    expect(g.playerPos).toEqual([8, 0]);
    expect(g.playerColor).toBe('#000000'); // start tile is white, so the player is black
    g.move(side.Right); // [8,1] is black with black behind it: no push
    expect(g.playerPos).toEqual([8, 0]);
    g.move(side.Top); // [7,0] is white floor
    expect(g.playerPos).toEqual([7, 0]);
  });
});
