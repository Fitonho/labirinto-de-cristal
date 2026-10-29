// Resuming the board the player left. The game slice keeps every step that
// built its undo history, one letter each: a move's direction, or a restart.
// Saving the level id and those letters is enough to rebuild the board and its
// undo history by replaying them through the engine, so nothing large is saved.
import { loadLevel, move as engineMove, record, reset as resetHistory, startHistory, type Direction, type History, type LevelData } from '../core';
import { isPaletteChoice, type PaletteId } from './palettes';

export const STEP_LETTER_BY_DIRECTION: Record<Direction, string> = { up: 'u', right: 'r', down: 'd', left: 'l' };
export const RESTART_STEP_LETTER = 'x';
const DIRECTION_BY_STEP_LETTER: Record<string, Direction> = { u: 'up', r: 'right', d: 'down', l: 'left' };

export const RESUME_VERSION = 1;

export interface SavedResume {
  levelId: string;
  /** One letter per step of the undo history, oldest first. */
  steps: string;
  paletteId: PaletteId | null;
}

export function resumeToSave(resume: SavedResume): string {
  return JSON.stringify({ version: RESUME_VERSION, ...resume });
}

/** The saved board, or null when there is none or the file can't be read. */
export function resumeFromSaved(savedText: string | null): SavedResume | null {
  let saved: unknown = null;
  try {
    saved = savedText ? JSON.parse(savedText) : null;
  } catch {
    return null;
  }
  if (!saved || typeof saved !== 'object') return null;
  const { levelId, steps, paletteId } = saved as Record<string, unknown>;
  if (typeof levelId !== 'string' || typeof steps !== 'string') return null;
  const savedPaletteId = isPaletteChoice(paletteId) && paletteId !== 'random' ? paletteId : null;
  return { levelId, steps, paletteId: savedPaletteId };
}

/**
 * Rebuilds a level's undo history from its steps. Every saved step changed the
 * board when it was played, so a step that changes nothing, or an unknown
 * letter, means the level was edited since: the player gets a fresh board.
 */
export function replaySteps(levelData: LevelData, steps: string): { history: History; steps: string } {
  const startState = loadLevel(levelData);
  let history = startHistory(startState);
  for (const stepLetter of steps) {
    const direction = DIRECTION_BY_STEP_LETTER[stepLetter];
    let nextHistory: History;
    if (direction) nextHistory = record(history, engineMove(history.present, direction).state);
    else if (stepLetter === RESTART_STEP_LETTER) nextHistory = resetHistory(history);
    else return { history: startHistory(startState), steps: '' };
    if (nextHistory === history) return { history: startHistory(startState), steps: '' };
    history = nextHistory;
  }
  return { history, steps };
}
