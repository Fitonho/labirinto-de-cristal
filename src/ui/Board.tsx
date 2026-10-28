// Draws a GameState in layers: the floor as one rectangle, then every tile as
// a box or as floor with its doors and crystal, then the player. Reads the
// state only; swipes on the board are turned into commands for the screen.
// The last action's engine events decide whether pieces slide, jump, bump or
// flip.
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import { opposite, type Colour, type GameEvent, type GameState } from '../core';
import { doorSidesByTileIndex, floorColour, isBox } from './boardLayout';
import { BoardTile } from './BoardTile';
import { swipeDirection, type Command } from './commands';
import { FLIP_GROW_DURATION, motionFor, type BoardMotion } from './motion';
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
  const boxColour = useDrawnBoxColour(state.player.colour, motion);
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
          backgroundColor: tileColours[floorColour(boxColour)],
        }}
      >
        {state.tiles.map((tile, tileIndex) => (
          <BoardTile
            key={tile.id}
            tile={tile}
            size={tileSize}
            {...cellPosition(tileIndex)}
            doorSides={doorSides.get(tileIndex) ?? []}
            isBox={isBox(state, tile)}
            isDrawnAbove={tile.colour === boxColour}
            showCrystal={showsCrystal(tileIndex)}
            motion={motion}
          />
        ))}
        <Player
          colour={boxColour}
          tileSize={tileSize}
          left={state.player.column * tileSize}
          top={state.player.row * tileSize}
          motion={motion}
        />
      </View>
    </GestureDetector>
  );
}

/**
 * The colour drawn as boxes, which is also the player's colour on screen. On a
 * flip it stays the old colour until the old boxes have grown into full tiles,
 * so the floor, the player and which tiles sit on top all swap at that moment.
 */
function useDrawnBoxColour(playerColour: Colour, motion: BoardMotion): Colour {
  const reducedMotion = useReducedMotion();
  const [flipPastHalfway, setFlipPastHalfway] = useState<BoardMotion | null>(null);
  const waitsForHalfway = motion.flips && !reducedMotion && flipPastHalfway !== motion;

  useEffect(() => {
    if (!motion.flips || reducedMotion) return;
    const timer = setTimeout(() => setFlipPastHalfway(motion), FLIP_GROW_DURATION);
    return () => clearTimeout(timer);
  }, [motion, reducedMotion]);

  return waitsForHalfway ? opposite(playerColour) : playerColour;
}
