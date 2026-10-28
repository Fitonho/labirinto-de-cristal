// All playable levels, in menu order. Each chapter is a JSON file.
import type { LevelData } from '../core';
import drafts from './drafts.json';
import samples from './samples.json';

export const chapters = ['drafts', 'samples'] as const;
export type ChapterId = (typeof chapters)[number];

export const levels: LevelData[] = [...drafts, ...samples] as LevelData[];
