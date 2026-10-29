// The levels that bring in a new idea, and how the new-idea card shows it: its
// timeline, and what lights up on the real board once the card closes. Only
// these levels get a card, and each one says what glows, so nothing has to
// be worked out from the board. No React here, so Vitest tests it.
import type { Cell, GameState, Portal } from '../core';
import { RESTART_STEP_LETTER } from '../state/resume';

export type LevelIdea = 'push' | 'oneBox' | 'undo' | 'portal' | 'bridge' | 'crystalColour' | 'allStars' | 'skip' | 'portalPush';

/** Ideas that are advice, not a rule of the board: their card says Tip instead of New and has no scene. */
export const ADVICE_IDEAS: readonly LevelIdea[] = ['skip'];

/** What lights up on the board after the card: every portal, every star, or the cells listed. */
export type IdeaGlowTarget = 'portals' | 'stars' | Cell[];

export interface IdeaCard {
  idea: LevelIdea;
  glow: IdeaGlowTarget;
}

export const ideaCardsByLevelId: Record<string, IdeaCard> = {
  // The one box that can move, two steps right of the Pebble; the ones beside it are walls.
  'sample-a': { idea: 'push', glow: [{ row: 2, column: 2 }] },
  // The two boxes in a row straight ahead.
  'one-at-a-time': { idea: 'oneBox', glow: [{ row: 1, column: 2 }, { row: 1, column: 3 }] },
  // The box straight ahead: pushing it is the dead end.
  'dead-end': { idea: 'undo', glow: [{ row: 1, column: 2 }] },
  'sample-b': { idea: 'portal', glow: 'portals' },
  // The portal, not the line of boxes, so the glow doesn't give the bridge away.
  'sample-c': { idea: 'bridge', glow: 'portals' },
  'star-colour': { idea: 'crystalColour', glow: 'stars' },
  // Pushing the star gets no card on purpose: its name is the only hint.
  'two-stars': { idea: 'allStars', glow: 'stars' },
  'sample-e': { idea: 'portalPush', glow: 'portals' },
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
  return levelId in ideaCardsByLevelId && bestMovesByLevelId[levelId] === undefined && steps === '';
}

/** Restarts of one unsolved level before the stuck tip opens. */
export const STUCK_RESTART_COUNT = 3;

/**
 * Whether the stuck tip opens on this board: the player restarted it
 * STUCK_RESTART_COUNT times without solving it, has never seen the tip, and
 * has another level open to go to. It is the 'skip' idea's card, on any level.
 */
/** `otherLevelOpen` is asked last, so the rest of the time no move works out the open levels. */
export function opensStuckTip(steps: string, solved: boolean, stuckTipSeen: boolean, otherLevelOpen: () => boolean): boolean {
  const restartCount = [...steps].filter((stepLetter) => stepLetter === RESTART_STEP_LETTER).length;
  return restartCount >= STUCK_RESTART_COUNT && !solved && !stuckTipSeen && otherLevelOpen();
}

export interface IdeaHighlight {
  cells: Cell[];
  portals: Portal[];
}

/** The portals or cells to light for a glow target on the board as it stands. */
export function ideaHighlightFor(glow: IdeaGlowTarget, state: GameState): IdeaHighlight {
  if (glow === 'portals') return { cells: [], portals: state.portals };
  if (glow === 'stars') {
    const cells: Cell[] = [];
    state.tiles.forEach((tile, tileIndex) => {
      if (tile.goal) cells.push({ row: Math.floor(tileIndex / state.columnCount), column: tileIndex % state.columnCount });
    });
    return { cells, portals: [] };
  }
  return { cells: glow, portals: [] };
}
