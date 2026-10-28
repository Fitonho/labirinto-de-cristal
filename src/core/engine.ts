// The game rules. `move` is pure: it never changes the state it is given.
import { doorIsValid, edge, hasDoor, inside, neighbour, opposite, sameDoor, tileAt, tileIndex } from './board';
import type { BlockReason, Cell, Direction, Door, GameEvent, GameState, PushRefusal, StepResult } from './types';
import { DIRECTIONS } from './types';

export function move(state: GameState, direction: Direction): StepResult {
  if (state.status === 'won') return blocked(state, 'won', direction);

  const fromCell: Cell = { row: state.player.row, column: state.player.column };
  const targetCell = neighbour(fromCell, direction);
  if (!inside(state, targetCell)) return blocked(state, 'edge', direction);

  const door = edge(fromCell, direction);
  if (hasDoor(state, door)) {
    // Going through a door: you land on the tile behind it and take the
    // opposite of its colour. Doors stay on their edges.
    const colour = opposite(tileAt(state, targetCell).colour);
    const nextState = { ...state, player: { ...targetCell, colour } };
    return arrive(nextState, [{ type: 'flipped', colour, door }, { type: 'moved', from: fromCell, to: targetCell }]);
  }

  if (tileAt(state, targetCell).colour !== state.player.colour) {
    return arrive({ ...state, player: { ...state.player, ...targetCell } }, [{ type: 'moved', from: fromCell, to: targetCell }]);
  }

  return push(state, fromCell, targetCell, direction);
}

/** Directions that change the state, for highlighting possible moves. */
export function legalMoves(state: GameState): Direction[] {
  return DIRECTIONS.filter((direction) => move(state, direction).state !== state);
}

function push(state: GameState, fromCell: Cell, targetCell: Cell, direction: Direction): StepResult {
  const behindCell = neighbour(targetCell, direction);
  const refuse = (reason: PushRefusal): StepResult => ({
    state,
    events: [{ type: 'pushRefused', reason, at: targetCell }],
  });
  if (!inside(state, behindCell)) return refuse('edge');
  const tileBehind = tileAt(state, behindCell);
  if (tileBehind.goal) return refuse('goal');
  if (tileBehind.colour === state.player.colour) return refuse('ownColour');

  // Swap the pushed tile with the floor tile behind it.
  const tiles = state.tiles.slice();
  const pushedIndex = tileIndex(state, targetCell);
  const behindIndex = tileIndex(state, behindCell);
  [tiles[pushedIndex], tiles[behindIndex]] = [tiles[behindIndex], tiles[pushedIndex]];

  // Doors on the pushed tile's edges move one cell with it. The tile that
  // slides back carries none.
  const movedDoors: { from: Door; to: Door }[] = [];
  const doors = state.doors.map((door) => {
    const pushedTileSide = DIRECTIONS.find((side) => sameDoor(door, edge(targetCell, side)));
    if (!pushedTileSide) return door;
    const movedDoor = edge(behindCell, pushedTileSide);
    movedDoors.push({ from: door, to: movedDoor });
    return movedDoor;
  });

  const pushedState: GameState = { ...state, tiles, doors, player: { ...state.player, ...targetCell } };
  if (!doors.every((door) => doorIsValid(pushedState, door))) return refuse('door');

  return arrive(pushedState, [
    { type: 'pushed', tileId: tiles[behindIndex].id, from: targetCell, to: behindCell },
    ...movedDoors.map((movedDoor) => ({ type: 'doorMoved' as const, ...movedDoor })),
    { type: 'moved', from: fromCell, to: targetCell },
  ]);
}

function blocked(state: GameState, reason: BlockReason, direction: Direction): StepResult {
  return { state, events: [{ type: 'blocked', reason, direction }] };
}

/** Counts the move and checks for crystals and the win. */
function arrive(state: GameState, events: GameEvent[]): StepResult {
  let nextState: GameState = { ...state, moveCount: state.moveCount + 1 };
  const playerCell = { row: nextState.player.row, column: nextState.player.column };
  const tile = tileAt(nextState, playerCell);
  if (tile.goal && !nextState.collectedGoalIds.includes(tile.id)) {
    nextState = { ...nextState, collectedGoalIds: [...nextState.collectedGoalIds, tile.id] };
    events = [...events, { type: 'collected', tileId: tile.id, at: playerCell }];
    const goalCount = nextState.tiles.filter((boardTile) => boardTile.goal).length;
    if (nextState.collectedGoalIds.length === goalCount) {
      nextState = { ...nextState, status: 'won' };
      events = [...events, { type: 'won', moveCount: nextState.moveCount }];
    }
  }
  return { state: nextState, events };
}
