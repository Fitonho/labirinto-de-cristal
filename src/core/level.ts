// Turns level data into a starting GameState, and checks it first.
import { doorIsValid, edge, inside, opposite, sameDoor, sides, tileAt } from './board';
import type { Door, GameState, LevelData, Tile } from './types';

export type LevelError =
  | 'grid-empty'
  | 'grid-ragged'
  | 'grid-symbol'
  | 'no-goal'
  | 'start-outside'
  | 'start-on-goal'
  | 'door-outside'
  | 'door-same-colour'
  | 'door-duplicate';

interface ParsedGrid {
  errors: LevelError[];
  rowCount: number;
  columnCount: number;
  tiles: Tile[];
}

function parseGrid(level: LevelData): ParsedGrid {
  const symbolRows = level.grid.map((line) => line.trim().split(/\s+/).filter(Boolean));
  const errors: LevelError[] = [];
  if (symbolRows.length === 0 || symbolRows[0].length === 0) {
    return { errors: ['grid-empty'], rowCount: 0, columnCount: 0, tiles: [] };
  }
  const columnCount = symbolRows[0].length;
  if (symbolRows.some((symbolRow) => symbolRow.length !== columnCount)) errors.push('grid-ragged');
  const tiles: Tile[] = symbolRows.flat().map((symbol, tileId) => {
    if (!/^[bwBW]$/.test(symbol)) errors.push('grid-symbol');
    const tile: Tile = { id: tileId, colour: symbol.toLowerCase() === 'b' ? 'black' : 'white' };
    if (symbol !== symbol.toLowerCase()) tile.goal = true;
    return tile;
  });
  return { errors, rowCount: symbolRows.length, columnCount, tiles };
}

function levelDoors(level: LevelData): Door[] {
  return (level.doors ?? []).map(([row, column, side]) => edge({ row, column }, side));
}

/** Lists everything wrong with a level; an empty list means it can be played. */
export function validateLevel(level: LevelData): LevelError[] {
  const parsedGrid = parseGrid(level);
  const errors = parsedGrid.errors;
  if (errors.length) return errors;
  const board = { ...parsedGrid, doors: [] } as unknown as GameState;
  if (!board.tiles.some((tile) => tile.goal)) errors.push('no-goal');
  const [startRow, startColumn] = level.start;
  const start = { row: startRow, column: startColumn };
  if (!inside(board, start)) errors.push('start-outside');
  else if (tileAt(board, start).goal) errors.push('start-on-goal');
  const checkedDoors: Door[] = [];
  for (const door of levelDoors(level)) {
    if (!sides(door).every((cell) => inside(board, cell))) errors.push('door-outside');
    else if (!doorIsValid(board, door)) errors.push('door-same-colour');
    if (checkedDoors.some((checkedDoor) => sameDoor(checkedDoor, door))) errors.push('door-duplicate');
    checkedDoors.push(door);
  }
  return errors;
}

/** Builds the starting state. Throws if the level has errors. */
export function loadLevel(level: LevelData): GameState {
  const errors = validateLevel(level);
  if (errors.length) throw new Error(`Level ${level.id}: ${[...new Set(errors)].join(', ')}`);
  const { rowCount, columnCount, tiles } = parseGrid(level);
  const [startRow, startColumn] = level.start;
  const state: GameState = {
    rowCount,
    columnCount,
    tiles,
    doors: levelDoors(level),
    player: { row: startRow, column: startColumn, colour: 'black' },
    collectedGoalIds: [],
    moveCount: 0,
    status: 'playing',
  };
  state.player.colour = opposite(tileAt(state, state.player).colour);
  return state;
}
