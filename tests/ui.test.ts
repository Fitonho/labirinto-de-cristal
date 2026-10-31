import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadLevel, move } from '../src/core';
import {
  boxOutline,
  portalSidesByTileIndex,
  floorColour,
  isBox,
  MAX_TILE_SIZE,
  MAX_TOUCH_PAD_HEIGHT,
  MIN_TOUCH_PAD_HEIGHT,
  seamFrame,
  seamPath,
  tileSizeFor,
  touchPadHeightFor,
} from '../src/ui/boardLayout';
import { BOX_INSET, SEAM_FRAME_WIDTH, SEAM_OVERLAP } from '../src/ui/theme';
import { hapticCueFor, parCueFor } from '../src/ui/haptics';
import { reachedPar, winResultFor } from '../src/ui/winResult';
import { commandsByKey, swipeDirection, tapDirection } from '../src/ui/commands';
import { languageForLocale } from '../src/ui/i18n';
import { SOUND_CUE_KINDS, soundCueFor } from '../src/ui/sounds';
import {
  beaconStateFor,
  EYE_SCALES,
  glanceTargetFor,
  JELLY_SPRING,
  PEBBLE_POSES,
  pebbleReactionFor,
  shardDirections,
  starPoints,
} from '../src/ui/pieceLooks';
import {
  BUMP_OUT_DURATION,
  bumpDirectionFor,
  bumpOffset,
  FLIP_GROW_DURATION,
  motionFor,
  PAR_CUE_DELAY,
  RESULT_CARD_DELAY,
  SLIDE_DURATION,
} from '../src/ui/motion';
import { customLevelState, levelById, play } from './helpers';
import { cellAtPoint, seekDirection } from '../src/ui/seek';

