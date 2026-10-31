// Arrow keys, WASD, Z, Backspace, R, M, V, Enter, Space, L and Escape on the web. Phones have no keyboard
// listener; hardware keyboards on native come later. A held move key repeats at the hold beat, the same as a
// held finger, instead of at the computer's own key repeat.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { commandsByKey, type Command } from './commands';
import { HOLD_FIRST_REPEAT_DELAY } from './motion';
import { useHeldMove } from './useHeldMove';

/**
 * `onCommand` returns false for a key it didn't use, such as Enter before the
 * level is won, which then reaches the focused button as usual. The listener
 * runs before the page's buttons see the key, so Enter on the result card goes
 * to the next level even while another button has focus.
 */
export function useKeyboardCommands(onCommand: (command: Command) => boolean, enabled: boolean) {
  const { startHold, stopHold } = useHeldMove(onCommand);
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    let heldKey: string | null = null;
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) return;
      const key = keyEvent.key.toLowerCase();
      const command = commandsByKey[key];
      if (!command) return;
      // The computer's own repeats of a held move key; the hold beat moves instead.
      if (keyEvent.repeat && key === heldKey) {
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        return;
      }
      if (!onCommand(command)) return;
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      if (command.type === 'move') {
        heldKey = key;
        startHold(() => command.direction, HOLD_FIRST_REPEAT_DELAY, command.direction);
      }
    };
    const handleKeyUp = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key.toLowerCase() !== heldKey) return;
      heldKey = null;
      stopHold();
    };
    const handleBlur = () => {
      heldKey = null;
      stopHold();
    };
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleBlur);
      stopHold();
    };
  }, [onCommand, enabled, startHold, stopHold]);
}
