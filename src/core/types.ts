// Plain data types for the game. Everything here is JSON-serialisable and has
// no knowledge of how the game is drawn or controlled.

export type Colour = 'black' | 'white';
export type Direction = 'up' | 'right' | 'down' | 'left';

export const DIRECTIONS: readonly Direction[] = ['up', 'right', 'down', 'left'];

export interface Cell {
  row: number;
  column: number;
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
 * A portal sits on the edge between (row, column) and its right or lower
 * neighbour. Its two sides always have different colours, so the side in the
 * player's colour is the one that can be pushed and that carries it.
 */
export interface Portal {
  row: number;
  column: number;
  side: 'right' | 'down';
}

export interface Player extends Cell {
  colour: Colour;
}

export interface GameState {
  rowCount: number;
  columnCount: number;
  tiles: Tile[]; // row by row, rowCount * columnCount long
  portals: Portal[];
  player: Player;
  collectedGoalIds: number[]; // ids of goal tiles already reached
  moveCount: number;
  status: 'playing' | 'won';
}

/** A level as stored on disk. Bump `version` when the format changes. */
export interface LevelData {
  /** 2 renamed doors to portals. */
  version: 2;
  id: string;
  chapter: string;
  order: number;
  /** One string per row: b / w for black / white, uppercase for a goal. */
  grid: string[];
  start: [row: number, column: number];
  portals?: [row: number, column: number, side: Direction][];
  par?: number;
}

export type BlockReason = 'edge' | 'won';
export type PushRefusal = 'edge' | 'goal' | 'ownColour' | 'portal';

export type GameEvent =
  | { type: 'moved'; from: Cell; to: Cell }
  | { type: 'blocked'; reason: BlockReason; direction: Direction } // the way the player tried to go
  | { type: 'pushed'; tileId: number; from: Cell; to: Cell }
  | { type: 'pushRefused'; reason: PushRefusal; at: Cell }
  | { type: 'flipped'; colour: Colour; portal: Portal }
  | { type: 'portalMoved'; from: Portal; to: Portal }
  | { type: 'collected'; tileId: number; at: Cell }
  | { type: 'won'; moveCount: number };

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}
