// The player: a round piece in its colour, centred on its cell, that slides
// from cell to cell and bumps when a move goes nowhere.
import Animated from 'react-native-reanimated';
import { opposite, type Colour } from '../core';
import { PLAYER_BUMP_DISTANCE, type BoardMotion } from './motion';
import { tileColours } from './theme';
import { useAnimatedPosition } from './useAnimatedPosition';

interface PlayerProps {
  colour: Colour;
  tileSize: number;
  left: number; // the cell's position; the player is centred inside it
  top: number;
  motion: BoardMotion;
}

export function Player({ colour, tileSize, left, top, motion }: PlayerProps) {
  const playerSize = tileSize / 2;
  const centring = (tileSize - playerSize) / 2;
  const positionStyle = useAnimatedPosition({
    left: left + centring,
    top: top + centring,
    motion,
    pieceId: 'player',
    bumpDistance: tileSize * PLAYER_BUMP_DISTANCE,
  });
  return (
    <Animated.View
      testID="player"
      style={[
        {
          position: 'absolute',
          width: playerSize,
          height: playerSize,
          borderRadius: playerSize / 2,
          backgroundColor: tileColours[colour],
          borderWidth: 1,
          borderColor: tileColours[opposite(colour)],
        },
        positionStyle,
      ]}
    />
  );
}
