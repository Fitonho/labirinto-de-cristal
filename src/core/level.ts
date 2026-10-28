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

interface Parsed {
  errors: LevelError[];
  rows: number;
  cols: number;
  tiles: Tile[];
}

function parse(data: LevelData): Parsed {
  const rows = data.grid.map((line) => line.trim().split(/\s+/).filter(Boolean));
  const errors: LevelError[] = [];
  if (rows.length === 0 || rows[0].length === 0) return { errors: ['grid-empty'], rows: 0, cols: 0, tiles: [] };
  const cols = rows[0].length;
  if (rows.some((r) => r.length !== cols)) errors.push('grid-ragged');
  const tiles: Tile[] = [];
  rows.flat().forEach((symbol, id) => {
    if (!/^[bwBW]$/.test(symbol)) errors.push('grid-symbol');
    const tile: Tile = { id, colour: symbol.toLowerCase() === 'b' ? 'black' : 'white' };
    if (symbol !== symbol.toLowerCase()) tile.goal = true;
    tiles.push(tile);
  });
  return { errors, rows: rows.length, cols, tiles };
}

/** Lists everything wrong with a level; an empty list means it can be played. */
export function validateLevel(data: LevelData): LevelError[] {
  const parsed = parse(data);
  const errors = parsed.errors;
  if (errors.length) return errors;
  const s = { ...parsed, doors: [] } as unknown as GameState;
  if (!s.tiles.some((t) => t.goal)) errors.push('no-goal');
  const [row, col] = data.start;
  if (!inside(s, { row, col })) errors.push('start-outside');
  else if (tileAt(s, { row, col }).goal) errors.push('start-on-goal');
  const doors: Door[] = [];
  for (const [r, c, side] of data.doors ?? []) {
    const d = edge({ row: r, col: c }, side);
    if (!sides(d).every((cell) => inside(s, cell))) errors.push('door-outside');
    else if (!doorIsValid(s, d)) errors.push('door-same-colour');
    if (doors.some((x) => sameDoor(x, d))) errors.push('door-duplicate');
    doors.push(d);
  }
  return errors;
}

/** Builds the starting state. Throws if the level has errors. */
export function loadLevel(data: LevelData): GameState {
  const errors = validateLevel(data);
  if (errors.length) throw new Error(`Level ${data.id}: ${[...new Set(errors)].join(', ')}`);
  const { rows, cols, tiles } = parse(data);
  const [row, col] = data.start;
  const state: GameState = {
    rows,
    cols,
    tiles,
    doors: (data.doors ?? []).map(([r, c, side]) => edge({ row: r, col: c }, side)),
    player: { row, col, colour: 'black' },
    collected: [],
    moves: 0,
    status: 'playing',
  };
  state.player.colour = opposite(tileAt(state, { row, col }).colour);
  return state;
}
