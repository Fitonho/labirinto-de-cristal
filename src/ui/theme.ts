// Colours and spacing for the app. The engine only knows 'black' and 'white';
// this is the one place that turns them into screen colours. Each level is
// drawn in a board palette, a dark and a light colour, and the app around the
// board takes its colours from the same palette.
import type { Colour } from '../core';
import type { PaletteId } from '../state/palettes';

export interface BoardPalette {
  id: PaletteId;
  /** 'black' is always the dark colour and 'white' the light one, so the board never relies on hue alone. */
  tileColours: Record<Colour, string>;
  /** The glowing seam that marks a door: amber, or another colour where amber is too close to the light colour. */
  seamColour: string;
  /** Links, the current level and the touch area in the app around the board. */
  accent: string;
}

function boardPalette(id: PaletteId, dark: string, light: string, seamColour: string, accent: string): BoardPalette {
  return { id, tileColours: { black: dark, white: light }, seamColour, accent };
}

const AMBER = '#e8a317';
const DEEP_AMBER = '#e8920c';

/**
 * Every pair keeps at least 7.8:1 contrast between its two colours, also as seen with protanopia,
 * deuteranopia and tritanopia, and its seam stands apart from both colours (tests/theme.test.ts).
 */
export const boardPalettes: Record<PaletteId, BoardPalette> = {
  ink: boardPalette('ink', '#1d2b4f', '#f2ead9', AMBER, '#3557a8'),
  forest: boardPalette('forest', '#173d2f', '#dcece0', '#f0a020', '#236b4a'),
  ocean: boardPalette('ocean', '#0b3550', '#d6eef2', '#f2a51a', '#17628c'),
  plum: boardPalette('plum', '#3a1838', '#fde2cf', '#19b6c9', '#8e3b86'),
  clay: boardPalette('clay', '#6e2614', '#f3e1c0', '#22b5c8', '#a83f22'),
  night: boardPalette('night', '#221a45', '#e4daf6', DEEP_AMBER, '#5b47b8'),
  cocoa: boardPalette('cocoa', '#3a2216', '#f4e7d6', '#2bb3c6', '#8a5233'),
  moss: boardPalette('moss', '#253312', '#f4f0b0', '#e0457b', '#4f6a18'),
  wine: boardPalette('wine', '#4a0d22', '#f9dbe2', DEEP_AMBER, '#b0284f'),
  slate: boardPalette('slate', '#26313f', '#cfe3f6', DEEP_AMBER, '#2f629c'),
  teal: boardPalette('teal', '#053c3e', '#ffdcbf', '#4d7cff', '#0b6b6c'),
  ember: boardPalette('ember', '#2b1d1a', '#e6e2dc', DEEP_AMBER, '#a8503a'),
  indigo: boardPalette('indigo', '#1c1f5c', '#d2f4e3', '#f2a81c', '#3c46c4'),
};

/** The colours of the app around the board, all taken from the level's palette. */
export interface AppColours {
  page: string;
  ink: string;
  quiet: string;
  accent: string;
  /** Text on an accent background. */
  onAccent: string;
  control: string;
  controlBorder: string;
  /** The touch area under the board: a faint fill, its two diagonals and the four arrows. */
  touchPadFill: string;
  touchPadLine: string;
  touchPadArrow: string;
  /** A thin line and soft shadow round the board, so a floor close to the page colour still has an edge. */
  boardEdge: string;
}

function channelsOf(hexColour: string): number[] {
  return [1, 3, 5].map((offset) => parseInt(hexColour.slice(offset, offset + 2), 16));
}

/** A colour part of the way from one to the other, as a hex code. */
export function mixColours(fromColour: string, toColour: string, shareOfTo: number): string {
  const toChannels = channelsOf(toColour);
  const mixedChannels = channelsOf(fromColour).map((channel, channelIndex) =>
    Math.round(channel + (toChannels[channelIndex] - channel) * shareOfTo),
  );
  return '#' + mixedChannels.map((channel) => channel.toString(16).padStart(2, '0')).join('');
}

function withOpacity(hexColour: string, opacity: number): string {
  const [red, green, blue] = channelsOf(hexColour);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

/** The page is a pale wash of the light colour, text is the dark colour, and highlights use the accent. */
export function appColoursFor(palette: BoardPalette): AppColours {
  const { black: dark, white: light } = palette.tileColours;
  const page = mixColours(light, '#fbfbfa', 0.45);
  return {
    page,
    ink: mixColours(dark, '#000000', 0.15),
    quiet: mixColours(dark, page, 0.25),
    accent: palette.accent,
    onAccent: '#ffffff',
    control: mixColours(page, '#ffffff', 0.6),
    controlBorder: mixColours(dark, page, 0.75),
    touchPadFill: withOpacity(palette.accent, 0.05),
    touchPadLine: withOpacity(palette.accent, 0.25),
    touchPadArrow: withOpacity(palette.accent, 0.5),
    boardEdge: withOpacity(dark, 0.35),
  };
}

/** The dimmed backdrop behind the level and colour pickers. */
export const BACKDROP_COLOUR = 'rgba(0, 0, 0, 0.4)';
/** How long the page takes to fade to a new level's colours, in milliseconds. */
export const PALETTE_FADE_DURATION = 300;

/** How far a box sits inside its cell, and how round its corners are, as shares of the tile size. */
export const BOX_INSET = 0.1;
export const BOX_CORNER_RADIUS = 0.2;
/** How far from a door side a box's edge starts curving out into it, as a share of the tile size. */
export const DOOR_FLARE_LENGTH = 0.26;

/** The seam's visible half, its glow, and the frame that clips the glow to the door's own cell, in points. */
export const SEAM_WIDTH = 3;
export const SEAM_GLOW = 7;
export const SEAM_FRAME_WIDTH = 12;
/** The seam reaches this far under its box, so pixel rounding on phones can't open a gap between them. */
export const SEAM_OVERLAP = 1;
/** How long the seam's rounded ends are, along the edge. */
export const SEAM_CAP_LENGTH = SEAM_WIDTH * 3;

/** The Pebble's size, as a share of the tile size: its radius across, and how much less tall it is. */
export const PEBBLE_RADIUS = 0.26;
export const PEBBLE_HEIGHT_RATIO = 0.94;
/** The Beacon star's points and waist, as shares of the tile size. */
export const STAR_OUTER_RADIUS = 0.27;
export const STAR_INNER_RADIUS = 0.07;
/** A ring starts this far out and grows by this much before it fades, as shares of the tile size. */
export const RING_START_RADIUS = 0.14;
export const RING_GROWTH = 0.3;
export const RING_WIDTH = 0.03;
