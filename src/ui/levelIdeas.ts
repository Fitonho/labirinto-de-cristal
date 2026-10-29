// The levels that bring in a new idea, and how the new-idea card shows it: its
// timeline, and what lights up on the real board once the card closes. Only
// these levels get a card. No React here, so Vitest tests it.
import { DIRECTIONS, move, type Cell, type GameState, type Portal } from '../core';

export type LevelIdea = 'push' | 'portal' | 'bridge' | 'crystalColour' | 'portalPush';

export const ideaByLevelId: Record<string, LevelIdea> = {
  'sample-a': 'push',
  'sample-b': 'portal',
  'sample-c': 'bridge',
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

/** What glows on the board after the card: the portals (the bridge's too, so the glow doesn't point at the answer), the stars, or the boxes the Pebble can push. */
export function ideaHighlightFor(idea: LevelIdea, state: GameState): IdeaHighlight {
  if (idea === 'portal' || idea === 'bridge' || idea === 'portalPush') return { cells: [], portals: state.portals };
  if (idea === 'crystalColour') {
    const cells: Cell[] = [];
    state.tiles.forEach((tile, tileIndex) => {
      if (tile.goal) cells.push({ row: Math.floor(tileIndex / state.columnCount), column: tileIndex % state.columnCount });
    });
    return { cells, portals: [] };
  }
  return { cells: pushableBoxes(state), portals: [] };
}

/**
 * The boxes the Pebble can push from where it can walk now, found with the
 * engine itself: a box against the edge or another box is a wall, and doesn't
 * glow. The walk stops at anything but a plain step, so it stays on this floor.
 */
export function pushableBoxes(state: GameState): Cell[] {
  const boxes: Cell[] = [];
  const seenCellKeys = new Set([`${state.player.row},${state.player.column}`]);
  const walkStates = [state];
  for (const walkState of walkStates) {
    for (const direction of DIRECTIONS) {
      const { state: nextState, events } = move(walkState, direction);
      const push = events.find((event) => event.type === 'pushed');
      if (push && push.type === 'pushed') {
        if (!boxes.some((box) => box.row === push.from.row && box.column === push.from.column)) boxes.push(push.from);
        continue;
      }
      if (events.length !== 1 || events[0].type !== 'moved') continue;
      const cellKey = `${nextState.player.row},${nextState.player.column}`;
      if (seenCellKeys.has(cellKey)) continue;
      seenCellKeys.add(cellKey);
      walkStates.push(nextState);
    }
  }
  return boxes;
}
