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
const legacyNames = legacyLevelNames(legacyLevels);
const legacySidesByDirection = { up: side.Top, right: side.Right, down: side.Bottom, left: side.Left };
const sideNames = ['up', 'right', 'down', 'left'] as const;
const rowOffsets = [-1, 0, 1, 0];
const columnOffsets = [0, 1, 0, -1];

const WALKS_PER_LEVEL = 100;
const MOVES_PER_WALK = 150;

/** A small seeded random generator, so failures can be replayed. */
function seededRandom(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

function colourOf(hexColour: string) {
  return hexColour === '#000000' ? 'black' : 'white';
}

function edgeKey(row: number, column: number, sideName: string) {
  if (sideName === 'left') return `${row},${column - 1},right`;
  if (sideName === 'up') return `${row - 1},${column},down`;
  return `${row},${column},${sideName}`;
}

/** Doors in the old game, as edge keys, or null if any breaks the agreed rules. */
function legacyDoorKeys(legacyGame: LegacyGame) {
  const doorKeys: string[] = [];
  for (let row = 0; row < legacyGame.M; row++) {
    for (let column = 0; column < legacyGame.N; column++) {
      for (let sideIndex = 0; sideIndex < 4; sideIndex++) {
        const block = legacyGame.matriz[row][column];
        if (block.walls[sideIndex] !== wallState.portal) continue;
        if (block.color !== legacyGame.playerColor) return null;
        const neighbourRow = row + rowOffsets[sideIndex];
        const neighbourColumn = column + columnOffsets[sideIndex];
        const neighbourOutside =
          neighbourRow < 0 || neighbourRow >= legacyGame.M || neighbourColumn < 0 || neighbourColumn >= legacyGame.N;
        if (neighbourOutside) return null;
        if (legacyGame.matriz[neighbourRow][neighbourColumn].color === block.color) return null;
        doorKeys.push(edgeKey(row, column, sideNames[sideIndex]));
      }
    }
  }
  return doorKeys.sort();
}

function engineDoorKeys(state: GameState) {
  return state.doors.map((door) => `${door.row},${door.column},${door.side}`).sort();
}

function legacySnapshot(legacyGame: LegacyGame) {
  return {
    player: [...legacyGame.playerPos, colourOf(legacyGame.playerColor)],
    tiles: legacyGame.matriz
      .flat()
      .map((block) => colourOf(block.color)[0] + (block.event ? '*' : ''))
      .join(''),
  };
}

function engineSnapshot(state: GameState) {
  return {
    player: [state.player.row, state.player.column, state.player.colour],
    tiles: state.tiles.map((tile) => tile.colour[0] + (tile.goal ? '*' : '')).join(''),
  };
}

describe('engine matches the original rules', () => {
  legacyNames.forEach((legacyName, levelIndex) => {
    const levelData = levels[levelIndex];
    it(`${legacyName} (${levelData.id})`, () => {
      const random = seededRandom(levelIndex + 1);
      let comparedStateCount = 0;
      const seenEventTypes = new Set<string>();
      for (let walk = 0; walk < WALKS_PER_LEVEL; walk++) {
        const legacyGame = new LegacyGame(legacyLevels[legacyName]);
        let state = loadLevel(levelData);
        for (let moveNumber = 0; moveNumber < MOVES_PER_WALK; moveNumber++) {
          const legacyDoors = legacyDoorKeys(legacyGame);
          if (legacyDoors === null) break;
          expect(legacySnapshot(legacyGame)).toEqual(engineSnapshot(state));
          expect(legacyDoors).toEqual(engineDoorKeys(state));
          comparedStateCount++;
          if (state.status === 'won') {
            expect(legacyGame.won).toBe(true);
            break;
          }
          const direction = DIRECTIONS[Math.floor(random() * 4)];
          const result = move(state, direction);
          if (result.events.some((event) => event.type === 'pushRefused' && event.reason === 'door')) break;
          result.events.forEach((event) => seenEventTypes.add(event.type));
          legacyGame.move(legacySidesByDirection[direction]);
          state = result.state;
        }
      }
      if (levelData.id === 'draft-13') return expect(comparedStateCount).toBe(0);
      expect(comparedStateCount).toBeGreaterThan(3000);
      // The walks must have exercised pushes and door flips, not just walking.
      expect([...seenEventTypes]).toEqual(expect.arrayContaining(['moved', 'pushed', 'flipped', 'pushRefused']));
    });
  });
});
