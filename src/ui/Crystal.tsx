// The crystal drawn on a cell, on the floor layer or riding inside a box.
// Uses react-native-svg.
import Svg, { Polygon } from 'react-native-svg';
import type { Colour } from '../core';
import { tileColours } from './theme';

interface CrystalProps {
  size: number;
  colour: Colour; // the colour the player needs to be to reach it
}

export function Crystal({ size, colour }: CrystalProps) {
  const centre = size / 2;
  const reach = size * 0.28;
  const points = [
    `${centre},${centre - reach}`,
    `${centre + reach},${centre}`,
    `${centre},${centre + reach}`,
    `${centre - reach},${centre}`,
  ].join(' ');
  return (
    <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
      <Polygon points={points} fill={tileColours[colour]} />
    </Svg>
  );
}
