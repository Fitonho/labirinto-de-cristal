// Draws a GameState into the board element. Knows nothing about the rules
// beyond reading the state.
import { opposite, type Colour, type GameState } from '../core';
import { doorSidesByTileIndex } from '../ui/boardLayout';

const borderSideNames = { up: 'Top', right: 'Right', down: 'Bottom', left: 'Left' } as const;

export function renderBoard(boardElement: HTMLElement, state: GameState) {
  boardElement.style.setProperty('--row-count', String(state.rowCount));
  boardElement.style.setProperty('--column-count', String(state.columnCount));
  boardElement.replaceChildren();

  const doorSidesByTile = doorSidesByTileIndex(state);

  const playerTileIndex = state.player.row * state.columnCount + state.player.column;
  state.tiles.forEach((tile, tileIndex) => {
    const tileElement = document.createElement('div');
    tileElement.className = `tile ${tile.colour}`;
    tileElement.dataset.tile = String(tile.id);
    if (tile.colour === state.player.colour) tileElement.classList.add('solid');
    for (const doorSide of doorSidesByTile.get(tileIndex) ?? []) {
      tileElement.style[`border${borderSideNames[doorSide]}Style` as 'borderTopStyle'] = 'dotted';
    }
    if (tile.goal && !state.collectedGoalIds.includes(tile.id)) {
      tileElement.appendChild(diamondElement(opposite(tile.colour)));
    }
    if (tileIndex === playerTileIndex) tileElement.appendChild(playerElement(state.player.colour));
    boardElement.appendChild(tileElement);
  });
}

function diamondElement(colour: Colour) {
  const element = document.createElement('div');
  element.className = `diamond ${colour}`;
  return element;
}

function playerElement(colour: Colour) {
  const element = document.createElement('div');
  element.className = `player ${colour}`;
  return element;
}
