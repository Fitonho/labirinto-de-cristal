// Saved progress beyond the bests: resuming a board from its steps, unlocking
// levels and chapters, the board pictures on the levels screens, and the board
// fingerprints that guard saved bests against edited levels.
import { describe, expect, it } from 'vitest';
import { DIRECTIONS, move, type LevelData } from '../src/core';
import { chapters, levels } from '../src/levels/index';
import { chapterSummariesFor, levelMarkFor, levelToPlayIn, openLevelIdsFor, otherUnsolvedLevelOpen } from '../src/state/levelProgress';
import { replaySteps, resumeFromSaved, resumeToSave } from '../src/state/resume';
import { actions, createStore } from '../src/state/store';
import { boardPictureShapesFor, pictureTileSizeFor } from '../src/ui/boardPicture';
import fingerprintsByLevelId from './levelFingerprints.json';

const levelById = (levelId: string) => levels.find((level) => level.id === levelId)!;
const sampleCMoves = ['right', 'up', 'right', 'right', 'right', 'up', 'left', 'left', 'left', 'left'] as const;

describe('resuming a board', () => {
  it('keeps one step per entry in the undo history, through undo and restart', () => {
    const store = createStore('en', 1);
    store.dispatch(actions.selectLevel(levels.indexOf(levelById('sample-c'))));
    const game = () => store.getState().game;
    for (const direction of sampleCMoves.slice(0, 4)) store.dispatch(actions.move(direction));
    expect(game().steps).toBe('rurr');
    const blockedDirection = DIRECTIONS.find((direction) => move(game().history.present, direction).state === game().history.present)!;
    store.dispatch(actions.move(blockedDirection)); // nothing changes, so nothing is kept
    expect(game().steps).toBe('rurr');
    store.dispatch(actions.undo());
    expect(game().steps).toBe('rur');
    store.dispatch(actions.reset());
    expect(game().steps).toBe('rurx');
    expect(game().steps.length).toBe(game().history.pastStates.length);
    store.dispatch(actions.selectLevel(0));
    expect(game().steps).toBe('');
  });

  it('rebuilds the same board and undo history from the steps', () => {
    const store = createStore('en', 1);
    store.dispatch(actions.selectLevel(levels.indexOf(levelById('sample-c'))));
    for (const direction of sampleCMoves.slice(0, 6)) store.dispatch(actions.move(direction));
    store.dispatch(actions.reset());
    store.dispatch(actions.move('right'));
    const { history, steps, levelIndex, paletteId } = store.getState().game;

    const reopenedStore = createStore('en', 99);
    reopenedStore.dispatch(actions.resumed({ levelIndex, steps, paletteId }));
    const resumedGame = reopenedStore.getState().game;
    expect(resumedGame.history).toEqual(history);
    expect(resumedGame.steps).toBe(steps);
    expect(resumedGame.paletteId).toBe(paletteId);
    // Undo walks back through the restart to where the player was.
    reopenedStore.dispatch(actions.undo());
    reopenedStore.dispatch(actions.undo());
    expect(reopenedStore.getState().game.history.present.moveCount).toBe(6);
  });

  it('gives a fresh board when the steps no longer fit the level', () => {
    const sampleC = levelById('sample-c');
    expect(replaySteps(sampleC, 'ddd').steps).toBe('');
    expect(replaySteps(sampleC, 'r?').history.pastStates).toEqual([]);
    expect(replaySteps(sampleC, 'x').steps).toBe('');
  });

  it('saves and loads the resume entry, and ignores a broken one', () => {
    const resume = { levelId: 'sample-c', steps: 'rur', paletteId: 'moss' as const };
    expect(JSON.parse(resumeToSave(resume))).toEqual({ version: 1, ...resume });
    expect(resumeFromSaved(resumeToSave(resume))).toEqual(resume);
    expect(resumeFromSaved(JSON.stringify({ ...resume, paletteId: 'gone' }))).toEqual({ ...resume, paletteId: null });
    expect(resumeFromSaved('not json')).toBeNull();
    expect(resumeFromSaved(JSON.stringify({ levelId: 3 }))).toBeNull();
    expect(resumeFromSaved(null)).toBeNull();
  });
});