describe('board layout', () => {
  it('lists a portal on both tiles beside it, so either can show it after a flip', () => {
    // sample-b: the portal sits between tiles 2 and 3 on the top row.
    const state = loadLevel(levelById('sample-b'));
    expect(portalSidesByTileIndex(state).get(2)).toEqual(['right']);
    expect(portalSidesByTileIndex(state).get(3)).toEqual(['left']);
    expect(portalSidesByTileIndex(state).has(1)).toBe(false);
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
    for (const portalSides of [[], ['left' as const], ['up' as const, 'right' as const]]) {
      const points = outlinePoints(boxOutline(40, portalSides, 0));
      expect(points.every((coordinate) => coordinate === 0 || coordinate === 40)).toBe(true);
    }
  });

  it('insets a box from its cell, except that a portal side reaches the cell edge', () => {
    const inset = 40 * BOX_INSET;
    const plainPoints = boxOutline(40, [], 1).match(/-?\d+\.\d+/g)!.map(Number);
    expect(Math.min(...plainPoints)).toBeCloseTo(inset);
    expect(Math.max(...plainPoints)).toBeCloseTo(40 - inset);
    // With a portal on the left, the outline runs down the left edge from corner to corner.
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
    expect(tileSizeFor(board, 1280, 1400)).toBe(MAX_TILE_SIZE);
    expect(tileSizeFor(board, 375, 812)).toBe(34);
    expect(tileSizeFor(board, 1280, 300)).toBe(21);
    // The controls need 400 of the 800 points, which leaves the board 400.
    expect(tileSizeFor(board, 1280, 800, 1, 400)).toBe(44); // 400 points left for 9 rows
  });

  it('lets a small board grow past the old 56-point cap to fill a phone', () => {
    // Sample A, 5 by 4, on a 390-point-wide phone with 400 points free: the width decides.
    expect(tileSizeFor({ rowCount: 4, columnCount: 5 }, 390, 844, 1, 444)).toBe(71);
    // A 3 by 3 board stops at the cap.
    expect(tileSizeFor({ rowCount: 3, columnCount: 3 }, 390, 844, 1, 444)).toBe(MAX_TILE_SIZE);
  });

  it('sizes the touch area by the phone, within its band', () => {
    expect(touchPadHeightFor(763)).toBe(MAX_TOUCH_PAD_HEIGHT); // a tall phone, 390 × 844 less its insets
    expect(touchPadHeightFor(616)).toBe(234); // a short phone, 360 × 640
    expect(touchPadHeightFor(400)).toBe(MIN_TOUCH_PAD_HEIGHT); // a phone on its side, or a small browser window
    // A short phone gives the board more room than a fixed 290 would: a 10 by 9 draft gets 23-point tiles, not 17.
    const draftBoard = { rowCount: 9, columnCount: 10 };
    expect(tileSizeFor(draftBoard, 360, 640, 1, 24 + 172 + touchPadHeightFor(616))).toBe(23);
    expect(tileSizeFor(draftBoard, 360, 640, 1, 24 + 172 + MAX_TOUCH_PAD_HEIGHT)).toBe(17);
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

  it('reads taps by the triangle they land in and ignores taps on the diagonals', () => {
    // A wide area, 300 by 100: the diagonals run corner to corner, not at 45 degrees.
    expect(tapDirection(150, 10, 300, 100)).toBe('up');
    expect(tapDirection(150, 95, 300, 100)).toBe('down');
    expect(tapDirection(20, 50, 300, 100)).toBe('left');
    expect(tapDirection(280, 60, 300, 100)).toBe('right');
    expect(tapDirection(100, 90, 300, 100)).toBe('down');
    expect(tapDirection(30, 10, 300, 100)).toBeNull(); // on the diagonal from the top-left corner
    expect(tapDirection(150, 50, 300, 100)).toBeNull(); // the centre, where every diagonal meets
    expect(tapDirection(10, 10, 0, 0)).toBeNull();
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

  it('flips the board when the player goes through a portal', () => {
    const portalState = { ...startState, portals: [{ row: 1, column: 0, side: 'right' as const }] };
    const { state, events } = move({ ...portalState, player: { row: 1, column: 0, colour: 'white' } }, 'right');
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

describe('piece looks', () => {
  // Player is white (stands on black). Black is floor, white blocks.
  const startState = customLevelState(['b w b b', 'b b b W'], [0, 0]);

  it('slides the Pebble on a plain move, facing the way it went', () => {
    const { state, events } = move(startState, 'down');
    expect(pebbleReactionFor(events, state)).toEqual({ action: 'slide', direction: 'down', collectedTileId: null });
  });

  it('leans into a push', () => {
    const { state, events } = move(startState, 'right');
    expect(pebbleReactionFor(events, state)).toMatchObject({ action: 'push', direction: 'right' });
  });

  it('bumps at the board edge and against a box that will not move', () => {
    const edge = move(startState, 'up');
    expect(pebbleReactionFor(edge.events, edge.state)).toMatchObject({ action: 'bump', direction: 'up' });
    const blockedState = customLevelState(['b w w b', 'b b b W'], [0, 0]);
    const refused = move(blockedState, 'right');
    expect(pebbleReactionFor(refused.events, refused.state)).toMatchObject({ action: 'bump', direction: 'right' });
  });

  it('squeezes through a portal rather than just sliding', () => {
    const portalState = { ...startState, portals: [{ row: 1, column: 0, side: 'right' as const }], player: { row: 1, column: 0, colour: 'white' as const } };
    const { state, events } = move(portalState, 'right');
    expect(pebbleReactionFor(events, state)).toMatchObject({ action: 'flip', direction: 'right' });
  });

  it('strikes no pose after undo, restart, a new level or a move after winning', () => {
    expect(pebbleReactionFor([], startState)).toEqual({ action: null, direction: null, collectedTileId: null });
    const { state, events } = move({ ...startState, status: 'won' }, 'up');
    expect(pebbleReactionFor(events, state).action).toBeNull();
  });

  it('cheers on the winning move, standing up once the slide is over', () => {
    const goalState = customLevelState(['w W', 'b b'], [0, 0]);
    const { state, events } = move(goalState, 'right');
    expect(state.status).toBe('won');
    expect(pebbleReactionFor(events, state)).toMatchObject({ action: 'cheer', direction: 'right' });
    expect(PEBBLE_POSES.cheer.uprightAfter).toBe(SLIDE_DURATION);
    const slideTime = PEBBLE_POSES.cheer.stretches.slice(0, 2).reduce((total, keyframe) => total + keyframe.duration, 0);
    expect(slideTime).toBe(SLIDE_DURATION);
  });

  it('names the star collected on a move', () => {
    // The player starts on white, so it is black: the colour that can reach the star on the white tile.
    const goalState = customLevelState(['w W', 'b b'], [0, 0]);
    expect(goalState.player.colour).toBe('black');
    const { state, events } = move(goalState, 'right');
    expect(pebbleReactionFor(events, state).collectedTileId).toBe(state.tiles[1].id);
  });

  it('ends every pose back at rest, with the flip squeezing thin until the colour swap', () => {
    expect(PEBBLE_POSES.flip.stretches.reduce((total, keyframe) => total + keyframe.duration, 0)).toBe(FLIP_GROW_DURATION);
    expect(PEBBLE_POSES.flip.stretches.at(-1)?.to).toBeLessThan(0);
    expect(PEBBLE_POSES.slide.stretches.reduce((total, keyframe) => total + keyframe.duration, 0)).toBe(SLIDE_DURATION);
    expect(EYE_SCALES.open).toEqual({ width: 1, height: 1 });
    // The jelly settles within about half a second: its wobble is under 1% of the squash by then.
    expect(Math.exp((-JELLY_SPRING.damping / (2 * JELLY_SPRING.mass)) * 0.5)).toBeLessThan(0.01);
  });

  it('wakes a star only while its tile is floor, which is when the player is its colour', () => {
    expect(beaconStateFor('white', 'black')).toBe('awake');
    expect(beaconStateFor('white', 'white')).toBe('resting');
  });

  it('glances at the nearest star the player can reach, and at none it cannot', () => {
    // The goal is a white tile, so only a black player can reach it.
    const blackPlayer = customLevelState(['w w W', 'w w w'], [1, 0]);
    expect(blackPlayer.player.colour).toBe('black');
    const target = glanceTargetFor(blackPlayer);
    expect(target?.lookX).toBeCloseTo(2 / Math.sqrt(5));
    expect(target?.lookY).toBeCloseTo(-1 / Math.sqrt(5));
    const whitePlayer = customLevelState(['b b W', 'b b b'], [1, 0]);
    expect(whitePlayer.player.colour).toBe('white');
    expect(glanceTargetFor(whitePlayer)).toBeNull();
  });

  it('sends the burst evenly around and draws a four-point star', () => {
    const directions = shardDirections(8);
    expect(directions).toHaveLength(8);
    expect(directions[2].offsetX).toBeCloseTo(0);
    expect(directions[2].offsetY).toBeCloseTo(1);
    const points = starPoints(10, 10, 5, 1).split(' ');
    expect(points).toHaveLength(8);
    expect(points[0]).toBe('10,5');
  });
});

describe('haptics', () => {
  // Player is white (stands on black). Black is floor, white blocks.
  const startState = customLevelState(['b w b b', 'b b b W'], [0, 0]);

  it('stays silent on a plain step and when there are no events, as after undo or restart', () => {
    expect(hapticCueFor(move(startState, 'down').events)).toBeNull();
    expect(hapticCueFor([])).toBeNull();
  });

  it('taps as soon as a push starts', () => {
    expect(hapticCueFor(move(startState, 'right').events)).toEqual({ kind: 'push', delay: 0 });
  });

  it('taps when a bump hits, at the board edge or against a box that will not move', () => {
    expect(hapticCueFor(move(startState, 'up').events)).toEqual({ kind: 'bump', delay: BUMP_OUT_DURATION });
    const refusedState = customLevelState(['b w w', 'b b B'], [0, 0]);
    expect(hapticCueFor(move(refusedState, 'right').events)).toEqual({ kind: 'bump', delay: BUMP_OUT_DURATION });
  });

  it('taps a portal when the colours swap', () => {
    const portalState = { ...startState, portals: [{ row: 1, column: 0, side: 'right' as const }] };
    const { events } = move({ ...portalState, player: { row: 1, column: 0, colour: 'white' } }, 'right');
    expect(hapticCueFor(events)).toEqual({ kind: 'portal', delay: FLIP_GROW_DURATION });
  });

  it('plays only the strongest cue of a move: win over crystal, portal over push', () => {
    const at = { row: 0, column: 0 };
    expect(hapticCueFor([{ type: 'moved', from: at, to: at }, { type: 'collected', tileId: 1, at }])).toEqual({
      kind: 'crystal',
      delay: SLIDE_DURATION,
    });
    expect(
      hapticCueFor([
        { type: 'moved', from: at, to: at },
        { type: 'collected', tileId: 1, at },
        { type: 'won', moveCount: 3 },
      ]),
    ).toEqual({ kind: 'win', delay: SLIDE_DURATION });
    expect(
      hapticCueFor([
        { type: 'pushed', tileId: 1, from: at, to: at },
        { type: 'flipped', colour: 'black', portal: { ...at, side: 'right' } },
      ]),
    ).toEqual({ kind: 'portal', delay: FLIP_GROW_DURATION });
  });

  it('stays silent on a move after winning', () => {
    expect(hapticCueFor([{ type: 'blocked', reason: 'won', direction: 'up' }])).toBeNull();
  });
});

describe('sounds', () => {
  // Player is white (stands on black). Black is floor, white blocks.
  const startState = customLevelState(['b w b b', 'b b b W'], [0, 0]);

  it('ticks on a plain step, as the slide starts', () => {
    expect(soundCueFor(move(startState, 'down').events)).toEqual({ kind: 'step', delay: 0 });
  });

  it('plays the haptic cue when a move has one, so sound and vibration land together', () => {
    expect(soundCueFor(move(startState, 'right').events)).toEqual({ kind: 'push', delay: 0 });
    expect(soundCueFor(move(startState, 'up').events)).toEqual({ kind: 'bump', delay: BUMP_OUT_DURATION });
  });

  it('stays silent after undo, restart, a new level or a move after winning', () => {
    expect(soundCueFor([])).toBeNull();
    expect(soundCueFor([{ type: 'blocked', reason: 'won', direction: 'up' }])).toBeNull();
  });

  it('has a file for every sound', () => {
    for (const kind of SOUND_CUE_KINDS) {
      expect(existsSync(new URL(`../assets/sounds/${kind}.wav`, import.meta.url)), kind).toBe(true);
    }
  });

  it('turns sound and vibration on and off with M and V', () => {
    expect(commandsByKey.m).toEqual({ type: 'toggleSound' });
    expect(commandsByKey.v).toEqual({ type: 'toggleVibration' });
  });

  it('goes to the next level with Enter or Space, and opens the levels with L', () => {
    expect(commandsByKey.enter).toEqual({ type: 'next' });
    expect(commandsByKey[' ']).toEqual({ type: 'next' });
    expect(commandsByKey.l).toEqual({ type: 'levels' });
  });
});

describe('win result', () => {
  it('compares the moves with par', () => {
    expect(winResultFor(12, 12, null)).toMatchObject({ parBadge: 'onPar', movesOverPar: 0 });
    expect(winResultFor(11, 12, null)).toMatchObject({ parBadge: 'underPar', movesOverPar: 0 });
    expect(winResultFor(14, 12, null)).toMatchObject({ parBadge: 'overPar', movesOverPar: 2 });
    expect(winResultFor(14, undefined, null)).toMatchObject({ par: null, parBadge: null, movesOverPar: 0 });
    expect([reachedPar('onPar'), reachedPar('underPar'), reachedPar('overPar'), reachedPar(null)]).toEqual([true, true, false, false]);
  });

  it('shows a new best only when it beats an earlier one, and the standing best otherwise', () => {
    expect(winResultFor(14, undefined, null)).toMatchObject({ isNewBest: false, standingBestMoves: null });
    expect(winResultFor(12, undefined, 14)).toMatchObject({ isNewBest: true, standingBestMoves: null });
    expect(winResultFor(14, undefined, 14)).toMatchObject({ isNewBest: false, standingBestMoves: 14 });
    expect(winResultFor(16, undefined, 14)).toMatchObject({ isNewBest: false, standingBestMoves: 14 });
  });

  it('chimes as the badge lands, only for a win on or under par', () => {
    const won = (moveCount: number) => [{ type: 'won' as const, moveCount }];
    expect(parCueFor(won(12), 12)).toEqual({ kind: 'par', delay: PAR_CUE_DELAY });
    expect(parCueFor(won(11), 12)).toEqual({ kind: 'par', delay: PAR_CUE_DELAY });
    expect(parCueFor(won(13), 12)).toBeNull();
    expect(parCueFor(won(3), undefined)).toBeNull();
    expect(parCueFor([], 12)).toBeNull();
    // The card rises after the collect burst has started, and the chime comes after the card.
    expect(RESULT_CARD_DELAY).toBeGreaterThan(SLIDE_DURATION);
    expect(PAR_CUE_DELAY).toBeGreaterThan(RESULT_CARD_DELAY);
  });
});

describe('seek', () => {
  it('walks round a box to reach the tile under the finger', () => {
    const state = customLevelState(['b w b', 'b b b', 'w w W'], [0, 0]);
    expect(seekDirection(state, { row: 0, column: 2 })).toBe('down');
  });

  it('pushes or goes through a portal only when the finger is on the next tile', () => {
    const state = customLevelState(['b w b', 'b b b', 'w w W'], [0, 0], [[0, 0, 'right']]);
    expect(seekDirection(state, { row: 0, column: 1 })).toBe('right');
    expect(seekDirection(state, { row: 0, column: 2 })).toBe('down');
  });

  it('walks to the reachable tile closest to an unreachable finger, then waits', () => {
    const state = customLevelState(['b b w b', 'b b w b', 'w w w W'], [0, 0]);
    expect(seekDirection(state, { row: 0, column: 3 })).toBe('right');
    expect(seekDirection(play(state, 'R'), { row: 0, column: 3 })).toBeNull();
    expect(seekDirection(state, { row: 0, column: 0 })).toBeNull();
  });

  it('counts a finger beside the board as the nearest edge tile', () => {
    const board = { rowCount: 3, columnCount: 3 };
    // A 3 x 3 board of 50 px tiles, centred in a 300 x 400 area, starts at (75, 125).
    expect(cellAtPoint(80, 130, 300, 400, board, 50)).toEqual({ row: 0, column: 0 });
    expect(cellAtPoint(0, 0, 300, 400, board, 50)).toEqual({ row: 0, column: 0 });
    expect(cellAtPoint(299, 399, 300, 400, board, 50)).toEqual({ row: 2, column: 2 });
    expect(cellAtPoint(175, 200, 300, 400, board, 50)).toEqual({ row: 1, column: 2 });
  });
});
