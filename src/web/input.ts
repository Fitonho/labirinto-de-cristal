// Turns keys and swipes into game commands.
import type { Direction } from '../core';

export type Command = { type: 'move'; direction: Direction } | { type: 'undo' } | { type: 'reset' };

const commandsByKey: Record<string, Command> = {
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
};

export function listenToKeys(onCommand: (c: Command) => void) {
  document.addEventListener('keydown', (keyEvent) => {
    if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) return;
    if (keyEvent.target instanceof HTMLSelectElement || keyEvent.target instanceof HTMLInputElement) return;
    const command = commandsByKey[keyEvent.key.toLowerCase()];
    if (!command) return;
    keyEvent.preventDefault();
    onCommand(command);
  });
}

const MIN_SWIPE_PIXELS = 24;

export function listenToSwipes(swipeArea: HTMLElement, onCommand: (c: Command) => void) {
  let swipeStart: { x: number; y: number } | null = null;
  swipeArea.addEventListener('pointerdown', (pointerEvent) => {
    swipeStart = { x: pointerEvent.clientX, y: pointerEvent.clientY };
  });
  swipeArea.addEventListener('pointerup', (pointerEvent) => {
    if (!swipeStart) return;
    const distanceX = pointerEvent.clientX - swipeStart.x;
    const distanceY = pointerEvent.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.max(Math.abs(distanceX), Math.abs(distanceY)) < MIN_SWIPE_PIXELS) return;
    const direction: Direction =
      Math.abs(distanceX) > Math.abs(distanceY) ? (distanceX > 0 ? 'right' : 'left') : distanceY > 0 ? 'down' : 'up';
    onCommand({ type: 'move', direction });
  });
  swipeArea.addEventListener('pointercancel', () => (swipeStart = null));
}
