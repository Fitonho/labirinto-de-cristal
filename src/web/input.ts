// Turns keys and swipes into game commands.
import type { Direction } from '../core';

export type Command = { type: 'move'; dir: Direction } | { type: 'undo' } | { type: 'reset' };

const keys: Record<string, Command> = {
  arrowup: { type: 'move', dir: 'up' },
  arrowright: { type: 'move', dir: 'right' },
  arrowdown: { type: 'move', dir: 'down' },
  arrowleft: { type: 'move', dir: 'left' },
  w: { type: 'move', dir: 'up' },
  d: { type: 'move', dir: 'right' },
  s: { type: 'move', dir: 'down' },
  a: { type: 'move', dir: 'left' },
  z: { type: 'undo' },
  backspace: { type: 'undo' },
  r: { type: 'reset' },
};

export function listenToKeys(onCommand: (c: Command) => void) {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    const command = keys[e.key.toLowerCase()];
    if (!command) return;
    e.preventDefault();
    onCommand(command);
  });
}

const MIN_SWIPE = 24; // px

export function listenToSwipes(area: HTMLElement, onCommand: (c: Command) => void) {
  let start: { x: number; y: number } | null = null;
  area.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
  });
  area.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < MIN_SWIPE) return;
    const dir: Direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    onCommand({ type: 'move', dir });
  });
  area.addEventListener('pointercancel', () => (start = null));
}
