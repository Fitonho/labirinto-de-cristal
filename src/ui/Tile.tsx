// One board tile: its colour, the outline that marks it as solid, dotted door
// edges and its crystal. Drawn with react-native-svg so it looks the same on
// phones and the web.
import { View } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import { opposite, type Colour, type Direction, type Tile as TileData } from '../core';
import { EDGE_WIDTH, tileColours } from './theme';

interface TileProps {
  tile: TileData;
  size: number;
  left: number;
  top: number;
  solid: boolean; // the player's colour, so it blocks and can be pushed
  doorSides: Direction[];
  showCrystal: boolean;
}

export function Tile({ tile, size, left, top, solid, doorSides, showCrystal }: TileProps) {
  return (
    <View
      testID={`tile-${tile.id}`}
      style={{ position: 'absolute', left, top, width: size, height: size, backgroundColor: tileColours[tile.colour] }}
    >
      <Svg width={size} height={size}>
        {solid && <TileOutline size={size} colour={opposite(tile.colour)} doorSides={doorSides} />}
        {showCrystal && <Crystal size={size} colour={opposite(tile.colour)} />}
      </Svg>
    </View>
  );
}

const edgeDirections: Direction[] = ['up', 'right', 'down', 'left'];

function TileOutline({ size, colour, doorSides }: { size: number; colour: Colour; doorSides: Direction[] }) {
  const inset = EDGE_WIDTH / 2;
  const far = size - inset;
  const edgeEnds: Record<Direction, [number, number, number, number]> = {
    up: [0, inset, size, inset],
    right: [far, 0, far, size],
    down: [0, far, size, far],
    left: [inset, 0, inset, size],
  };
  return (
    <>
      {edgeDirections.map((direction) => {
        const [startX, startY, endX, endY] = edgeEnds[direction];
        const isDoor = doorSides.includes(direction);
        return (
          <Line
            key={direction}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={tileColours[colour]}
            strokeWidth={EDGE_WIDTH}
            strokeDasharray={isDoor ? [EDGE_WIDTH, EDGE_WIDTH] : undefined}
          />
        );
      })}
    </>
  );
}

/** The crystal is drawn in the colour the player needs to be to reach it. */
function Crystal({ size, colour }: { size: number; colour: Colour }) {
  const centre = size / 2;
  const reach = size * 0.28;
  const points = [
    `${centre},${centre - reach}`,
    `${centre + reach},${centre}`,
    `${centre},${centre + reach}`,
    `${centre - reach},${centre}`,
  ].join(' ');
  return <Polygon points={points} fill={tileColours[colour]} />;
}
