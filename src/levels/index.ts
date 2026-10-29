// All playable levels, in menu order. Each chapter is a JSON file.
import type { LevelData } from '../core';
import drafts from './drafts.json';
import samples from './samples.json';

// The samples come first: they are small, tested, and teach the rules.
export const chapters = ['samples', 'drafts'] as const;
export type ChapterId = (typeof chapters)[number];

export const levels: LevelData[] = [...samples, ...drafts] as LevelData[];
