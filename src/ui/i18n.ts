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
    help: 'Setas ou WASD para mover. Z desfaz, R recomeça. M liga e desliga o som, V a vibração.',
    sound: 'Som',
    vibration: 'Vibração',
    tapMoves: 'Tocar para mover',
    touchArea: 'Área de toque: deslize, ou toque num lado para mover para lá',
    hintSwipe: 'Deslize para mover',
    hintTapOrSwipe: 'Toque num lado ou deslize',
    languageShort: 'EN',
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
    help: 'Arrows or WASD to move. Z undoes, R restarts. M turns sound on and off, V vibration.',
    sound: 'Sound',
    vibration: 'Vibration',
    tapMoves: 'Tap to move',
    touchArea: 'Touch area: swipe, or tap a side to move that way',
    hintSwipe: 'Swipe to move',
    hintTapOrSwipe: 'Tap a side or swipe',
    languageShort: 'PT',
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
