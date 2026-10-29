// Pure helpers that turn a move's engine events into how the board moves:
// whether pieces slide to their new places or jump there, whether the board
// flips, and which piece bumps when a move goes nowhere. No React here, so
// Vitest tests it.
import { tileAt, type Direction, type GameEvent, type GameState } from '../core';

/** How long a slide to the next tile takes, in milliseconds. */
export const SLIDE_DURATION = 120;
/** A bump goes out quickly and settles back a little slower. */
export const BUMP_OUT_DURATION = 60;
export const BUMP_BACK_DURATION = 90;
/** How far a bump goes, as a share of the tile size. */
export const PLAYER_BUMP_DISTANCE = 0.2;
export const BOX_BUMP_DISTANCE = 0.08;
/**
 * A flip first grows the old boxes into full tiles, then swaps the floor and
 * player colours, then shrinks the new boxes out of their full tiles.
 */
export const FLIP_GROW_DURATION = 90;
export const FLIP_SHRINK_DURATION = 150;

export interface Bump {
  direction: Direction;
  boxTileId: number | null; // the box that refused to move, or null at the board edge
}

export interface BoardMotion {
  slides: boolean; // false after undo, restart or a new level: everything jumps into place
  flips: boolean; // the player went through a portal, so boxes and floor trade places
  bump: Bump | null;
}

/** The player, or a box by its tile id. */
export type PieceId = 'player' | number;

/** `state` is the state after the move, which is unchanged when the move went nowhere. */
export function motionFor(events: GameEvent[], state: GameState): BoardMotion {
  const slides = events.some((event) => event.type === 'moved');
  const flips = events.some((event) => event.type === 'flipped');
  for (const event of events) {
    if (event.type === 'blocked' && event.reason === 'edge') {
      return { slides, flips, bump: { direction: event.direction, boxTileId: null } };
    }
    if (event.type === 'pushRefused') {
      const direction = directionBetween(state.player, event.at);
      if (direction) return { slides, flips, bump: { direction, boxTileId: tileAt(state, event.at).id } };
    }
  }
  return { slides, flips, bump: null };
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

/** The direction from one cell to a neighbouring one, or null if they aren't neighbours. */
export function directionBetween(fromCell: { row: number; column: number }, toCell: { row: number; column: number }): Direction | null {
  const rowChange = toCell.row - fromCell.row;
  const columnChange = toCell.column - fromCell.column;
  if (rowChange === -1 && columnChange === 0) return 'up';
  if (rowChange === 1 && columnChange === 0) return 'down';
  if (rowChange === 0 && columnChange === 1) return 'right';
  if (rowChange === 0 && columnChange === -1) return 'left';
  return null;
}

/** How long one Beacon star ring takes to grow and fade; two rings run half a period apart. */
export const RING_PERIOD = 1400;
/** The collected star swells and fades, and small stars fly out, over this long once the Pebble arrives. */
export const COLLECT_BURST_DURATION = 600;
/** The Pebble blinks this often while you play, and a blink takes this long. */
export const BLINK_INTERVAL = 3700;
export const BLINK_DURATION = 120;
/** After this long without a move, the Pebble glances at a reachable star or looks around. */
export const IDLE_GLANCE_DELAY = 2500;

/** The result sheet rises this long after the winning move, once the collect burst has had its moment, and takes this long. */
export const RESULT_CARD_DELAY = 520;
export const RESULT_CARD_RISE_DURATION = 380;
/** The sheet's star spins in this long after it starts rising, over this long, then bursts like a collected star. */
export const EMBLEM_DELAY = 330;
export const EMBLEM_SPIN_DURATION = 420;
export const EMBLEM_BURST_DELAY = RESULT_CARD_DELAY + EMBLEM_DELAY + EMBLEM_SPIN_DURATION;
/** The par badge lands this long after the sheet starts rising, as the burst flies out, with a stamp this long. */
export const PAR_BADGE_DELAY = EMBLEM_DELAY + EMBLEM_SPIN_DURATION + 80;
export const PAR_BADGE_DURATION = 130;
/** The par chime and tick play as the badge lands. */
export const PAR_CUE_DELAY = RESULT_CARD_DELAY + PAR_BADGE_DELAY + PAR_BADGE_DURATION;
/** The card's buttons ignore touches this long after it lands, so a swipe still under way can't press Next. */
export const RESULT_CARD_INPUT_GUARD = 150;
/** The card drops away this fast on Next, Undo or Play again. */
export const RESULT_CARD_DROP_DURATION = 180;
