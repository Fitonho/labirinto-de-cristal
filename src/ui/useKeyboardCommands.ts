// Arrow keys, WASD, Z, Backspace, R, M and V on the web. Phones have no keyboard
// listener; hardware keyboards on native come later.
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { commandsByKey, type Command } from './commands';

export function useKeyboardCommands(onCommand: (command: Command) => void, enabled: boolean) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled) return;
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) return;
      const command = commandsByKey[keyEvent.key.toLowerCase()];
      if (!command) return;
      keyEvent.preventDefault();
      onCommand(command);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCommand, enabled]);
}
