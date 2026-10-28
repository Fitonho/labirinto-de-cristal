import { describe, expect, it } from 'vitest';
import { DIRECTIONS, loadLevel, move, type GameState } from '../src/core';
import { levels } from '../src/levels/index';
import { side, wallState } from './legacy/block';
import { Levels } from './legacy/levels';
import { LegacyGame, legacyLevelNames } from './legacy/rules';

// Plays the same random moves in the original rules and in the engine and
// checks they agree, as long as the original game is in a state the agreed
// spec covers. The two deliberate differences stop a walk early:
// - a push the engine refuses because it would break a door (portal rule 6);
// - a door that is not on the player's-colour side, which the old game hid
//   and ignored (only level 13 starts like that).

const legacyLevels = new Levels() as any;
const names = legacyLevelNames(legacyLevels);
const dirToSide = { up: side.Top, right: side.Right, down: side.Bottom, left: side.Left };
const sideNames = ['up', 'right', 'down', 'left'] as const;

function rng(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

function colourOf(hex: string) {
  return hex === '#000000' ? 'black' : 'white';
}

/** Doors in the old game, as edges, or null if any breaks the agreed rules. */
function legacyDoors(g: LegacyGame) {
  const out: string[] = [];
  for (let i = 0; i < g.M; i++)
    for (let j = 0; j < g.N; j++)
      for (let k = 0; k < 4; k++) {
        if (g.matriz[i][j].walls[k] !== wallState.portal) continue;
        if (g.matriz[i][j].color !== g.playerColor) return null;
        const di = [-1, 0, 1, 0][k], dj = [0, 1, 0, -1][k];
        const [a, b] = [i + di, j + dj];
        if (a < 0 || a >= g.M || b < 0 || b >= g.N) return null;
        if (g.matriz[a][b].color === g.matriz[i][j].color) return null;
        out.push(edgeKey(i, j, sideNames[k]));
      }
  return out.sort();
}

function edgeKey(i: number, j: number, s: string) {
  if (s === 'left') return `${i},${j - 1},right`;
  if (s === 'up') return `${i - 1},${j},down`;
  return `${i},${j},${s}`;
}

function engineDoors(s: GameState) {
  return s.doors.map((d) => `${d.row},${d.col},${d.side}`).sort();
}

function snapshot(g: LegacyGame) {
  return {
    player: [...g.playerPos, colourOf(g.playerColor)],
    tiles: g.matriz.flat().map((b) => colourOf(b.color)[0] + (b.event ? '*' : '')).join(''),
  };
}

function engineSnapshot(s: GameState) {
  return {
    player: [s.player.row, s.player.col, s.player.colour],
    tiles: s.tiles.map((t) => t.colour[0] + (t.goal ? '*' : '')).join(''),
  };
}

describe('engine matches the original rules', () => {
  names.forEach((name, n) => {
    const data = levels[n];
    it(`${name} (${data.id})`, () => {
      const random = rng(n + 1);
      let compared = 0;
      const seen = new Set<string>();
      for (let walk = 0; walk < 100; walk++) {
        const g = new LegacyGame(legacyLevels[name]);
        let s = loadLevel(data);
        for (let m = 0; m < 150; m++) {
          const doors = legacyDoors(g);
          if (doors === null) break;
          expect(snapshot(g)).toEqual(engineSnapshot(s));
          expect(doors).toEqual(engineDoors(s));
          compared++;
          if (s.status === 'won') {
            expect(g.won).toBe(true);
            break;
          }
          const dir = DIRECTIONS[Math.floor(random() * 4)];
          const r = move(s, dir);
          if (r.events.some((e) => e.type === 'pushRefused' && e.reason === 'door')) {
            break;
          }
          r.events.forEach((e) => seen.add(e.type));
          g.move(dirToSide[dir]);
          s = r.state;
        }
      }
      if (data.id === 'draft-13') return expect(compared).toBe(0);
      expect(compared).toBeGreaterThan(3000);
      // The walks must have exercised pushes and door flips, not just walking.
      expect([...seen]).toEqual(expect.arrayContaining(['moved', 'pushed', 'flipped', 'pushRefused']));
    });
  });
});
