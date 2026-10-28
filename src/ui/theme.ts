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

/** The glowing seam that marks a door. A UI colour, not a game colour: a chapter palette picks one that shows on both tiles. */
export const seamColour = '#e8a317';

/** How far a box sits inside its cell, and how round its corners are, as shares of the tile size. */
export const BOX_INSET = 0.1;
export const BOX_CORNER_RADIUS = 0.2;
/** How far from a door side a box's edge starts curving out into it, as a share of the tile size. */
export const DOOR_FLARE_LENGTH = 0.26;

/** The seam's visible half, its glow, and the frame that clips the glow to the door's own cell, in points. */
export const SEAM_WIDTH = 3;
export const SEAM_GLOW = 7;
export const SEAM_FRAME_WIDTH = 12;
/** How long the seam's rounded ends are, along the edge. */
export const SEAM_CAP_LENGTH = SEAM_WIDTH * 3;
