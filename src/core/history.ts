// Undo and reset, kept as a list of past states.
import type { GameState } from './types';

export interface History {
  past: GameState[]; // oldest first; past[0] is the level's start
  present: GameState;
}

export function startHistory(state: GameState): History {
  return { past: [], present: state };
}

/** Records a new state. A move that changed nothing is not recorded. */
export function record(h: History, next: GameState): History {
  if (next === h.present) return h;
  return { past: [...h.past, h.present], present: next };
}

export function undo(h: History): History {
  if (h.past.length === 0) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1] };
}

export function reset(h: History): History {
  if (h.past.length === 0) return h;
  return { past: [], present: h.past[0] };
}
