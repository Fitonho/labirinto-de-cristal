// Draws a GameState in layers: the floor as one rectangle, then every tile as
// a box or as floor with its doors and crystal, then the player. Reads the
// state only; swipes on the board are turned into commands for the screen.
// The last action's engine events decide whether pieces slide, jump, bump or
// flip.
import { memo, useMemo, useRef } from 'react';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { GameEvent, GameState } from '../core';
import { doorSidesByTileIndex, floorColour } from './boardLayout';
import { BoardTile } from './BoardTile';
import { swipeDirection, type Command } from './commands';
import { motionFor } from './motion';
import { Player } from './Player';
import { tileColours } from './theme';
import { drawnColourOf, useBoxAmounts } from './useBoxAmounts';

interface BoardProps {
  state: GameState;
  events: GameEvent[]; // what the last action caused; empty after undo, restart or a new level
  tileSize: number;
  onCommand: (command: Command) => void;
}

// Memoised so opening the level picker or switching language doesn't redraw every tile.
export const Board = memo(function Board({ state, events, tileSize, onCommand }: BoardProps) {
  const doorSides = useMemo(() => doorSidesByTileIndex(state), [state]);
  const motion = useMemo(() => motionFor(events, state), [events, state]);
  const { boxAmountsByColour, drawnBoxColour } = useBoxAmounts(state.player.colour, motion);
  const floorStyle = useAnimatedStyle(() => ({ backgroundColor: tileColours[floorColour(drawnColourOf(drawnBoxColour.value))] }));
  // A swipe moves as soon as it is long enough, not when the finger lifts; the rest of that stroke does nothing.
  const swipeHasMoved = useRef(false);
  const swipe = usePanGesture({
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

  const cellPosition = (tileIndex: number) => ({
    left: (tileIndex % state.columnCount) * tileSize,
    top: Math.floor(tileIndex / state.columnCount) * tileSize,
  });
  const showsCrystal = (tileIndex: number) => {
    const tile = state.tiles[tileIndex];
    return Boolean(tile.goal) && !state.collectedGoalIds.includes(tile.id);
  };
  return (
    <GestureDetector gesture={swipe}>
      <Animated.View
        testID="board"
        accessibilityLabel="board"
        style={[{ width: tileSize * state.columnCount, height: tileSize * state.rowCount, overflow: 'hidden' }, floorStyle]}
      >
        {state.tiles.map((tile, tileIndex) => (
          <BoardTile
            key={tile.id}
            tile={tile}
            size={tileSize}
            {...cellPosition(tileIndex)}
            doorSides={doorSides.get(tileIndex) ?? []}
            boxAmount={boxAmountsByColour[tile.colour]}
            drawnBoxColour={drawnBoxColour}
            showCrystal={showsCrystal(tileIndex)}
            motion={motion}
          />
        ))}
        <Player
          drawnBoxColour={drawnBoxColour}
          tileSize={tileSize}
          left={state.player.column * tileSize}
          top={state.player.row * tileSize}
          motion={motion}
        />
      </Animated.View>
    </GestureDetector>
  );
});
