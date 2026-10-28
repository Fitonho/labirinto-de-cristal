// The player: a round piece in its colour, centred on its cell, that slides
// from cell to cell and bumps when a move goes nowhere. Its colour is the
// board's drawn box colour, so on a flip it swaps with the floor.
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { floorColour } from './boardLayout';
import { PLAYER_BUMP_DISTANCE, type BoardMotion } from './motion';
import { tileColours } from './theme';
import { useAnimatedPosition } from './useAnimatedPosition';
import { drawnColourOf, type DrawnBoxColour } from './useBoxAmounts';

interface PlayerProps {
  drawnBoxColour: DrawnBoxColour;
  tileSize: number;
  left: number; // the cell's position; the player is centred inside it
  top: number;
  motion: BoardMotion;
}

export function Player({ drawnBoxColour, tileSize, left, top, motion }: PlayerProps) {
  const playerSize = tileSize / 2;
  const centring = (tileSize - playerSize) / 2;
  const positionStyle = useAnimatedPosition({
    left: left + centring,
    top: top + centring,
    motion,
    pieceId: 'player',
    bumpDistance: tileSize * PLAYER_BUMP_DISTANCE,
  });
  const colourStyle = useAnimatedStyle(() => {
    const playerColour = drawnColourOf(drawnBoxColour.value);
    return { backgroundColor: tileColours[playerColour], borderColor: tileColours[floorColour(playerColour)] };
  });
  return (
    <Animated.View
      testID="player"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: playerSize,
          height: playerSize,
          borderRadius: playerSize / 2,
          borderWidth: 1,
        },
        colourStyle,
        positionStyle,
      ]}
    />
  );
}
