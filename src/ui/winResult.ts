// Pure helper for the result card: how a win compares with the level's par and
// with the player's best. No React here, so Vitest tests it.

/** On par, under it (better), over it, or null when the level has no par. */
export type ParBadge = 'onPar' | 'underPar' | 'overPar' | null;

export interface WinResult {
  moveCount: number;
  par: number | null;
  parBadge: ParBadge;
  /** How many moves over par, for the over-par badge; 0 otherwise. */
  movesOverPar: number;
  /** The best before this win, shown when this win didn't beat it. Null on a first win or a new best. */
  standingBestMoves: number | null;
  /** Beat an earlier best. A first win isn't a new best: there was nothing to beat. */
  isNewBest: boolean;
}

export function winResultFor(moveCount: number, par: number | undefined, previousBestMoves: number | null): WinResult {
  const levelPar = par ?? null;
  let parBadge: ParBadge = null;
  if (levelPar !== null) parBadge = moveCount < levelPar ? 'underPar' : moveCount === levelPar ? 'onPar' : 'overPar';
  const isNewBest = previousBestMoves !== null && moveCount < previousBestMoves;
  return {
    moveCount,
    par: levelPar,
    parBadge,
    movesOverPar: levelPar !== null && moveCount > levelPar ? moveCount - levelPar : 0,
    standingBestMoves: previousBestMoves !== null && !isNewBest ? previousBestMoves : null,
    isNewBest,
  };
}

/** Whether the win earns the par chime and tick: on or under par. */
export function reachedPar(parBadge: ParBadge): boolean {
  return parBadge === 'onPar' || parBadge === 'underPar';
}
