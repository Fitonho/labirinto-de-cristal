// The Lab: boards from the level generator (npm run generate), to play and
// judge before any of them becomes a real level. It is a chapter only in dev,
// in Expo Go, and on the web with ?debug, so players never see it. Each Lab
// level keeps its shortest solution, which the game's Solve button plays.
// A board can also come in through the page address (?board=...), which the
// generator prints for every board it finds.
import type { Direction, LevelData } from '../core';

export interface LabLevel extends LevelData {
  /** The shortest solution, one letter per move: u, d, l, r. */
  solution: string;
}

export const LAB_CHAPTER = 'lab';
/** The id of the board opened from the page address. */
export const LINKED_LEVEL_ID = 'lab-link';

const DIRECTIONS_BY_LETTER: Record<string, Direction> = { u: 'up', d: 'down', l: 'left', r: 'right' };
const PORTAL_SIDES_BY_LETTER: Record<string, 'right' | 'down'> = { r: 'right', d: 'down' };

export function directionsFor(solution: string): Direction[] {
  return [...solution].map((letter) => DIRECTIONS_BY_LETTER[letter]).filter(Boolean);
}

export function solutionLettersFor(directions: Direction[]): string {
  return directions.map((direction) => direction[0]).join('');
}

/**
 * The address part for a board, short enough to read and edit by hand:
 * board=wwbB-wbbw (rows split by -), start=row,column, portals=row,column,r;...
 * (r or d for the right or lower edge), solution=urdl.
 */
export function linkQueryFor(level: LabLevel): string {
  // Built by hand rather than with URLSearchParams, which would escape every comma.
  const boardText = level.grid.map((rowText) => rowText.replace(/ /g, '')).join('-');
  const portalsText = (level.portals ?? []).map(([row, column, side]) => `${row},${column},${side[0]}`).join(';');
  return `?board=${boardText}&start=${level.start.join(',')}&portals=${portalsText}&solution=${level.solution}`;
}

/** The board in a page address, or null when it has none or it can't be read. */
export function levelFromLink(search: string): LabLevel | null {
  const parameters = new URLSearchParams(search);
  const boardText = parameters.get('board');
  const startText = parameters.get('start');
  if (!boardText || !startText) return null;
  const [startRow, startColumn] = startText.split(',').map(Number);
  const portals = (parameters.get('portals') ?? '')
    .split(';')
    .filter(Boolean)
    .map((portalText) => portalText.split(','))
    .map(([row, column, sideLetter]): [number, number, Direction] => [Number(row), Number(column), PORTAL_SIDES_BY_LETTER[sideLetter] ?? 'right']);
  const solution = parameters.get('solution') ?? '';
  return {
    version: 2,
    id: LINKED_LEVEL_ID,
    chapter: LAB_CHAPTER,
    order: 0,
    grid: boardText.split('-').map((rowText) => [...rowText].join(' ')),
    start: [startRow, startColumn],
    portals,
    par: solution.length || undefined,
    solution,
  };
}
