// One box: a tile in the player's colour, drawn on top of the floor layer.
// The box is a plain rectangle inset from its cell, so the floor showing
// between boxes is their outline and no seam can open between tiles. Its
// dotted doors and its crystal are drawn inside it, so they move with it.
import { StyleSheet, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { opposite, type Colour, type Direction, type Tile } from '../core';
import { boxInsets } from './boardLayout';
import { Crystal } from './Crystal';
import { EDGE_WIDTH, tileColours } from './theme';

interface BoxProps {
  tile: Tile;
  size: number;
  left: number; // the cell's position; the box's own shape comes from boxInsets
  top: number;
  doorSides: Direction[];
  showCrystal: boolean;
}

export function Box({ tile, size, left, top, doorSides, showCrystal }: BoxProps) {
  return (
    <View testID={`box-${tile.id}`} style={{ position: 'absolute', left, top, width: size, height: size }}>
      <View style={[styles.fill, boxInsets(doorSides), { backgroundColor: tileColours[tile.colour] }]} />
      {doorSides.length > 0 && (
        <Svg width={size} height={size} style={styles.fill}>
          <DoorEdges size={size} colour={opposite(tile.colour)} doorSides={doorSides} />
        </Svg>
      )}
      {showCrystal && <Crystal size={size} colour={opposite(tile.colour)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
});

/** Doors are dotted in the floor colour along the box's door sides. */
function DoorEdges({ size, colour, doorSides }: { size: number; colour: Colour; doorSides: Direction[] }) {
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
      {doorSides.map((doorSide) => {
        const [startX, startY, endX, endY] = edgeEnds[doorSide];
        return (
          <Line
            key={doorSide}
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={tileColours[colour]}
            strokeWidth={EDGE_WIDTH}
            strokeDasharray={[EDGE_WIDTH, EDGE_WIDTH]}
          />
        );
      })}
    </>
  );
}
