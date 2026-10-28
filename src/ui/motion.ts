// Pure helpers that turn a move's engine events into how the board moves:
// whether pieces slide to their new places or jump there, and which piece
// bumps when a move goes nowhere. No React here, so Vitest tests it.
import { tileAt, type Direction, type GameEvent, type GameState } from '../core';

/** How long a slide to the next tile takes, in milliseconds. */
export const SLIDE_DURATION = 120;
/** A bump goes out quickly and settles back a little slower. */
export const BUMP_OUT_DURATION = 60;
export const BUMP_BACK_DURATION = 90;
/** How far a bump goes, as a share of the tile size. */
export const PLAYER_BUMP_DISTANCE = 0.2;
export const BOX_BUMP_DISTANCE = 0.08;

export interface Bump {
  direction: Direction;
  boxTileId: number | null; // the box that refused to move, or null at the board edge
}

export interface BoardMotion {
  slides: boolean; // false after undo, restart or a new level: everything jumps into place
  bump: Bump | null;
}

/** The player, or a box by its tile id. */
export type PieceId = 'player' | number;

/** `state` is the state after the move, which is unchanged when the move went nowhere. */
export function motionFor(events: GameEvent[], state: GameState): BoardMotion {
  const slides = events.some((event) => event.type === 'moved');
  for (const event of events) {
    if (event.type === 'blocked' && event.reason === 'edge') {
      return { slides, bump: { direction: event.direction, boxTileId: null } };
    }
    if (event.type === 'pushRefused') {
      const direction = directionBetween(state.player, event.at);
      if (direction) return { slides, bump: { direction, boxTileId: tileAt(state, event.at).id } };
    }
  }
  return { slides, bump: null };
}

/** The way this piece bumps, if it bumps at all. The player bumps whenever anything does. */
export function bumpDirectionFor(motion: BoardMotion, pieceId: PieceId): Direction | null {
  if (!motion.bump) return null;
  if (pieceId === 'player' || pieceId === motion.bump.boxTileId) return motion.bump.direction;
  return null;
}

/** How far left and down a bump of this size moves a piece. */
export function bumpOffset(direction: Direction, distance: number): { offsetLeft: number; offsetTop: number } {
  const offsets: Record<Direction, { offsetLeft: number; offsetTop: number }> = {
    up: { offsetLeft: 0, offsetTop: -distance },
    right: { offsetLeft: distance, offsetTop: 0 },
    down: { offsetLeft: 0, offsetTop: distance },
    left: { offsetLeft: -distance, offsetTop: 0 },
  };
  return offsets[direction];
}

function directionBetween(fromCell: { row: number; column: number }, toCell: { row: number; column: number }): Direction | null {
  const rowChange = toCell.row - fromCell.row;
  const columnChange = toCell.column - fromCell.column;
  if (rowChange === -1 && columnChange === 0) return 'up';
  if (rowChange === 1 && columnChange === 0) return 'down';
  if (rowChange === 0 && columnChange === 1) return 'right';
  if (rowChange === 0 && columnChange === -1) return 'left';
  return null;
}
