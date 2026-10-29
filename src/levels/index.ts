// All playable levels, in menu order. Each chapter is a JSON file, except the
// labyrinths, which are the big drafts worth keeping.
import type { LevelData } from '../core';
import challenges from './challenges.json';
import crystals from './crystals.json';
import drafts from './drafts.json';
import firstSteps from './first-steps.json';
import movingPortals from './moving-portals.json';
import portals from './portals.json';

// Each chapter teaches one idea with an easy level, then makes it harder.
// The challenges are an optional extra; they open after the moving portals.
export const chapters = ['first-steps', 'portals', 'crystals', 'moving-portals', 'labyrinths', 'challenges'] as const;
export type ChapterId = (typeof chapters)[number];

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

export const levels: LevelData[] = [...firstSteps, ...portals, ...crystals, ...movingPortals, ...labyrinths, ...challenges] as LevelData[];
