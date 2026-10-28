// Plain data types for the game. Everything here is JSON-serialisable and has
// no knowledge of how the game is drawn or controlled.

export type Colour = 'black' | 'white';
export type Direction = 'up' | 'right' | 'down' | 'left';

export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];

export interface Cell {
  row: number;
  col: number;
}

/**
 * The part of a cell that moves when pushed. A cell will later also get a
 * board layer (pads, holes, walls) that stays put; a push only swaps tiles.
 */
export interface Tile {
  id: number; // stable across pushes, so renderers can animate a tile
  colour: Colour;
  goal?: true; // carries a crystal
}

/**
 * A door sits on the edge between (row, col) and its right or lower
 * neighbour. Its two sides always have different colours, so the side in the
 * player's colour is the one that can be pushed and that carries it.
 */
export interface Door {
  row: number;
  col: number;
  side: 'right' | 'down';
}

export interface Player extends Cell {
  colour: Colour;
}

export interface GameState {
  rows: number;
  cols: number;
  tiles: Tile[]; // row by row, rows * cols long
  doors: Door[];
  player: Player;
  collected: number[]; // ids of goal tiles already reached
  moves: number;
  status: 'playing' | 'won';
}

/** A level as stored on disk. Bump `version` when the format changes. */
export interface LevelData {
  version: 1;
  id: string;
  chapter: string;
  order: number;
  /** One string per row: b / w for black / white, uppercase for a goal. */
  grid: string[];
  start: [row: number, col: number];
  doors?: [row: number, col: number, side: Direction][];
  par?: number;
}

export type BlockReason = 'edge' | 'won';
export type PushRefusal = 'edge' | 'goal' | 'ownColour' | 'door';

export type GameEvent =
  | { type: 'moved'; from: Cell; to: Cell }
  | { type: 'blocked'; reason: BlockReason }
  | { type: 'pushed'; tile: number; from: Cell; to: Cell }
  | { type: 'pushRefused'; reason: PushRefusal; at: Cell }
  | { type: 'flipped'; colour: Colour; door: Door }
  | { type: 'doorMoved'; from: Door; to: Door }
  | { type: 'collected'; tile: number; at: Cell }
  | { type: 'won'; moves: number };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}
