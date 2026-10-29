// Pure helpers for how the Pebble and the Beacon star react: which pose the
// Pebble strikes for a move, where its eyes look, whether a star is awake,
// and where the collect burst's small stars fly. The numbers come from the
// approved sketches; the components turn them into Reanimated animations.
// No React here, so Vitest tests it.
import type { Colour, Direction, GameEvent, GameState } from '../core';
import { directionBetween } from './motion';

/** What the Pebble does on a move. A win wins over everything, a flip over a push, and a push over a plain slide. */
export type PebbleAction = 'slide' | 'push' | 'bump' | 'flip' | 'cheer';

export interface PebbleReaction {
  action: PebbleAction | null; // null after undo, restart, a new level or a move after winning
  direction: Direction | null; // the way it moved or tried to move
  collectedTileId: number | null; // the star collected on this move
}

export function pebbleReactionFor(events: GameEvent[], state: GameState): PebbleReaction {
  const eventTypes = new Set(events.map((event) => event.type));
  let direction: Direction | null = null;
  let collectedTileId: number | null = null;
  for (const event of events) {
    if (event.type === 'moved') direction = directionBetween(event.from, event.to);
    if (event.type === 'blocked' && event.reason === 'edge') direction = event.direction;
    if (event.type === 'pushRefused') direction = directionBetween(state.player, event.at);
    if (event.type === 'collected') collectedTileId = event.tileId;
  }
  let action: PebbleAction | null = null;
  if (eventTypes.has('won')) action = 'cheer';
  else if (eventTypes.has('flipped')) action = 'flip';
  else if (eventTypes.has('pushed')) action = 'push';
  else if (eventTypes.has('moved')) action = 'slide';
  else if (direction) action = 'bump';
  return { action, direction, collectedTileId };
}

/** The eyes' looks: open, squeezed into a line, or wide and round. Blinking and the happy face are separate. */
export type EyeLook = 'open' | 'squint' | 'wide';
/** How wide and tall the eyes are drawn for each look, against open eyes. */
export const EYE_SCALES: Record<EyeLook, { width: number; height: number }> = {
  open: { width: 1, height: 1 },
  squint: { width: 1.6, height: 0.15 },
  wide: { width: 1.45, height: 0.75 },
};

/** One step of a pose: animate to `to` over `duration` milliseconds. */
export interface Keyframe<ValueType> {
  to: ValueType;
  duration: number;
}

export interface PebblePose {
  /**
   * How much longer the Pebble gets along the move: 0.2 is a fifth longer, a
   * negative value is squashed. It follows these keyframes, then the jelly
   * spring brings it back to 0.
   */
  stretches: Keyframe<number>[];
  /** Squashes against what it hits, so the contact side stays put, rather than about its centre. */
  anchored: boolean;
  /** The eyes follow these keyframes, then open again. */
  eyeLooks: Keyframe<EyeLook>[];
  /** Turns to stretch top to bottom this many milliseconds in, whichever way it moved. */
  uprightAfter?: number;
}

export const PEBBLE_POSES: Record<PebbleAction, PebblePose> = {
  // Stretches along the slide, then settles with a small jiggle when it stops.
  slide: { stretches: [{ to: 0.2, duration: 60 }, { to: -0.11, duration: 60 }], anchored: false, eyeLooks: [] },
  // Squashes flat against the wall or box at the end of the bump, squinting.
  bump: {
    stretches: [{ to: 0, duration: 40 }, { to: -0.28, duration: 30 }],
    anchored: true,
    eyeLooks: [{ to: 'squint', duration: 40 }, { to: 'squint', duration: 240 }],
  },
  // Leans into the box with effort while both slide.
  push: {
    stretches: [{ to: -0.25, duration: 40 }, { to: -0.25, duration: 80 }],
    anchored: true,
    eyeLooks: [{ to: 'squint', duration: 40 }, { to: 'squint', duration: 220 }],
  },
  // Squeezed thin through the door while the old boxes grow, then springs out wide at the colour swap (FLIP_GROW_DURATION).
  flip: {
    stretches: [{ to: -0.4, duration: 90 }],
    anchored: false,
    eyeLooks: [{ to: 'squint', duration: 40 }, { to: 'squint', duration: 50 }, { to: 'wide', duration: 40 }, { to: 'wide', duration: 260 }],
  },
  // The winning move: the slide, then once on the star it stands up, crouches and springs tall in one cheer.
  cheer: {
    stretches: [
      { to: 0.2, duration: 60 },
      { to: 0, duration: 60 },
      { to: -0.22, duration: 70 },
      { to: 0.24, duration: 100 },
    ],
    anchored: false,
    eyeLooks: [],
    uprightAfter: 120,
  },
};

