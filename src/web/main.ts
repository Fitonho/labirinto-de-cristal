// Web entry point: wires the store to the page.
import { levels, chapters } from '../levels/index';
import { languageForLocale, t, type StringKey } from '../ui/i18n';
import { listenToKeys, listenToSwipes, type Command } from './input';
import { logger, logging } from '../state/logger';
import { renderBoard } from './render';
import { actions, createStore } from '../state/store';

if (new URLSearchParams(location.search).has('debug')) logging.enabled = true;
const store = createStore(languageForLocale(navigator.language));
const elementById = <ElementType extends HTMLElement>(id: string) => document.getElementById(id) as ElementType;

const boardElement = elementById('board');
const levelSelect = elementById<HTMLSelectElement>('level-select');
const statusElement = elementById('status');

function run(command: Command) {
  if (command.type === 'move') store.dispatch(actions.move(command.direction));
  if (command.type === 'undo') store.dispatch(actions.undo());
  if (command.type === 'reset') store.dispatch(actions.reset());
}

listenToKeys(run);
listenToSwipes(boardElement, run);
elementById('undo').addEventListener('click', () => run({ type: 'undo' }));
elementById('reset').addEventListener('click', () => run({ type: 'reset' }));
elementById('language').addEventListener('click', () => {
  store.dispatch(actions.setLanguage(store.getState().game.language === 'pt' ? 'en' : 'pt'));
});
levelSelect.addEventListener('change', () => {
  store.dispatch(actions.selectLevel(Number(levelSelect.value)));
  levelSelect.blur();
});

function fillLevelSelect() {
  const { language, levelIndex } = store.getState().game;
  levelSelect.replaceChildren();
  for (const chapter of chapters) {
    const chapterGroup = document.createElement('optgroup');
    chapterGroup.label = t(language, `chapter.${chapter}` as StringKey);
    levels.forEach((level, levelIndexInList) => {
      if (level.chapter !== chapter) return;
      const option = document.createElement('option');
      option.value = String(levelIndexInList);
      option.textContent = `${t(language, 'level')} ${level.order}`;
      chapterGroup.appendChild(option);
    });
    levelSelect.appendChild(chapterGroup);
  }
  levelSelect.value = String(levelIndex);
}

let shownLanguage = '';
let shownState: unknown = null;
function render() {
  const { history, language, levelIndex } = store.getState().game;
  const state = history.present;
  if (language !== shownLanguage) {
    shownLanguage = language;
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    for (const textElement of document.querySelectorAll<HTMLElement>('[data-text]')) {
      textElement.textContent = t(language, textElement.dataset.text as StringKey);
    }
    fillLevelSelect();
  }
  levelSelect.value = String(levelIndex);
  if (state !== shownState) {
    shownState = state;
    renderBoard(boardElement, state);
  }
  const par = levels[levelIndex].par;
  const moveText = `${t(language, 'moves')}: ${state.moveCount}${par ? ` (${t(language, 'par')} ${par})` : ''}`;
  statusElement.textContent = state.status === 'won' ? `${t(language, 'won')} ${moveText}` : moveText;
  statusElement.classList.toggle('won', state.status === 'won');
}

store.subscribe(render);
render();
logger.info('started', { levels: levels.length });
