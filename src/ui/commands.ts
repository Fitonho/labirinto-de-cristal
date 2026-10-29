// Player commands and the keys that trigger them, shared by every shell.
import type { Direction } from '../core';

export type Command =
  | { type: 'move'; direction: Direction }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'toggleSound' }
  | { type: 'toggleVibration' }
  | { type: 'next' } // the next level, once this one is won
  | { type: 'levels' };

export const commandsByKey: Record<string, Command> = {
  arrowup: { type: 'move', direction: 'up' },
  arrowright: { type: 'move', direction: 'right' },
  arrowdown: { type: 'move', direction: 'down' },
  arrowleft: { type: 'move', direction: 'left' },
  w: { type: 'move', direction: 'up' },
  d: { type: 'move', direction: 'right' },
  s: { type: 'move', direction: 'down' },
  a: { type: 'move', direction: 'left' },
  z: { type: 'undo' },
  backspace: { type: 'undo' },
  r: { type: 'reset' },
  m: { type: 'toggleSound' },
  v: { type: 'toggleVibration' },
  enter: { type: 'next' },
  ' ': { type: 'next' },
  l: { type: 'levels' },
};

export const MIN_SWIPE_PIXELS = 24;

/**
 * How wide the band along the touch area's diagonals is where a tap does
 * nothing, as a share of the distance from the centre to the edge. A tap that
 * close to a diagonal could mean either side.
 */
export const TAP_DEAD_BAND = 0.12;

/**
 * The direction of a tap at (x, y) in an area of the given size. The two
 * diagonals split the area into four triangles, one per side, so a tap in the
 * top triangle moves up. Returns null near the diagonals.
 */
export function tapDirection(x: number, y: number, width: number, height: number): Direction | null {
  if (width <= 0 || height <= 0) return null;
  // Measured as shares of the half width and half height, so the diagonals run corner to corner on any shape.
  const shareRight = (x - width / 2) / (width / 2);
  const shareDown = (y - height / 2) / (height / 2);
  if (Math.abs(Math.abs(shareRight) - Math.abs(shareDown)) < TAP_DEAD_BAND) return null;
  if (Math.abs(shareRight) > Math.abs(shareDown)) return shareRight > 0 ? 'right' : 'left';
  return shareDown > 0 ? 'down' : 'up';
}

/** The direction of a swipe, or null when the finger barely moved. */
export function swipeDirection(distanceX: number, distanceY: number): Direction | null {
  if (Math.max(Math.abs(distanceX), Math.abs(distanceY)) < MIN_SWIPE_PIXELS) return null;
  if (Math.abs(distanceX) > Math.abs(distanceY)) return distanceX > 0 ? 'right' : 'left';
  return distanceY > 0 ? 'down' : 'up';
}
