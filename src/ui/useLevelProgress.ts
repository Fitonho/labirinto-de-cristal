// What both levels screens read: the chapters with their counts, which levels
// are open, and the colours of the level the player came from, so going in
// and out of the levels never changes colour.
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { chapters, levels } from '../levels/index';
import { chapterSummariesFor, openLevelIdsFor } from '../state/levelProgress';
import { selectPaletteId, type RootState } from '../state/store';
import { appColoursFor, boardPalettes } from './theme';

export function useLevelProgress() {
  const { language, levelIndex } = useSelector((rootState: RootState) => rootState.game);
  const bestMovesByLevelId = useSelector((rootState: RootState) => rootState.progress.bestMovesByLevelId);
  const palette = boardPalettes[useSelector(selectPaletteId)];
  const appColours = useMemo(() => appColoursFor(palette), [palette]);
  const currentLevelId = levels[levelIndex].id;
  const summaries = useMemo(() => chapterSummariesFor(chapters, levels, bestMovesByLevelId), [bestMovesByLevelId]);
  const openLevelIds = useMemo(
    () => openLevelIdsFor(summaries, bestMovesByLevelId, currentLevelId),
    [summaries, bestMovesByLevelId, currentLevelId],
  );
  return { language, levelIndex, currentLevelId, bestMovesByLevelId, palette, appColours, summaries, openLevelIds };
}
