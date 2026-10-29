// The levels that bring in a new idea, and how the new-idea card shows it: its
// timeline, and what lights up on the real board once the card closes. Only
// these levels get a card. No React here, so Vitest tests it.
import { DIRECTIONS, inside, tileAt, type Cell, type GameState, type Portal } from '../core';
import { neighbour } from '../core/board';

export type LevelIdea = 'push' | 'portal' | 'pushPath' | 'crystalColour' | 'portalPush';

export const ideaByLevelId: Record<string, LevelIdea> = {
  'sample-a': 'push',
  'sample-b': 'portal',
  'sample-c': 'pushPath',
  'sample-d': 'crystalColour',
  'sample-e': 'portalPush',
};

/** The card's timeline, in milliseconds from when it opens. */
export const IDEA_CARD_RISE_DURATION = 350;
/** When the label, the name, the little scene, the tip and the button fade up. */
export const IDEA_CARD_PART_DELAYS = [200, 320, 350, 500, 600] as const;
export const IDEA_CARD_PART_DURATION = 250;
/** Play fills from FILL_START until HOLD; before HOLD a tap only nudges it, so the tip gets read. */
export const IDEA_CARD_FILL_START = 600;
export const IDEA_CARD_HOLD = 1800;
export const IDEA_CARD_CLOSE_DURATION = 300;
/** One loop of the little scene. */
export const IDEA_SCENE_DURATION = 2400;
/** Each of the two glows on the board after the card closes. */
export const IDEA_GLOW_DURATION = 350;

/** Whether the card opens on its own: a level with an idea, not solved yet, on a fresh board. */
export function opensIdeaCard(levelId: string, bestMovesByLevelId: Record<string, number>, steps: string): boolean {
  return levelId in ideaByLevelId && bestMovesByLevelId[levelId] === undefined && steps === '';
}

export interface IdeaHighlight {
  cells: Cell[];
  portals: Portal[];
}

/** What glows on the board after the card: the portals, the stars, or the boxes next to the Pebble (for both push ideas). */
export function ideaHighlightFor(idea: LevelIdea, state: GameState): IdeaHighlight {
  if (idea === 'portal' || idea === 'portalPush') return { cells: [], portals: state.portals };
  if (idea === 'crystalColour') {
    const cells: Cell[] = [];
    state.tiles.forEach((tile, tileIndex) => {
      if (tile.goal) cells.push({ row: Math.floor(tileIndex / state.columnCount), column: tileIndex % state.columnCount });
    });
    return { cells, portals: [] };
  }
  const cells = DIRECTIONS.map((direction) => neighbour(state.player, direction)).filter(
    (cell) => inside(state, cell) && tileAt(state, cell).colour === state.player.colour,
  );
  return { cells, portals: [] };
}
