// How the game and the two levels screens link up. The screens stack the way
// the level flow plan draws them: chapters, then a chapter's levels, then the
// game. The game's back arrow goes up one step, to its chapter's levels; their
// back arrow goes up to the chapters; the chapters' back arrow returns to the
// game until a home screen exists. The game stays mounted under them all.
import { router } from 'expo-router';

/** From the game: up to the levels of the chapter being played. */
export function openChapterFromGame(chapter: string) {
  router.push({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter } });
}

/** From the chapters: into one chapter's levels. */
export function openChapterFromChapters(chapter: string) {
  router.push({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter, from: 'chapters' } });
}

/** From a chapter's levels: up to the chapters, which are under it only if it was opened from them. */
export function backToChapters(openedFromChapters: boolean) {
  if (openedFromChapters && router.canGoBack()) router.back();
  else router.replace('/levels');
}

/** Back down to the game, or to a fresh game when a levels page was opened at its address directly. */
export function backToGame() {
  router.dismissTo('/');
}
