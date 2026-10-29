// Checks every board palette for what the game needs from it: the two tile
// colours far apart for everyone, including colour-blind players, a door seam
// that stands apart from both, and readable text in the app around the board.
import { describe, expect, it } from 'vitest';
import { PALETTE_IDS } from '../src/state/palettes';
import { appColoursFor, boardPalettes } from '../src/ui/theme';

type LinearColour = [number, number, number];

function linearColourOf(hexColour: string): LinearColour {
  return [1, 3, 5].map((offset) => {
    const channel = parseInt(hexColour.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as LinearColour;
}

function contrastRatio(firstColour: LinearColour, secondColour: LinearColour): number {
  const luminanceOf = ([red, green, blue]: LinearColour) => 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  const [brighter, darker] = [luminanceOf(firstColour), luminanceOf(secondColour)].sort((left, right) => right - left);
  return (brighter + 0.05) / (darker + 0.05);
}

/** Full-strength simulations (Machado, Oliveira and Fernandes, 2009), applied to linear RGB. */
const visionMatrices: Record<string, number[][]> = {
  normal: [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

function seenAs(matrix: number[][], colour: LinearColour): LinearColour {
  return matrix.map((matrixRow) =>
    Math.min(1, Math.max(0, matrixRow[0] * colour[0] + matrixRow[1] * colour[1] + matrixRow[2] * colour[2])),
  ) as LinearColour;
}

/** Distance in Oklab, where 0.1 is a clearly different colour and 1 is black to white. */
function colourDistance(firstColour: LinearColour, secondColour: LinearColour): number {
  const oklabOf = ([red, green, blue]: LinearColour) => {
    const long = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
    const medium = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
    const short = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
    return [
      0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short,
      1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short,
      0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short,
    ];
  };
  const first = oklabOf(firstColour);
  const second = oklabOf(secondColour);
  return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
}

function rgbaToLinear(colour: string): LinearColour {
  const [red, green, blue] = colour.match(/\d+/g)!.map(Number);
  return linearColourOf('#' + [red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join(''));
}

describe('board palettes', () => {
  it('has a palette for every id, with black the dark colour and white the light one', () => {
    for (const paletteId of PALETTE_IDS) {
      const { tileColours } = boardPalettes[paletteId];
      expect(boardPalettes[paletteId].id).toBe(paletteId);
      const darkLuminance = contrastRatio(linearColourOf(tileColours.black), [0, 0, 0]);
      const lightLuminance = contrastRatio(linearColourOf(tileColours.white), [0, 0, 0]);
      expect(darkLuminance).toBeLessThan(lightLuminance);
    }
  });

  it('keeps the two tile colours at least 7.5:1 apart, also for colour-blind players', () => {
    for (const paletteId of PALETTE_IDS) {
      const dark = linearColourOf(boardPalettes[paletteId].tileColours.black);
      const light = linearColourOf(boardPalettes[paletteId].tileColours.white);
      for (const [visionName, matrix] of Object.entries(visionMatrices)) {
        expect(contrastRatio(seenAs(matrix, dark), seenAs(matrix, light)), `${paletteId}, ${visionName}`).toBeGreaterThanOrEqual(7.5);
      }
    }
  });

  it('draws the door seam in a colour that stands apart from both tiles for everyone', () => {
    for (const paletteId of PALETTE_IDS) {
      const { tileColours, seamColour } = boardPalettes[paletteId];
      for (const [visionName, matrix] of Object.entries(visionMatrices)) {
        const seam = seenAs(matrix, linearColourOf(seamColour));
        for (const tileColour of [tileColours.black, tileColours.white]) {
          expect(colourDistance(seam, seenAs(matrix, linearColourOf(tileColour))), `${paletteId}, ${visionName}`).toBeGreaterThanOrEqual(0.17);
        }
      }
    }
  });

  it('gives the app around the board readable text in every palette', () => {
    for (const paletteId of PALETTE_IDS) {
      const appColours = appColoursFor(boardPalettes[paletteId]);
      const page = linearColourOf(appColours.page);
      expect(contrastRatio(linearColourOf(appColours.ink), page), paletteId).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(linearColourOf(appColours.quiet), page), paletteId).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(linearColourOf(appColours.accent), page), paletteId).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(linearColourOf(appColours.onAccent), linearColourOf(appColours.accent)), paletteId).toBeGreaterThanOrEqual(4.5);
      expect(rgbaToLinear(appColours.touchPadLine)).toEqual(linearColourOf(appColours.accent));
    }
  });
});
