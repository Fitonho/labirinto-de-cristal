// Player commands and the keys that trigger them, shared by every shell.
import type { Direction } from '../core';

export type Command =
  | { type: 'move'; direction: Direction }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'toggleSound' }
  | { type: 'toggleVibration' };

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
};

export const MIN_SWIPE_PIXELS = 24;

/** The direction of a swipe, or null when the finger barely moved. */
export function swipeDirection(distanceX: number, distanceY: number): Direction | null {
  if (Math.max(Math.abs(distanceX), Math.abs(distanceY)) < MIN_SWIPE_PIXELS) return null;
  if (Math.abs(distanceX) > Math.abs(distanceY)) return distanceX > 0 ? 'right' : 'left';
  return distanceY > 0 ? 'down' : 'up';
}
