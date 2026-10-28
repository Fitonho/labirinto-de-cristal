import { describe, expect, it } from 'vitest';
import { loadLevel, move } from '../src/core';
import {
  boxOutline,
  doorSidesByTileIndex,
  floorColour,
  isBox,
  MAX_TILE_SIZE,
  seamFrame,
  seamPath,
  tileSizeFor,
} from '../src/ui/boardLayout';
import { BOX_INSET, SEAM_FRAME_WIDTH, SEAM_OVERLAP } from '../src/ui/theme';
import { swipeDirection } from '../src/ui/commands';
import { languageForLocale } from '../src/ui/i18n';
import { bumpDirectionFor, bumpOffset, motionFor } from '../src/ui/motion';
import { customLevelState, levelById } from './helpers';

describe('board layout', () => {
  it('lists a door on both tiles beside it, so either can show it after a flip', () => {
    // sample-b: the door sits between tiles 2 and 3 on the top row.
    const state = loadLevel(levelById('sample-b'));
    expect(doorSidesByTileIndex(state).get(2)).toEqual(['right']);
    expect(doorSidesByTileIndex(state).get(3)).toEqual(['left']);
    expect(doorSidesByTileIndex(state).has(1)).toBe(false);
  });

  it('draws the floor in the colour the boxes are not, and boxes in the player colour', () => {
    const state = loadLevel(levelById('sample-b'));
    expect(state.player.colour).toBe('white');
    expect(floorColour(state.player.colour)).toBe('black');
    expect(state.tiles.filter((tile) => isBox(state, tile)).every((tile) => tile.colour === 'white')).toBe(true);
    expect(floorColour('black')).toBe('white');
  });

  it('outlines a floor tile, and a box halfway through a flip at its start, as the full cell', () => {
    const outlinePoints = (path: string) => (path.match(/-?\d+\.\d+/g) ?? []).map(Number);
    for (const doorSides of [[], ['left' as const], ['up' as const, 'right' as const]]) {
      const points = outlinePoints(boxOutline(40, doorSides, 0));
      expect(points.every((coordinate) => coordinate === 0 || coordinate === 40)).toBe(true);
    }
  });

  it('insets a box from its cell, except that a door side reaches the cell edge', () => {
    const inset = 40 * BOX_INSET;
    const plainPoints = boxOutline(40, [], 1).match(/-?\d+\.\d+/g)!.map(Number);
    expect(Math.min(...plainPoints)).toBeCloseTo(inset);
    expect(Math.max(...plainPoints)).toBeCloseTo(40 - inset);
    // With a door on the left, the outline runs down the left edge from corner to corner.
    expect(boxOutline(40, ['left'], 1)).toContain('0.00 40.00 L0.00 0.00');
  });

  it('puts a seam just outside its box, one cell long, reaching a pixel under the box', () => {
    const thickness = SEAM_FRAME_WIDTH + SEAM_OVERLAP;
    expect(seamFrame('right', 40)).toEqual({ left: 40 - SEAM_OVERLAP, top: 0, width: thickness, height: 40 });
    expect(seamFrame('up', 40)).toEqual({ left: 0, top: -SEAM_FRAME_WIDTH, width: 40, height: thickness });
    // A left seam starts and ends on the frame's box side, which is its right side.
    expect(seamPath('left', 40)).toMatch(new RegExp(`^M${thickness} 0 .* ${thickness} 40 Z$`));
  });

  it('fits tiles to the screen and caps them', () => {
    const board = { rowCount: 9, columnCount: 10 };
    expect(tileSizeFor(board, 1280, 900)).toBe(MAX_TILE_SIZE);
    expect(tileSizeFor(board, 375, 812)).toBe(34);
    expect(tileSizeFor(board, 1280, 300)).toBe(21);
  });

  it('keeps every tile edge on a whole screen pixel', () => {
    const pixelRatio = 2.625; // a common Android phone
    const tileSize = tileSizeFor({ rowCount: 5, columnCount: 5 }, 411, 914, pixelRatio);
    for (let tileCount = 0; tileCount <= 5; tileCount++) {
      const edgeInPixels = tileCount * tileSize * pixelRatio;
      expect(Math.abs(edgeInPixels - Math.round(edgeInPixels))).toBeLessThan(1e-9);
    }
  });
});

describe('input and language', () => {
  it('reads swipes by their longest axis and ignores small ones', () => {
    expect(swipeDirection(40, 10)).toBe('right');
    expect(swipeDirection(-5, -60)).toBe('up');
    expect(swipeDirection(10, 12)).toBeNull();
  });

  it('picks Portuguese for any Portuguese locale', () => {
    expect(languageForLocale('pt-BR')).toBe('pt');
    expect(languageForLocale('pt-PT')).toBe('pt');
    expect(languageForLocale('en-US')).toBe('en');
    expect(languageForLocale(undefined)).toBe('pt');
  });
});

describe('board motion', () => {
  // Player is white (stands on black). Black is floor, white blocks.
  const startState = customLevelState(['b w b b', 'b b b W'], [0, 0]);

  it('slides the player and the pushed box after a push', () => {
    const { state, events } = move(startState, 'right');
    const motion = motionFor(events, state);
    expect(motion).toEqual({ slides: true, flips: false, bump: null });
    expect(bumpDirectionFor(motion, 'player')).toBeNull();
  });

  it('flips the board when the player goes through a door', () => {
    const doorState = { ...startState, doors: [{ row: 1, column: 0, side: 'right' as const }] };
    const { state, events } = move({ ...doorState, player: { row: 1, column: 0, colour: 'white' } }, 'right');
    expect(state.player.colour).toBe('white');
    expect(events[0]).toMatchObject({ type: 'flipped' });
    expect(motionFor(events, state)).toEqual({ slides: true, flips: true, bump: null });
  });

  it('jumps into place when there are no events, as after undo or restart', () => {
    expect(motionFor([], startState)).toEqual({ slides: false, flips: false, bump: null });
  });

  it('bumps only the player at the board edge', () => {
    const { state, events } = move(startState, 'up');
    const motion = motionFor(events, state);
    expect(motion).toEqual({ slides: false, flips: false, bump: { direction: 'up', boxTileId: null } });
    expect(bumpDirectionFor(motion, 'player')).toBe('up');
  });

  it('bumps the player and the refused box toward it', () => {
    // Pushing right: the white tile has another white tile behind it.
    const blockedState = customLevelState(['b w w b', 'b b b W'], [0, 0]);
    const { state, events } = move(blockedState, 'right');
    expect(events).toEqual([{ type: 'pushRefused', reason: 'ownColour', at: { row: 0, column: 1 } }]);
    const motion = motionFor(events, state);
    const refusedBoxId = state.tiles[1].id;
    expect(motion.bump).toEqual({ direction: 'right', boxTileId: refusedBoxId });
    expect(bumpDirectionFor(motion, refusedBoxId)).toBe('right');
    expect(bumpDirectionFor(motion, 'player')).toBe('right');
    expect(bumpDirectionFor(motion, state.tiles[2].id)).toBeNull();
  });

  it('does not bump after the level is won', () => {
    const wonState = { ...startState, status: 'won' as const };
    const { state, events } = move(wonState, 'up');
    expect(motionFor(events, state)).toEqual({ slides: false, flips: false, bump: null });
  });

  it('offsets a bump in its direction', () => {
    expect(bumpOffset('left', 5)).toEqual({ offsetLeft: -5, offsetTop: 0 });
    expect(bumpOffset('down', 5)).toEqual({ offsetLeft: 0, offsetTop: 5 });
  });
});
