// Undo and reset, kept as a list of past states.
import type { GameState } from './types';

export interface History {
  pastStates: GameState[]; // oldest first; pastStates[0] is the level's start
  present: GameState;
}

export function startHistory(state: GameState): History {
  return { pastStates: [], present: state };
}

/** Records a new state. A move that changed nothing is not recorded. */
export function record(history: History, nextState: GameState): History {
  if (nextState === history.present) return history;
  return { pastStates: [...history.pastStates, history.present], present: nextState };
}

export function undo(history: History): History {
  if (history.pastStates.length === 0) return history;
  return { pastStates: history.pastStates.slice(0, -1), present: history.pastStates[history.pastStates.length - 1] };
}

/**
 * Goes back to the level's start but keeps the way there, so an Undo right
 * after a restart brings back the position the player left.
 */
export function reset(history: History): History {
  const startState = history.pastStates[0];
  // Only the start has no moves. Comparing counts instead of objects also works on Redux's draft copies.
  if (!startState || history.present.moveCount === 0) return history;
  return { pastStates: [...history.pastStates, history.present], present: startState };
}
