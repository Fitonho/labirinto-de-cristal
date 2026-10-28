// Turns keys and swipes into game commands.
import { commandsByKey, swipeDirection, type Command } from '../ui/commands';

export type { Command };

export function listenToKeys(onCommand: (command: Command) => void) {
  document.addEventListener('keydown', (keyEvent) => {
    if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) return;
    if (keyEvent.target instanceof HTMLSelectElement || keyEvent.target instanceof HTMLInputElement) return;
    const command = commandsByKey[keyEvent.key.toLowerCase()];
    if (!command) return;
    keyEvent.preventDefault();
    onCommand(command);
  });
}

export function listenToSwipes(swipeArea: HTMLElement, onCommand: (command: Command) => void) {
  let swipeStart: { x: number; y: number } | null = null;
  swipeArea.addEventListener('pointerdown', (pointerEvent) => {
    swipeStart = { x: pointerEvent.clientX, y: pointerEvent.clientY };
  });
  swipeArea.addEventListener('pointerup', (pointerEvent) => {
    if (!swipeStart) return;
    const distanceX = pointerEvent.clientX - swipeStart.x;
    const distanceY = pointerEvent.clientY - swipeStart.y;
    swipeStart = null;
    const direction = swipeDirection(distanceX, distanceY);
    if (direction) onCommand({ type: 'move', direction });
  });
  swipeArea.addEventListener('pointercancel', () => (swipeStart = null));
}
