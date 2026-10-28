// Player-facing text in Portuguese and English.
export type Language = 'pt' | 'en';

const strings = {
  pt: {
    title: 'Labirinto de Cristal',
    level: 'Nível',
    undo: 'Desfazer',
    reset: 'Recomeçar',
    moves: 'Movimentos',
    par: 'meta',
    won: 'Nível completo!',
    help: 'Setas ou WASD para mover, deslize no celular. Z desfaz, R recomeça.',
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
    help: 'Arrows or WASD to move, swipe on a phone. Z undoes, R restarts.',
    language: 'Português',
    'chapter.drafts': 'Drafts',
    'chapter.samples': 'Samples',
  },
} as const;

export type StringKey = keyof (typeof strings)['pt'];

export function t(language: Language, key: StringKey): string {
  return strings[language][key];
}

export function defaultLanguage(): Language {
  try {
    return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
  } catch {
    return 'pt';
  }
}
