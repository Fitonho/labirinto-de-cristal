// Player-facing text in Portuguese and English.
import type { Language } from '../state/store';

const strings = {
  pt: {
    title: 'Labirinto de Cristal',
    level: 'Nível',
    undo: 'Desfazer',
    reset: 'Recomeçar',
    moves: 'Movimentos',
    par: 'meta',
    won: 'Nível completo!',
    help: 'Setas ou WASD para mover, deslize no celular. Z desfaz, R recomeça. M liga e desliga o som, V a vibração.',
    chooseLevel: 'Escolha um nível',
    close: 'Fechar',
    language: 'English',
    'chapter.drafts': 'Rascunhos',
    'chapter.samples': 'Exemplos',
  },
  en: {
    title: 'Crystal Labyrinth',
    level: 'Level',
    undo: 'Undo',
    reset: 'Restart',
    moves: 'Moves',
    par: 'par',
    won: 'Level complete!',
    help: 'Arrows or WASD to move, swipe on a phone. Z undoes, R restarts. M turns sound on and off, V vibration.',
    chooseLevel: 'Choose a level',
    close: 'Close',
    language: 'Português',
    'chapter.drafts': 'Drafts',
    'chapter.samples': 'Samples',
  },
} as const;

export type StringKey = keyof (typeof strings)['pt'];

export function t(language: Language, key: StringKey): string {
  return strings[language][key];
}

/** Portuguese for any Portuguese locale tag (pt, pt-BR, pt-PT), English otherwise. */
export function languageForLocale(localeTag: string | undefined): Language {
  if (!localeTag) return 'pt';
  return localeTag.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}
