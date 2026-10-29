// Arrow keys, WASD, Z, Backspace, R, M, V, Enter, Space, L and Escape on the web. Phones have no keyboard
// listener; hardware keyboards on native come later.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { commandsByKey, type Command } from './commands';

/**
 * `onCommand` returns false for a key it didn't use, such as Enter before the
 * level is won, which then reaches the focused button as usual. The listener
 * runs before the page's buttons see the key, so Enter on the result card goes
 * to the next level even while another button has focus.
 */
export function useKeyboardCommands(onCommand: (command: Command) => boolean, enabled: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) return;
      const command = commandsByKey[keyEvent.key.toLowerCase()];
      if (!command) return;
      if (!onCommand(command)) return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onCommand, enabled]);
}
