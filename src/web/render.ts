// Draws a GameState into the board element. Knows nothing about the rules
// beyond reading the state.
import { opposite, sides, tileAt, type Colour, type GameState } from '../core';

const borderSide = { up: 'Top', right: 'Right', down: 'Bottom', left: 'Left' } as const;

export function renderBoard(board: HTMLElement, s: GameState) {
  board.style.setProperty('--rows', String(s.rows));
  board.style.setProperty('--cols', String(s.cols));
  board.replaceChildren();

  // Doors are drawn on the side that is the player's colour, as before.
  const doorSides = new Map<number, (keyof typeof borderSide)[]>();
  for (const d of s.doors) {
    const [a, b] = sides(d);
    const aIsPlayers = tileAt(s, a).colour === s.player.colour;
    const cell = aIsPlayers ? a : b;
    const side = aIsPlayers ? d.side : d.side === 'right' ? 'left' : 'up';
    const i = cell.row * s.cols + cell.col;
    doorSides.set(i, [...(doorSides.get(i) ?? []), side]);
  }

  s.tiles.forEach((tile, i) => {
    const el = document.createElement('div');
    el.className = `tile ${tile.colour}`;
    el.dataset.tile = String(tile.id);
    if (tile.colour === s.player.colour) el.classList.add('solid');
    for (const side of doorSides.get(i) ?? []) {
      el.style[`border${borderSide[side]}Style` as 'borderTopStyle'] = 'dotted';
    }
    if (tile.goal && !s.collected.includes(tile.id)) el.appendChild(diamond(opposite(tile.colour)));
    if (i === s.player.row * s.cols + s.player.col) el.appendChild(player(s.player.colour));
    board.appendChild(el);
  });
}

function diamond(colour: Colour) {
  const el = document.createElement('div');
  el.className = `diamond ${colour}`;
  return el;
}

function player(colour: Colour) {
  const el = document.createElement('div');
  el.className = `player ${colour}`;
  return el;
}
