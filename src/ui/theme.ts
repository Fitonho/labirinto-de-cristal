// Colours and spacing for the app. The engine only knows 'black' and 'white';
// this is the one place that turns them into screen colours.
import type { Colour } from '../core';

export const tileColours: Record<Colour, string> = {
  black: '#000000',
  white: '#ffffff',
};

export const palette = {
  page: '#f4f4f2',
  ink: '#1d1d1f',
  quiet: '#6b6b70',
  accent: '#2f6fd6',
  control: '#ffffff',
  controlBorder: '#c8c8cc',
};

/** Width of a tile's outline and of its dotted door edges. */
export const EDGE_WIDTH = 3;