/**
 * The jelly spring every pose ends with: a period of about 175 ms dying away
 * over about 100 ms, the "squeeze through" sketch at wobble strength 0.9. It
 * stops once its energy is a thousandth of the start: the wobble is then 3% of
 * the squash, under a pixel, about 350 ms in. Reanimated's default would keep
 * it running, unseen, for a second.
 */
export const JELLY_SPRING = { mass: 1, stiffness: 1370, damping: 20, energyThreshold: 1e-3 };
/** A Pebble stretched along a move gets this much thinner across it, for each unit longer. */
export const ACROSS_RATIO = 0.7;

/** Which way the eyes look, as a unit vector; down and right are positive, as on screen. */
export function lookFor(direction: Direction): { lookX: number; lookY: number } {
  const looks: Record<Direction, { lookX: number; lookY: number }> = {
    up: { lookX: 0, lookY: -1 },
    right: { lookX: 1, lookY: 0 },
    down: { lookX: 0, lookY: 1 },
    left: { lookX: -1, lookY: 0 },
  };
  return looks[direction];
}

/** +1 for a move toward the bottom right, -1 toward the top left. */
export function signOf(direction: Direction): number {
  return direction === 'right' || direction === 'down' ? 1 : -1;
}

export function isVertical(direction: Direction): boolean {
  return direction === 'up' || direction === 'down';
}

/** A star is awake, sending rings, when the player is its colour: then its tile is floor, not a box. */
export type BeaconState = 'awake' | 'resting' | 'locked'; // 'locked' waits for a level task the engine doesn't have yet

export function beaconStateFor(tileColour: Colour, boxColour: Colour): BeaconState {
  'worklet';
  return tileColour === boxColour ? 'resting' : 'awake';
}

/** Where the eyes glance when the player stops: toward the nearest star the player can reach, or null. */
export function glanceTargetFor(state: GameState): { lookX: number; lookY: number } | null {
  let nearest: { lookX: number; lookY: number } | null = null;
  let nearestDistance = Infinity;
  for (const [tileIndex, tile] of state.tiles.entries()) {
    if (!tile.goal || state.collectedGoalIds.includes(tile.id) || tile.colour === state.player.colour) continue;
    const columnChange = (tileIndex % state.columnCount) - state.player.column;
    const rowChange = Math.floor(tileIndex / state.columnCount) - state.player.row;
    const distance = Math.hypot(columnChange, rowChange);
    if (distance > 0 && distance < nearestDistance) {
      nearest = { lookX: columnChange / distance, lookY: rowChange / distance };
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** A place the eyes look, and how long they stay there. */
export interface Glance {
  look: { lookX: number; lookY: number };
  hold: number; // milliseconds
}
/** Where the eyes wander when the player stops and no star is reachable: left, then a little up, then back. */
export const LOOK_AROUND: Glance[] = [
  { look: { lookX: -1, lookY: 0 }, hold: 800 },
  { look: { lookX: 0.4, lookY: -1 }, hold: 700 },
];
/** How long the eyes rest on a reachable star before looking back. */
export const STAR_GLANCE_HOLD = 1100;
/** How long until the Pebble glances again, while the player still hasn't moved. */
export const GLANCE_REPEAT = 6000;

/** Where each small star of the collect burst flies, as unit vectors evenly around the circle. */
export function shardDirections(shardCount: number): { offsetX: number; offsetY: number }[] {
  return [...Array(shardCount).keys()].map((shardIndex) => {
    const angle = (shardIndex / shardCount) * Math.PI * 2;
    return { offsetX: Math.cos(angle), offsetY: Math.sin(angle) };
  });
}

/** Eight points, alternating between the star's tips and its waist, starting at the top. */
export function starPoints(centreX: number, centreY: number, outerRadius: number, innerRadius: number): string {
  return [...Array(8).keys()]
    .map((pointIndex) => {
      const angle = (pointIndex * Math.PI) / 4 - Math.PI / 2;
      const distance = pointIndex % 2 === 0 ? outerRadius : innerRadius;
      return `${centreX + Math.cos(angle) * distance},${centreY + Math.sin(angle) * distance}`;
    })
    .join(' ');
}
