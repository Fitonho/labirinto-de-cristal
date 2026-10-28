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

export function reset(history: History): History {
  if (history.pastStates.length === 0) return history;
  return { pastStates: [], present: history.pastStates[0] };
}
