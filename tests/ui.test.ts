import { describe, expect, it } from 'vitest';
import { loadLevel } from '../src/core';
import { boxInsets, doorSidesByTileIndex, floorColour, isBox, MAX_TILE_SIZE, tileSizeFor } from '../src/ui/boardLayout';
import { EDGE_WIDTH } from '../src/ui/theme';
import { swipeDirection } from '../src/ui/commands';
import { languageForLocale } from '../src/ui/i18n';
import { levelById } from './helpers';

describe('board layout', () => {
  it('draws a door on the tile in the player colour', () => {
    // sample-b: the door sits between a black and a white tile on the top row; the player is white.
    const state = loadLevel(levelById('sample-b'));
    expect(state.player.colour).toBe('white');
    expect(doorSidesByTileIndex(state).get(3)).toEqual(['left']);
    expect(doorSidesByTileIndex(state).has(2)).toBe(false);
  });

  it('draws the same door on the other tile after a flip', () => {
    const state = loadLevel(levelById('sample-b'));
    const flippedState = { ...state, player: { ...state.player, colour: 'black' as const } };
    expect(doorSidesByTileIndex(flippedState).get(2)).toEqual(['right']);
  });

  it('draws the floor in the colour the player is not, and boxes in the player colour', () => {
    const state = loadLevel(levelById('sample-b'));
    expect(floorColour(state)).toBe('black');
    expect(state.tiles.filter((tile) => isBox(state, tile)).every((tile) => tile.colour === 'white')).toBe(true);
    const flippedState = { ...state, player: { ...state.player, colour: 'black' as const } };
    expect(floorColour(flippedState)).toBe('white');
  });

  it('insets a box from its cell except on its door sides', () => {
    expect(boxInsets([])).toEqual({ top: EDGE_WIDTH, right: EDGE_WIDTH, bottom: EDGE_WIDTH, left: EDGE_WIDTH });
    expect(boxInsets(['left', 'down'])).toEqual({ top: EDGE_WIDTH, right: EDGE_WIDTH, bottom: 0, left: 0 });
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
