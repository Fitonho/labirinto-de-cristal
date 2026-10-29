// The swipe that moves the player, shared by the board and the touch area
// under it.
import { useRef } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import { swipeDirection, type Command } from './commands';

export function useSwipeGesture(onCommand: (command: Command) => void) {
  // A swipe moves as soon as it is long enough, not when the finger lifts; the rest of that stroke does nothing.
  const swipeHasMoved = useRef(false);
  return usePanGesture({
    runOnJS: true,
    onBegin: () => {
      swipeHasMoved.current = false;
    },
    onUpdate: (panEvent) => {
      if (swipeHasMoved.current) return;
      const direction = swipeDirection(panEvent.translationX, panEvent.translationY);
      if (!direction) return;
      swipeHasMoved.current = true;
      onCommand({ type: 'move', direction });
    },
  });
}
