// All playable levels, in menu order. Each chapter is a JSON file, except the
// labyrinths, which are the big drafts worth keeping, and the Lab, the level
// generator's boards (lab.ts).
import type { LevelData } from '../core';
import challenges from './challenges.json';
import crystals from './crystals.json';
import drafts from './drafts.json';
import firstSteps from './first-steps.json';
import lab from './lab.json';
import { LAB_CHAPTER, levelFromLink, type LabLevel } from './lab';
import movingPortals from './moving-portals.json';
import portals from './portals.json';

// Each chapter teaches one idea with an easy level, then makes it harder.
// The challenges are an optional extra; they open after the moving portals.
const playerChapters = ['first-steps', 'portals', 'crystals', 'moving-portals', 'labyrinths', 'challenges'];

// drafts.json stays whole, because tests/compare.test.ts checks every original
// board against the old game. These are the ones that play differently from
// their near-twins, in the order they get harder. 11, 13 and 14 have never been
// solved: they stay at the end until someone has.
const labyrinthDraftIds = ['draft-01', 'draft-03', 'draft-05', 'draft-08', 'draft-09', 'draft-11', 'draft-13', 'draft-14'];
const labyrinths: LevelData[] = labyrinthDraftIds.map((draftId, draftIndex) => ({
  ...(drafts as LevelData[]).find((draft) => draft.id === draftId)!,
  chapter: 'labyrinths',
  order: draftIndex + 1,
}));

// The page address only exists on the web; on a phone and in tests there is none.
const pageSearch = typeof window !== 'undefined' && window.location ? window.location.search : '';
/** The board opened from the page address (?board=...), if any. */
export const linkedLevel = levelFromLink(pageSearch);
/** Whether the Lab is a chapter. On everywhere for now, the live site included; false hides it, apart from a linked board. */
const LAB_SHOWN = true;
const savedLabLevels = lab as LabLevel[];
// The linked board goes last in the Lab, numbered after the saved ones.
const labLevels: LabLevel[] = [...(LAB_SHOWN ? savedLabLevels : []), ...(linkedLevel ? [{ ...linkedLevel, order: savedLabLevels.length + 1 }] : [])];

export const chapters: readonly string[] = labLevels.length ? [...playerChapters, LAB_CHAPTER] : playerChapters;

/** Each Lab level's shortest solution, for the Solve button. */
export const labSolutionsByLevelId: Record<string, string> = Object.fromEntries(labLevels.map((labLevel) => [labLevel.id, labLevel.solution]));

export const levels: LevelData[] = [
  ...firstSteps,
  ...portals,
  ...crystals,
  ...movingPortals,
  ...labyrinths,
  ...challenges,
  ...labLevels.map(({ solution, ...level }) => level),
] as LevelData[];

/** Every level but the Lab's: what players' totals and the level tests cover. */
export const playerLevels = levels.filter((level) => level.chapter !== LAB_CHAPTER);
