// Draws a GameState in layers: the floor as one rectangle with the crystals
// that lie on it, then the boxes (tiles in the player's colour) with their
// doors and crystals, then the player. Reads the state only; swipes on the
// board are turned into commands for the screen. The last action's engine
// events decide whether boxes and the player slide, jump or bump.
import { useMemo } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { opposite, type GameEvent, type GameState } from '../core';
import { Box } from './Box';
import { doorSidesByTileIndex, floorColour, isBox } from './boardLayout';
import { swipeDirection, type Command } from './commands';
import { Crystal } from './Crystal';
import { motionFor } from './motion';
import { Player } from './Player';
import { tileColours } from './theme';

interface BoardProps {
  state: GameState;
  events: GameEvent[]; // what the last action caused; empty after undo, restart or a new level
  tileSize: number;
  onCommand: (command: Command) => void;
}

export function Board({ state, events, tileSize, onCommand }: BoardProps) {
  const doorSides = useMemo(() => doorSidesByTileIndex(state), [state]);
  const motion = useMemo(() => motionFor(events, state), [events, state]);
  const swipe = usePanGesture({
    runOnJS: true,
    onDeactivate: (panEvent) => {
      const direction = swipeDirection(panEvent.translationX, panEvent.translationY);
      if (direction) onCommand({ type: 'move', direction });
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
      <View
        testID="board"
        accessibilityLabel="board"
        style={{
          width: tileSize * state.columnCount,
          height: tileSize * state.rowCount,
          overflow: 'hidden',
          backgroundColor: tileColours[floorColour(state)],
        }}
      >
        {state.tiles.map((tile, tileIndex) =>
          !isBox(state, tile) && showsCrystal(tileIndex) ? (
            <View
              key={tile.id}
              testID={`floor-crystal-${tile.id}`}
              style={{ position: 'absolute', ...cellPosition(tileIndex), width: tileSize, height: tileSize }}
            >
              <Crystal size={tileSize} colour={opposite(tile.colour)} />
            </View>
          ) : null,
        )}
        {state.tiles.map((tile, tileIndex) =>
          isBox(state, tile) ? (
            <Box
              key={tile.id}
              tile={tile}
              size={tileSize}
              {...cellPosition(tileIndex)}
              doorSides={doorSides.get(tileIndex) ?? []}
              showCrystal={showsCrystal(tileIndex)}
              motion={motion}
            />
          ) : null,
        )}
        <Player
          colour={state.player.colour}
          tileSize={tileSize}
          left={state.player.column * tileSize}
          top={state.player.row * tileSize}
          motion={motion}
        />
      </View>
    </GestureDetector>
  );
}
