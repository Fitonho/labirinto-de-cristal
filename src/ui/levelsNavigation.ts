// How home, the game and the two levels screens link up. The screens stack the
// way the level flow plan draws them: home, then the chapters, then a
// chapter's levels, then the game. Every back arrow goes up one step: the
// game's to its chapter's levels, theirs to the chapters, the chapters' to
// home. Home is drawn over the game screen, which stays mounted under them
// all, so Continue only has to slide home away.
import type { Dispatch } from '@reduxjs/toolkit';
import { router } from 'expo-router';
import { sessionActions } from '../state/session';

/** From the game: up to the levels of the chapter being played. */
export function openChapterFromGame(chapter: string) {
  router.push({ pathname: '/chapter/[chapterId]', params: { chapterId: chapter } });
}

/** From home, or from the result card at the end of a chapter: the chapters. */
export function openChapters() {
  router.push('/levels');
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

/** From the chapters: up to home, which is ready behind them as they slide away. */
export function backToHome(dispatch: Dispatch) {
  dispatch(sessionActions.openHome());
  router.dismissTo('/');
}

/** Straight down to the game, past home, or to a fresh game when a levels page was opened at its address directly. */
export function backToGame(dispatch: Dispatch) {
  dispatch(sessionActions.closeHome({ animated: false }));
  router.dismissTo('/');
}
