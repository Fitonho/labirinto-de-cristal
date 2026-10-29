// What the levels screens show for each level and chapter: solved or at par,
// open or locked, and the counts. All of it is worked out from the saved bests,
// so none of it is saved, and the rules here can change without touching
// anyone's progress.
import type { LevelData } from '../core';

/** Unsolved levels a player can try ahead of their last solve, in each chapter. */
export const OPEN_AHEAD_COUNT = 2;
/** The share of a chapter to solve before the next chapter opens. */
export const CHAPTER_OPEN_SHARE = 2 / 3;
/** Chapters open from the start, whatever was solved. The drafts are untested, so nothing should wait on them. */
export const ALWAYS_OPEN_CHAPTERS: readonly string[] = ['drafts'];

export type LevelMark = 'atPar' | 'solved' | null;

export function levelMarkFor(level: LevelData, bestMovesByLevelId: Record<string, number>): LevelMark {
  const bestMoves = bestMovesByLevelId[level.id];
  if (bestMoves === undefined) return null;
  return level.par !== undefined && bestMoves <= level.par ? 'atPar' : 'solved';
}

export interface ChapterSummary {
  chapter: string;
  levels: LevelData[];
  solvedCount: number;
  /** Levels solved at par or better. */
  starCount: number;
  /** Levels that have a par, so the most stars the chapter can give. */
  parCount: number;
  open: boolean;
  /** For a locked chapter, how many more levels of the chapter before it open it. */
  solvesToOpenCount: number;
  /** The chapter before, which a locked chapter waits on. */
  previousChapter: string | null;
}

function solvesNeededToOpenNext(summary: Pick<ChapterSummary, 'levels' | 'solvedCount'>): number {
  return Math.max(0, Math.ceil(summary.levels.length * CHAPTER_OPEN_SHARE) - summary.solvedCount);
}

export function chapterSummariesFor(
  chapters: readonly string[],
  levels: LevelData[],
  bestMovesByLevelId: Record<string, number>,
): ChapterSummary[] {
  const summaries: ChapterSummary[] = [];
  for (const chapter of chapters) {
    const chapterLevels = levels.filter((level) => level.chapter === chapter);
    const marks = chapterLevels.map((level) => levelMarkFor(level, bestMovesByLevelId));
    const previousSummary = summaries[summaries.length - 1] ?? null;
    const solvesToOpenCount = previousSummary ? solvesNeededToOpenNext(previousSummary) : 0;
    summaries.push({
      chapter,
      levels: chapterLevels,
      solvedCount: marks.filter((mark) => mark !== null).length,
      starCount: marks.filter((mark) => mark === 'atPar').length,
      parCount: chapterLevels.filter((level) => level.par !== undefined).length,
      open: ALWAYS_OPEN_CHAPTERS.includes(chapter) || !previousSummary || (previousSummary.open && solvesToOpenCount === 0),
      solvesToOpenCount,
      previousChapter: previousSummary?.chapter ?? null,
    });
  }
  return summaries;
}

/**
 * The ids of the levels a player can open: every level of an always-open
 * chapter; in other open chapters the solved levels and the first few
 * unsolved ones; and always the level they are on.
 */
export function openLevelIdsFor(summaries: ChapterSummary[], bestMovesByLevelId: Record<string, number>, currentLevelId: string): Set<string> {
  const openLevelIds = new Set<string>([currentLevelId]);
  for (const summary of summaries) {
    if (!summary.open) continue;
    const allOpen = ALWAYS_OPEN_CHAPTERS.includes(summary.chapter);
    let unsolvedSeenCount = 0;
    for (const level of summary.levels) {
      const solved = bestMovesByLevelId[level.id] !== undefined;
      if (allOpen || solved || unsolvedSeenCount < OPEN_AHEAD_COUNT) openLevelIds.add(level.id);
      if (!solved) unsolvedSeenCount += 1;
    }
  }
  return openLevelIds;
}

/** The level the chapter's Play button opens: the one the player is on if it's here, else the first open unsolved one. */
export function levelToPlayIn(summary: ChapterSummary, openLevelIds: Set<string>, bestMovesByLevelId: Record<string, number>, currentLevelId: string): LevelData | null {
  return (
    summary.levels.find((level) => level.id === currentLevelId) ??
    summary.levels.find((level) => openLevelIds.has(level.id) && bestMovesByLevelId[level.id] === undefined) ??
    null
  );
}
