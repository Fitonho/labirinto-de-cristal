// Web entry point: wires the store to the page.
import { levels, chapters } from '../levels/index';
import { defaultLanguage, t, type StringKey } from './i18n';
import { listenToKeys, listenToSwipes, type Command } from './input';
import { logger } from './logger';
import { renderBoard } from './render';
import { actions, createStore } from './store';

const store = createStore(defaultLanguage());
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const board = $('board');
const select = $<HTMLSelectElement>('level-select');
const status = $('status');

function run(c: Command) {
  if (c.type === 'move') store.dispatch(actions.move(c.dir));
  if (c.type === 'undo') store.dispatch(actions.undo());
  if (c.type === 'reset') store.dispatch(actions.reset());
}

listenToKeys(run);
listenToSwipes(board, run);
$('undo').addEventListener('click', () => run({ type: 'undo' }));
$('reset').addEventListener('click', () => run({ type: 'reset' }));
$('language').addEventListener('click', () => {
  store.dispatch(actions.setLanguage(store.getState().game.language === 'pt' ? 'en' : 'pt'));
});
select.addEventListener('change', () => {
  store.dispatch(actions.selectLevel(Number(select.value)));
  select.blur();
});

function fillLevelSelect() {
  const { language, levelIndex } = store.getState().game;
  select.replaceChildren();
  for (const chapter of chapters) {
    const group = document.createElement('optgroup');
    group.label = t(language, `chapter.${chapter}` as StringKey);
    levels.forEach((level, i) => {
      if (level.chapter !== chapter) return;
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `${t(language, 'level')} ${level.order}`;
      group.appendChild(option);
    });
    select.appendChild(group);
  }
  select.value = String(levelIndex);
}

let shownLanguage = '';
let shownState: unknown = null;
function render() {
  const { history, language, levelIndex } = store.getState().game;
  const state = history.present;
  if (language !== shownLanguage) {
    shownLanguage = language;
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    for (const el of document.querySelectorAll<HTMLElement>('[data-text]')) {
      el.textContent = t(language, el.dataset.text as StringKey);
    }
    fillLevelSelect();
  }
  select.value = String(levelIndex);
  if (state !== shownState) {
    shownState = state;
    renderBoard(board, state);
  }
  const par = levels[levelIndex].par;
  const moves = `${t(language, 'moves')}: ${state.moves}${par ? ` (${t(language, 'par')} ${par})` : ''}`;
  status.textContent = state.status === 'won' ? `${t(language, 'won')} ${moves}` : moves;
  status.classList.toggle('won', state.status === 'won');
}

store.subscribe(render);
render();
logger.info('started', { levels: levels.length });