describe('unlocking', () => {
  // A small made-up game: two chapters, the always-open labyrinths, and the challenges that wait on the moving portals.
  const level = (id: string, chapter: string, order: number, par?: number): LevelData => ({
    version: 2,
    id,
    chapter,
    order,
    grid: ['b w W'],
    start: [0, 0],
    par,
  });
  const testLevels = [
    ...[1, 2, 3, 4, 5, 6].map((order) => level(`first-${order}`, 'first', order, 4)),
    ...[1, 2, 3].map((order) => level(`moving-portals-${order}`, 'moving-portals', order)),
    ...[1, 2].map((order) => level(`labyrinths-${order}`, 'labyrinths', order)),
    ...[1, 2].map((order) => level(`challenges-${order}`, 'challenges', order)),
  ];
  const testChapters = ['first', 'moving-portals', 'labyrinths', 'challenges'];

  it('marks a level solved, or at par when the best is at or under its par', () => {
    expect(levelMarkFor(testLevels[0], {})).toBeNull();
    expect(levelMarkFor(testLevels[0], { 'first-1': 4 })).toBe('atPar');
    expect(levelMarkFor(testLevels[0], { 'first-1': 5 })).toBe('solved');
    expect(levelMarkFor(testLevels[6], { 'moving-portals-1': 1 })).toBe('solved'); // no par, no star
  });

  it('opens two unsolved levels ahead in a chapter, and the labyrinths from the start', () => {
    const summaries = chapterSummariesFor(testChapters, testLevels, {});
    const openLevelIds = openLevelIdsFor(summaries, {}, 'first-1');
    expect([...openLevelIds].sort()).toEqual(['first-1', 'first-2', 'labyrinths-1', 'labyrinths-2']);
    const bests = { 'first-1': 4, 'first-3': 9 };
    const openAfterSolves = openLevelIdsFor(chapterSummariesFor(testChapters, testLevels, bests), bests, 'first-1');
    expect(['first-1', 'first-2', 'first-3', 'first-4'].every((levelId) => openAfterSolves.has(levelId))).toBe(true);
    expect(openAfterSolves.has('first-5')).toBe(false);
    // The level the player is on is always open.
    expect(openLevelIdsFor(summaries, {}, 'first-6').has('first-6')).toBe(true);
  });

  it('opens the next chapter once two thirds of the one before are solved', () => {
    const threeSolved = { 'first-1': 4, 'first-2': 5, 'first-3': 6 };
    const [first, movingPortals, labyrinths] = chapterSummariesFor(testChapters, testLevels, threeSolved);
    expect(first).toMatchObject({ open: true, solvedCount: 3, starCount: 1, parCount: 6 });
    expect(movingPortals).toMatchObject({ open: false, solvesToOpenCount: 1, previousChapter: 'first' });
    expect(labyrinths.open).toBe(true);
    const fourSolved = { ...threeSolved, 'first-6': 4 };
    expect(chapterSummariesFor(testChapters, testLevels, fourSolved)[1].open).toBe(true);
  });

  it('opens the challenges after the chapter they name, not the labyrinths before them', () => {
    const movingPortalsSolved = { 'first-1': 4, 'first-2': 4, 'first-3': 4, 'first-4': 4, 'moving-portals-1': 5, 'moving-portals-2': 5 };
    const challenges = chapterSummariesFor(testChapters, testLevels, movingPortalsSolved)[3];
    expect(challenges).toMatchObject({ open: true, previousChapter: 'moving-portals' });
    const firstOnly = { 'first-1': 4, 'first-2': 4, 'first-3': 4, 'first-4': 4 };
    expect(chapterSummariesFor(testChapters, testLevels, firstOnly)[3]).toMatchObject({ open: false, solvesToOpenCount: 2 });
  });

  it('plays the current level, else the first open unsolved one', () => {
    const bests = { 'first-1': 4 };
    const summaries = chapterSummariesFor(testChapters, testLevels, bests);
    const openLevelIds = openLevelIdsFor(summaries, bests, 'labyrinths-2');
    expect(levelToPlayIn(summaries[0], openLevelIds, bests, 'labyrinths-2')?.id).toBe('first-2');
    expect(levelToPlayIn(summaries[2], openLevelIds, bests, 'labyrinths-2')?.id).toBe('labyrinths-2');
  });

  it('opens only the first steps and the labyrinths on a first launch', () => {
    const summaries = chapterSummariesFor(chapters, levels, {});
    expect(summaries.filter((summary) => summary.open).map((summary) => summary.chapter)).toEqual(['first-steps', 'labyrinths']);
  });

  it('knows when a level other than the current one is open and unsolved', () => {
    expect(otherUnsolvedLevelOpen(chapters, levels, {}, 'sample-a')).toBe(true);
    // A made-up game of one chapter with one level: nowhere else to go.
    const onlyLevels = [level('only-1', 'only', 1)];
    expect(otherUnsolvedLevelOpen(['only'], onlyLevels, {}, 'only-1')).toBe(false);
  });
});

describe('board pictures', () => {
  it('fits a board in its box with whole tiles, never under 2 points', () => {
    expect(pictureTileSizeFor(levelById('sample-a'), 64, 40)).toBe(10); // 5 x 4
    expect(pictureTileSizeFor(levelById('draft-01'), 64, 40)).toBe(4); // 10 x 9
    expect(pictureTileSizeFor(levelById('draft-01'), 10, 10)).toBe(2);
  });

  it('draws every box in one path, every portal in another, and each crystal and the Pebble', () => {
    const shapes = boardPictureShapesFor(levelById('sample-b'), 10);
    expect(shapes.width).toBe(50);
    expect(shapes.height).toBe(50);
    expect(shapes.floorColour).not.toBe(shapes.boxColour);
    expect(shapes.boxesPath.match(/M/g)?.length).toBeGreaterThan(0);
    expect(shapes.portalsPath.match(/M/g)?.length).toBe(1);
    expect(shapes.crystals.length).toBe(1);
    expect(shapes.pebble).toEqual({ centreX: 5, centreY: 45, radius: 2.6 });
  });
});

/** FNV-1a over the board's grid, start and portals; the same function as in scripts/level-fingerprints.mjs. */
function fingerprintOf(levelData: LevelData): string {
  const boardText = JSON.stringify([levelData.grid, levelData.start, levelData.portals ?? []]);
  let hash = 0x811c9dc5;
  for (let characterIndex = 0; characterIndex < boardText.length; characterIndex++) {
    hash ^= boardText.charCodeAt(characterIndex);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

describe('level fingerprints', () => {
  it('match every board, so saved bests never belong to a board that changed', () => {
    const changedLevelIds = levels
      .filter((levelData) => (fingerprintsByLevelId as Record<string, string>)[levelData.id] !== fingerprintOf(levelData))
      .map((levelData) => levelData.id);
    // A changed board keeps the saved bests of its id. Give it a new id, or, if the old bests still hold on it,
    // run `node scripts/level-fingerprints.mjs` and commit the new fingerprints.
    expect(changedLevelIds).toEqual([]);
  });
});
