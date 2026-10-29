// Draws a GameState in layers: the floor as one rectangle, then every tile as
// a box or as floor with its portals and crystal, then the player. Reads the
// state only; swipes on the board are turned into commands for the screen.
// The last action's engine events decide whether pieces slide, jump, bump or
// flip, how the Pebble reacts, and whether a collected star bursts. Every
// colour comes from the level's palette.
import { memo, useMemo } from 'react';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { opposite, type GameEvent, type GameState } from '../core';
import { portalSidesByTileIndex, floorColour } from './boardLayout';
import { BoardTile } from './BoardTile';
import { CollectBurstLayer } from './CollectBurst';
import type { Command } from './commands';
import { motionFor } from './motion';
import { glanceTargetFor, pebbleReactionFor } from './pieceLooks';
import { Player } from './Player';
import type { BoardPalette } from './theme';
import { drawnColourOf, useBoxAmounts } from './useBoxAmounts';
import { useSwipeGesture } from './useSwipeGesture';

interface BoardProps {
  state: GameState;
  events: GameEvent[]; // what the last action caused; empty after undo, restart or a new level
  tileSize: number;
  palette: BoardPalette; // changes only when a level starts or the player picks other colours
  onCommand: (command: Command) => void;
}

// Memoised so opening the level picker or switching language doesn't redraw every tile.
export const Board = memo(function Board({ state, events, tileSize, palette, onCommand }: BoardProps) {
  const portalSides = useMemo(() => portalSidesByTileIndex(state), [state]);
  const motion = useMemo(() => motionFor(events, state), [events, state]);
  const { boxAmountsByColour, drawnBoxColour } = useBoxAmounts(state.player.colour, motion);
  const { tileColours, seamColour } = palette;
  const floorStyle = useAnimatedStyle(() => ({ backgroundColor: tileColours[floorColour(drawnColourOf(drawnBoxColour.value))] }));
  const swipe = useSwipeGesture(onCommand);
  const reaction = useMemo(() => pebbleReactionFor(events, state), [events, state]);
  const glanceTarget = useMemo(() => glanceTargetFor(state), [state]);

  const cellPosition = (tileIndex: number) => ({
    left: (tileIndex % state.columnCount) * tileSize,
    top: Math.floor(tileIndex / state.columnCount) * tileSize,
  });
  const burst = useMemo(() => {
    const collectedTileIndex = state.tiles.findIndex((tile) => tile.id === reaction.collectedTileId);
    if (collectedTileIndex < 0) return null;
    // The star is the colour the player needed to be, the opposite of its tile.
    return { size: tileSize, ...cellPosition(collectedTileIndex), colour: tileColours[opposite(state.tiles[collectedTileIndex].colour)] };
  }, [reaction, state, tileSize, tileColours]);
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
            portalSides={portalSides.get(tileIndex) ?? []}
            boxAmount={boxAmountsByColour[tile.colour]}
            drawnBoxColour={drawnBoxColour}
            tileColours={tileColours}
            seamColour={seamColour}
            showCrystal={showsCrystal(tileIndex)}
            motion={motion}
          />
        ))}
        {/* Under the Pebble, which has just arrived on the star. */}
        <CollectBurstLayer burst={burst} />
        <Player
          drawnBoxColour={drawnBoxColour}
          tileColours={tileColours}
          tileSize={tileSize}
          left={state.player.column * tileSize}
          top={state.player.row * tileSize}
          motion={motion}
          reaction={reaction}
          glanceTarget={glanceTarget}
          won={state.status === 'won'}
        />
      </Animated.View>
    </GestureDetector>
  );
});

