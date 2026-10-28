// Draws a GameState: tiles, doors, crystals and the player. Reads the state
// only; swipes on the board are turned into commands for the screen.
import { useMemo } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { opposite, type GameState } from '../core';
import { doorSidesByTileIndex } from './boardLayout';
import { swipeDirection, type Command } from './commands';
import { tileColours } from './theme';
import { Tile } from './Tile';

interface BoardProps {
  state: GameState;
  tileSize: number;
  onCommand: (command: Command) => void;
}

export function Board({ state, tileSize, onCommand }: BoardProps) {
  const doorSides = useMemo(() => doorSidesByTileIndex(state), [state]);
  const swipe = usePanGesture({
    runOnJS: true,
    onDeactivate: (panEvent) => {
      const direction = swipeDirection(panEvent.translationX, panEvent.translationY);
      if (direction) onCommand({ type: 'move', direction });
    },
  });

  const playerSize = tileSize / 2;
  return (
    <GestureDetector gesture={swipe}>
      <View
        testID="board"
        accessibilityLabel="board"
        style={{ width: tileSize * state.columnCount, height: tileSize * state.rowCount }}
      >
        {state.tiles.map((tile, tileIndex) => (
          <Tile
            key={tile.id}
            tile={tile}
            size={tileSize}
            left={(tileIndex % state.columnCount) * tileSize}
            top={Math.floor(tileIndex / state.columnCount) * tileSize}
            solid={tile.colour === state.player.colour}
            doorSides={doorSides.get(tileIndex) ?? []}
            showCrystal={Boolean(tile.goal) && !state.collectedGoalIds.includes(tile.id)}
          />
        ))}
        <View
          testID="player"
          style={{
            position: 'absolute',
            left: state.player.column * tileSize + (tileSize - playerSize) / 2,
            top: state.player.row * tileSize + (tileSize - playerSize) / 2,
            width: playerSize,
            height: playerSize,
            borderRadius: playerSize / 2,
            backgroundColor: tileColours[state.player.colour],
            borderWidth: 1,
            borderColor: tileColours[opposite(state.player.colour)],
          }}
        />
      </View>
    </GestureDetector>
  );
}
