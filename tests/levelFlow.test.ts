// The flow around the levels: who starts on home, opening and closing home,
// the levels that open with a new-idea card and what glows after it, level
// names in both languages, the picture of a board as it stands, and the keys.
import { describe, expect, it } from 'vitest';
import { move } from '../src/core';
import { levels, playerLevels } from '../src/levels/index';
import { isReturningPlayer, sessionActions } from '../src/state/session';
import { createStore } from '../src/state/store';
import { boardPictureShapesForState } from '../src/ui/boardPicture';
import { commandsByKey } from '../src/ui/commands';
import { levelNameFor, t } from '../src/ui/i18n';
import { ideaCardsByLevelId, ideaHighlightFor, IDEA_CARD_FILL_START, IDEA_CARD_HOLD, opensIdeaCard, opensStuckTip } from '../src/ui/levelIdeas';
import { customLevelState } from './helpers';

const noProgress = { bestMovesByLevelId: {}, currentLevelId: null };

describe('home and first launch', () => {
  it('sends a brand-new player straight into the first level', () => {
    expect(isReturningPlayer(noProgress, null, 'sample-a')).toBe(false);
    expect(isReturningPlayer({ ...noProgress, currentLevelId: 'sample-a' }, { levelId: 'sample-a', steps: '', paletteId: null }, 'sample-a')).toBe(false);
  });

  it('starts anyone with something saved on home', () => {
    expect(isReturningPlayer({ ...noProgress, bestMovesByLevelId: { 'sample-a': 4 } }, null, 'sample-a')).toBe(true);
    expect(isReturningPlayer(noProgress, { levelId: 'sample-a', steps: 'u', paletteId: null }, 'sample-a')).toBe(true);
    expect(isReturningPlayer({ ...noProgress, currentLevelId: 'sample-c' }, null, 'sample-a')).toBe(true);
  });

  it('shows nothing until the saved progress is read, then home only for a returning player', () => {
    const store = createStore('pt', 1);
    expect(store.getState().session).toMatchObject({ savedLoaded: false, homeOpen: false });
    store.dispatch(sessionActions.savedLoaded({ returning: true }));
    expect(store.getState().session).toMatchObject({ savedLoaded: true, homeOpen: true });
  });

  it('slides home away on Continue, and drops it at once when a level is picked under the levels screens', () => {
    const store = createStore('pt', 1);
    store.dispatch(sessionActions.savedLoaded({ returning: true }));
    store.dispatch(sessionActions.closeHome({ animated: true }));
    expect(store.getState().session).toMatchObject({ homeOpen: false, homeExit: 'slide' });
    store.dispatch(sessionActions.openHome());
    store.dispatch(sessionActions.closeHome({ animated: false }));
    expect(store.getState().session).toMatchObject({ homeOpen: false, homeExit: 'instant' });
  });
});

describe('new-idea card', () => {
  it('opens on a level with an idea until it is solved, and only on a fresh board', () => {
    expect(opensIdeaCard('sample-b', {}, '')).toBe(true);
    expect(opensIdeaCard('sample-b', { 'sample-b': 9 }, '')).toBe(false);
    expect(opensIdeaCard('sample-b', {}, 'ur')).toBe(false);
    expect(opensIdeaCard('draft-01', {}, '')).toBe(false);
  });

  it('only covers levels that exist, and every idea has a tip in both languages', () => {
    for (const [levelId, { idea, glow }] of Object.entries(ideaCardsByLevelId)) {
      const level = levels.find((candidateLevel) => candidateLevel.id === levelId);
      expect(level).toBeDefined();
      // Listed glow cells are on the board, so a reshaped level can't light thin air.
      if (Array.isArray(glow)) {
        for (const cell of glow) expect(level!.grid[cell.row]?.split(' ')[cell.column]).toBeDefined();
      }
      expect(t('pt', `idea.${idea}`)).not.toBe(t('en', `idea.${idea}`));
    }
  });

  it('opens the stuck tip on the third restart of an unsolved level, once ever, with somewhere else to go', () => {
    const anotherLevel = () => true;
    expect(opensStuckTip('urxlxd', false, false, anotherLevel)).toBe(false);
    expect(opensStuckTip('urxlxdx', false, false, anotherLevel)).toBe(true);
    expect(opensStuckTip('urxlxdx', true, false, anotherLevel)).toBe(false);
    expect(opensStuckTip('urxlxdx', false, true, anotherLevel)).toBe(false);
    expect(opensStuckTip('urxlxdx', false, false, () => false)).toBe(false);
    expect(t('pt', 'idea.skip')).not.toBe(t('en', 'idea.skip'));
  });

  it('brings in the ideas in the order the chapters teach them', () => {
    const ideas = levels.filter((level) => level.id in ideaCardsByLevelId).map((level) => ideaCardsByLevelId[level.id].idea);
    expect(ideas).toEqual(['push', 'oneBox', 'undo', 'portal', 'bridge', 'crystalColour', 'allStars', 'portalPush']);
  });

  it('fills Play before it can be pressed', () => {
    expect(IDEA_CARD_FILL_START).toBeLessThan(IDEA_CARD_HOLD);
  });

  it('lights up the portals, the stars, or the cells a level lists', () => {
    const portalLevel = customLevelState(['b w B'], [0, 0], [[0, 0, 'right']]);
    expect(ideaHighlightFor('portals', portalLevel)).toEqual({ cells: [], portals: portalLevel.portals });
    const starLevel = customLevelState(['b b B'], [0, 0]);
    expect(ideaHighlightFor('stars', starLevel).cells).toEqual([{ row: 0, column: 2 }]);
    expect(ideaHighlightFor([{ row: 0, column: 1 }], starLevel)).toEqual({ cells: [{ row: 0, column: 1 }], portals: [] });
  });
});

describe('level names', () => {
  it('names every level in Portuguese and English', () => {
    for (const level of playerLevels) {
      const fallback = `${t('pt', 'level')} ${level.order}`;
      expect(levelNameFor('pt', level.id, level.order)).not.toBe(fallback);
      expect(levelNameFor('en', level.id, level.order)).not.toBe(`${t('en', 'level')} ${level.order}`);
    }
  });

  it('names a generated Lab level by its id', () => {
    expect(levelNameFor('en', 'lab-portals-5x5-42-3', 1)).toBe('portals-5x5-42-3');
  });

  it('falls back to the level number for a level without a name', () => {
    expect(levelNameFor('en', 'not-a-level', 7)).toBe('Level 7');
  });
});

describe('board picture as it stands', () => {
  it('draws the Pebble where it is now and leaves collected stars out', () => {
    const start = customLevelState(['b b B'], [0, 0]);
    const moved = move(start, 'right').state;
    expect(boardPictureShapesForState(moved, 10).pebble.centreX).toBe(15);
    expect(boardPictureShapesForState(moved, 10).crystals.length).toBe(1);
    const won = move(moved, 'right').state;
    expect(won.status).toBe('won');
    expect(boardPictureShapesForState(won, 10).crystals.length).toBe(0);
  });
});

describe('keys', () => {
  it('goes up a screen with Escape', () => {
    expect(commandsByKey.escape).toEqual({ type: 'back' });
  });
});
