// The game rules. `move` is pure: it never changes the state it is given.
import { doorIsValid, edge, hasDoor, inside, opposite, sameDoor, step, tileAt } from './board';
import type { BlockReason, Cell, Direction, Door, GameEvent, GameState, PushRefusal, StepResult } from './types';
import { DIRECTIONS } from './types';

export function move(state: GameState, dir: Direction): StepResult {
  if (state.status === 'won') return blocked(state, 'won');

  const from: Cell = { row: state.player.row, col: state.player.col };
  const to = step(from, dir);
  if (!inside(state, to)) return blocked(state, 'edge');

  const door = edge(from, dir);
  if (hasDoor(state, door)) {
    // Going through a door: you land on the tile behind it and take the
    // opposite of its colour. Doors stay on their edges.
    const colour = opposite(tileAt(state, to).colour);
    const next = { ...state, player: { ...to, colour } };
    return arrive(next, [{ type: 'flipped', colour, door }, { type: 'moved', from, to }]);
  }

  if (tileAt(state, to).colour !== state.player.colour) {
    return arrive({ ...state, player: { ...state.player, ...to } }, [{ type: 'moved', from, to }]);
  }

  return push(state, from, to, dir);
}

/** Directions that change the state, for highlighting possible moves. */
export function legalMoves(state: GameState): Direction[] {
  return DIRECTIONS.filter((d) => move(state, d).state !== state);
}

function push(state: GameState, from: Cell, to: Cell, dir: Direction): StepResult {
  const behind = step(to, dir);
  const refuse = (reason: PushRefusal): StepResult => ({
    state,
    events: [{ type: 'pushRefused', reason, at: to }],
  });
  if (!inside(state, behind)) return refuse('edge');
  const target = tileAt(state, behind);
  if (target.goal) return refuse('goal');
  if (target.colour === state.player.colour) return refuse('ownColour');

  // Swap the pushed tile with the floor tile behind it.
  const tiles = state.tiles.slice();
  const i = to.row * state.cols + to.col;
  const j = behind.row * state.cols + behind.col;
  [tiles[i], tiles[j]] = [tiles[j], tiles[i]];

  // Doors on the pushed tile's edges move one cell with it. The tile that
  // slides back carries none.
  const moved: { from: Door; to: Door }[] = [];
  const doors = state.doors.map((d) => {
    const own = DIRECTIONS.find((side) => sameDoor(d, edge(to, side)));
    if (!own) return d;
    const next = edge(behind, own);
    moved.push({ from: d, to: next });
    return next;
  });

  const pushed: GameState = { ...state, tiles, doors, player: { ...state.player, ...to } };
  if (!doors.every((d) => doorIsValid(pushed, d))) return refuse('door');

  return arrive(pushed, [
    { type: 'pushed', tile: tiles[j].id, from: to, to: behind },
    ...moved.map((m) => ({ type: 'doorMoved' as const, ...m })),
    { type: 'moved', from, to },
  ]);
}

function blocked(state: GameState, reason: BlockReason): StepResult {
  return { state, events: [{ type: 'blocked', reason }] };
}

/** Counts the move and checks for crystals and the win. */
function arrive(state: GameState, events: GameEvent[]): StepResult {
  let next: GameState = { ...state, moves: state.moves + 1 };
  const at = { row: next.player.row, col: next.player.col };
  const tile = tileAt(next, at);
  if (tile.goal && !next.collected.includes(tile.id)) {
    next = { ...next, collected: [...next.collected, tile.id] };
    events = [...events, { type: 'collected', tile: tile.id, at }];
    const goals = next.tiles.filter((t) => t.goal).length;
    if (next.collected.length === goals) {
      next = { ...next, status: 'won' };
      events = [...events, { type: 'won', moves: next.moves }];
    }
  }
  return { state: next, events };
}
