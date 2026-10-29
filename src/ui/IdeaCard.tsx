// The new-idea card, on the levels that bring in an idea (levelIdeas.ts). It
// rises over the board as the level opens, with the level's name, a little
// scene that plays the idea on loop and a one-line tip. Its Play button fills
// for a moment first, and until it is full a tap only nudges it, so the tip
// gets read. Then any tap, swipe or key closes it into the level name in the
// header, and the screen makes the idea glow on the board (IdeaGlow). Like
// the result card it is always mounted and hidden, and every step runs on
// shared values on the UI thread, so opening a level costs nothing extra.
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { opposite, type Colour } from '../core';
import type { Language } from '../state/store';
import { useAppColours } from './AppColours';
import { t } from './i18n';
import {
  IDEA_CARD_CLOSE_DURATION,
  IDEA_CARD_FILL_START,
  IDEA_CARD_HOLD,
  IDEA_CARD_PART_DELAYS,
  IDEA_CARD_PART_DURATION,
  IDEA_CARD_RISE_DURATION,
  IDEA_SCENE_DURATION,
  ADVICE_IDEAS,
  type LevelIdea,
} from './levelIdeas';
import { starPoints } from './pieceLooks';
import { BACKDROP_COLOUR, BOX_CORNER_RADIUS, BOX_INSET, PEBBLE_RADIUS, STAR_INNER_RADIUS, STAR_OUTER_RADIUS } from './theme';

/** Where the card flies to as it closes: the level name in the header, from the top left of the screen. */
const HEADER_NAME_X = 120;
const HEADER_NAME_Y = 38;
const CARD_MAX_WIDTH = 340;

interface IdeaCardProps {
  open: boolean;
  idea: LevelIdea | null;
  levelName: string;
  /** "Primeiros passos 2": the chapter and the level's number, under the New label. */
  levelPlace: string;
  language: Language;
  tileColours: Record<Colour, string>;
  seamColour: string;
  /** Goes up by one for each key the player presses while the card is open; each counts as a tap. */
  keyPressCount: number;
  onClose: () => void;
}

export const IdeaCard = memo(function IdeaCard({
  open,
  idea,
  levelName,
  levelPlace,
  language,
  tileColours,
  seamColour,
  keyPressCount,
  onClose,
}: IdeaCardProps) {
  const appColours = useAppColours();
  const scene = idea ? SCENES[idea] : null;
  const reducedMotion = useReducedMotion();
  const rise = useSharedValue(0); // 0 below and small, 1 in place
  const clock = useSharedValue(0); // milliseconds since the card opened, up to the hold
  const closing = useSharedValue(1); // 0 open, 1 folded into the header name
  const nudge = useSharedValue(0);
  const readyPulse = useSharedValue(0);
  const openedAt = useRef(0);
  const [cardFrame, setCardFrame] = useState({ centreX: 0, centreY: 0 });

  useEffect(() => {
    if (open) {
      openedAt.current = Date.now();
      closing.value = 0;
      rise.value = 0;
      clock.value = 0;
      rise.value = withTiming(1, { duration: IDEA_CARD_RISE_DURATION, easing: Easing.bezier(0.34, 1.4, 0.64, 1) });
      clock.value = withTiming(IDEA_CARD_HOLD, { duration: IDEA_CARD_HOLD, easing: Easing.linear });
      readyPulse.value = withDelay(IDEA_CARD_HOLD, withSequence(withTiming(1, { duration: 210 }), withTiming(0, { duration: 210 })));
    } else {
      cancelAnimation(clock);
      closing.value = withTiming(1, { duration: IDEA_CARD_CLOSE_DURATION, easing: Easing.in(Easing.quad) });
    }
  }, [open, rise, clock, closing, readyPulse]);

  const press = () => {
    if (!open) return;
    if (Date.now() - openedAt.current < IDEA_CARD_HOLD) {
      nudge.value = withSequence(withTiming(-4, { duration: 65 }), withTiming(4, { duration: 130 }), withTiming(0, { duration: 65 }));
      return;
    }
    onClose();
  };
  const pressRef = useRef(press);
  pressRef.current = press;
  // A gesture, like the board's, so the touch that starts a tap or a swipe is the one that counts.
  const touch = usePanGesture({ runOnJS: true, onBegin: () => pressRef.current() });
  const firstKeyPressCount = useRef(keyPressCount);
  useEffect(() => {
    if (keyPressCount !== firstKeyPressCount.current) pressRef.current();
  }, [keyPressCount]);

  const onCardLayout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setCardFrame({ centreX: x + width / 2, centreY: y + height / 2 });
  };
  const flyX = HEADER_NAME_X - cardFrame.centreX;
  const flyY = HEADER_NAME_Y - cardFrame.centreY;

  const scrimStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, rise.value * 1.4) * (1 - closing.value) }));
  const cardStyle = useAnimatedStyle(() => {
    const shown = Math.min(1, rise.value * 1.5) * (1 - closing.value);
    if (reducedMotion) return { opacity: shown };
    const scale = (0.94 + 0.06 * rise.value) * (1 - 0.7 * closing.value);
    return {
      opacity: shown,
      transform: [
        { translateX: closing.value * flyX },
        { translateY: (1 - rise.value) * 24 + closing.value * flyY },
        { scale },
      ],
    };
  });
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: nudge.value }, { scale: 1 + 0.05 * readyPulse.value }],
  }));
  const fillStyle = useAnimatedStyle(() => ({
    width: `${interpolate(clock.value, [IDEA_CARD_FILL_START, IDEA_CARD_HOLD], [0, 100], 'clamp')}%`,
  }));

  return (
    <View pointerEvents={open ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: BACKDROP_COLOUR }, scrimStyle]} />
      <GestureDetector gesture={touch}>
        <View accessibilityRole="button" accessibilityLabel={t(language, 'ideaPlay')} style={styles.catcher}>
          <Animated.View
            accessibilityViewIsModal
            onLayout={onCardLayout}
            style={[styles.card, { backgroundColor: appColours.page, borderColor: appColours.controlBorder }, cardStyle]}
          >
            <CardPart clock={clock} order={0}>
              <Text style={[styles.label, { color: appColours.accent }]}>{`${t(language, idea && ADVICE_IDEAS.includes(idea) ? 'ideaTip' : 'ideaNew')} · ${levelPlace}`.toUpperCase()}</Text>
            </CardPart>
            <CardPart clock={clock} order={1}>
              <Text accessibilityRole="header" style={[styles.name, { color: appColours.ink }]}>
                {levelName}
              </Text>
            </CardPart>
            <CardPart clock={clock} order={2}>
              {scene && <IdeaScene scene={scene} tileColours={tileColours} seamColour={seamColour} playing={open && !reducedMotion} />}
            </CardPart>
            <CardPart clock={clock} order={3}>
              <Text style={[styles.tip, { color: appColours.ink }]}>{idea ? t(language, `idea.${idea}`) : ''}</Text>
            </CardPart>
            <CardPart clock={clock} order={4}>
              <Animated.View style={[styles.button, { backgroundColor: appColours.controlBorder }, buttonStyle]}>
                <Animated.View style={[styles.buttonFill, { backgroundColor: appColours.accent }, fillStyle]} />
                <Text style={[styles.buttonText, { color: appColours.onAccent }]}>{t(language, 'ideaPlay')}</Text>
              </Animated.View>
            </CardPart>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
});

/** One part of the card, fading up at its turn in the timeline. */
function CardPart({ clock, order, children }: { clock: SharedValue<number>; order: number; children: ReactNode }) {
  const delay = IDEA_CARD_PART_DELAYS[order];
  const partStyle = useAnimatedStyle(() => {
    const shown = interpolate(clock.value, [delay, delay + IDEA_CARD_PART_DURATION], [0, 1], 'clamp');
    return { opacity: shown, transform: [{ translateY: (1 - shown) * 6 }] };
  });
  return <Animated.View style={[styles.part, partStyle]}>{children}</Animated.View>;
}

/** The little scene's cell size, in points. */
const SCENE_CELL = 34;
/** Within one loop: when the Pebble starts and stops moving, and when the moved pieces fade out to start again. */
const MOVE_START = 0.15;
const MOVE_END = 0.55;
const FADE_OUT_START = 0.85;
const FADE_OUT_END = 0.95;

interface SceneCell {
  row: number;
  column: number;
}

interface Scene {
  /** One string per row, one tile colour per cell: b or w. In a scene with a push, tiles in the Pebble's colour are boxes. */
  tileRows: string[];
  /** Every cell the Pebble stands on, one step apart; each step takes the same time. */
  pebble: { path: SceneCell[]; colourBefore: Colour; colourAfter: Colour };
  /** A box the Pebble pushes one cell on its first step, which may carry a portal on its right side. */
  box: { fromCell: SceneCell; colour: Colour; carriesPortal: boolean } | null;
  /** Draws tiles in the Pebble's colour as boxes even with nothing pushed (a scene with a push always does). */
  showsBoxes?: boolean;
  /** A portal that stays on the edge between two side-by-side cells. */
  portal: { between: [SceneCell, SceneCell] } | null;
  /** Each star bursts as the Pebble first reaches its cell. */
  stars: { cell: SceneCell; colour: Colour }[];
  /** How long one loop takes, in milliseconds, when its path is longer than a few steps. */
  loopDuration?: number;
}

/** Cells along row 0, from one column to another. */
function rowPath(fromColumn: number, toColumn: number): SceneCell[] {
  const path: SceneCell[] = [];
  for (let column = fromColumn; column <= toColumn; column++) path.push({ row: 0, column });
  return path;
}

const SCENES: Record<LevelIdea, Scene | null> = {
  push: {
    tileRows: ['bwbb'],
    pebble: { path: rowPath(0, 1), colourBefore: 'white', colourAfter: 'white' },
    box: { fromCell: { row: 0, column: 1 }, colour: 'white', carriesPortal: false },
    portal: null,
    stars: [],
  },
  // Two boxes in a row don't move, so the Pebble goes round them to the star.
  oneBox: {
    tileRows: ['bwwb', 'bbbb'],
    pebble: {
      path: [
        { row: 0, column: 0 },
        { row: 1, column: 0 },
        { row: 1, column: 1 },
        { row: 1, column: 2 },
        { row: 1, column: 3 },
        { row: 0, column: 3 },
      ],
      colourBefore: 'white',
      colourAfter: 'white',
    },
    box: null,
    showsBoxes: true,
    portal: null,
    stars: [{ cell: { row: 0, column: 3 }, colour: 'white' }],
    loopDuration: 3200,
  },
  // A box pushed into the corner, where nothing can bring it back; the loop
  // starting over is what Undo does.
  undo: {
    tileRows: ['bwb', 'wwb'],
    pebble: { path: rowPath(0, 1), colourBefore: 'white', colourAfter: 'white' },
    box: { fromCell: { row: 0, column: 1 }, colour: 'white', carriesPortal: false },
    portal: null,
    stars: [],
  },
  portal: {
    tileRows: ['bbww'],
    pebble: { path: rowPath(0, 2), colourBefore: 'white', colourAfter: 'black' },
    box: null,
    portal: { between: [{ row: 0, column: 1 }, { row: 0, column: 2 }] },
    stars: [],
  },
  // The rule behind sample 3's bridge, not its recipe: the line of boxes is
  // already whole, and the flip alone turns it into the path to the star.
  // Filling the gap in the level is left for the player to find.
  bridge: {
    tileRows: ['bbb', 'www', 'bbb'],
    pebble: {
      path: [
        { row: 2, column: 0 },
        { row: 2, column: 1 },
        { row: 2, column: 2 },
        { row: 1, column: 2 },
        { row: 1, column: 1 },
        { row: 1, column: 0 },
      ],
      colourBefore: 'white',
      colourAfter: 'black',
    },
    box: null,
    showsBoxes: true,
    portal: { between: [{ row: 1, column: 2 }, { row: 2, column: 2 }] },
    stars: [{ cell: { row: 1, column: 0 }, colour: 'black' }],
    loopDuration: 3600,
  },
  crystalColour: {
    tileRows: ['wwbb'],
    pebble: { path: rowPath(0, 3), colourBefore: 'black', colourAfter: 'white' },
    box: null,
    portal: { between: [{ row: 0, column: 1 }, { row: 0, column: 2 }] },
    stars: [{ cell: { row: 0, column: 3 }, colour: 'white' }],
  },
  // One star on each side of the portal: one before the flip, one after.
  allStars: {
    tileRows: ['bbww'],
    pebble: {
      path: [
        { row: 0, column: 1 },
        { row: 0, column: 0 },
        { row: 0, column: 1 },
        { row: 0, column: 2 },
        { row: 0, column: 3 },
      ],
      colourBefore: 'white',
      colourAfter: 'black',
    },
    box: null,
    portal: { between: [{ row: 0, column: 1 }, { row: 0, column: 2 }] },
    stars: [
      { cell: { row: 0, column: 0 }, colour: 'white' },
      { cell: { row: 0, column: 3 }, colour: 'black' },
    ],
    loopDuration: 3200,
  },
  // Advice, not a rule, so there is nothing to play.
  skip: null,
  portalPush: {
    tileRows: ['bwbb'],
    pebble: { path: rowPath(0, 1), colourBefore: 'white', colourAfter: 'white' },
    box: { fromCell: { row: 0, column: 1 }, colour: 'white', carriesPortal: true },
    portal: null,
    stars: [],
  },
};

const TILE_COLOURS_BY_LETTER: Record<string, Colour> = { b: 'black', w: 'white' };

function sameCell(first: SceneCell, second: SceneCell): boolean {
  return first.row === second.row && first.column === second.column;
}

/** The scene's tile colours, row by row, after its push: the box's colour and the floor it lands on swap places. */
function tileColoursAfterPush(scene: Scene): Colour[][] {
  const tileColourRows = scene.tileRows.map((tileRow) => [...tileRow].map((letter) => TILE_COLOURS_BY_LETTER[letter]));
  if (!scene.box) return tileColourRows;
  const { path } = scene.pebble;
  const fromCell = scene.box.fromCell;
  const toCell = { row: fromCell.row + path[1].row - path[0].row, column: fromCell.column + path[1].column - path[0].column };
  const landedOnColour = tileColourRows[toCell.row][toCell.column];
  tileColourRows[toCell.row][toCell.column] = tileColourRows[fromCell.row][fromCell.column];
  tileColourRows[fromCell.row][fromCell.column] = landedOnColour;
  return tileColourRows;
}

interface SceneTilesProps {
  tileColourRows: Colour[][];
  /** Tiles in this colour are boxes, inset on the floor of the other colour; null draws every tile as floor. */
  boxColour: Colour | null;
  /** A cell left empty of its box, because that box is drawn moving. */
  skippedBoxCell: SceneCell | null;
  tileColours: Record<Colour, string>;
}

/** One still layer of the scene's tiles. */
function SceneTiles({ tileColourRows, boxColour, skippedBoxCell, tileColours }: SceneTilesProps) {
  const boxInset = SCENE_CELL * BOX_INSET;
  const boxSize = SCENE_CELL - 2 * boxInset;
  return (
    <>
      {tileColourRows.map((tileColourRow, row) =>
        tileColourRow.map((tileColour, column) => {
          const isBox = tileColour === boxColour;
          const isSkipped = skippedBoxCell !== null && sameCell(skippedBoxCell, { row, column });
          return (
            <View
              key={`${row}-${column}`}
              style={{
                position: 'absolute',
                left: column * SCENE_CELL,
                top: row * SCENE_CELL,
                width: SCENE_CELL,
                height: SCENE_CELL,
                backgroundColor: tileColours[isBox ? opposite(tileColour) : tileColour],
              }}
            >
              {isBox && !isSkipped && (
                <View
                  style={{
                    position: 'absolute',
                    left: boxInset,
                    top: boxInset,
                    width: boxSize,
                    height: boxSize,
                    borderRadius: boxSize * BOX_CORNER_RADIUS,
                    backgroundColor: tileColours[tileColour],
                  }}
                />
              )}
            </View>
          );
        }),
      )}
    </>
  );
}

interface IdeaSceneProps {
  scene: Scene;
  tileColours: Record<Colour, string>;
  seamColour: string;
  playing: boolean;
}

/** The idea played on a few cells: a push, going round two boxes, a push into a corner, a flip through a portal, a bridge, reaching one star or two, or a portal carried by a push. */
function IdeaScene({ scene, tileColours, seamColour, playing }: IdeaSceneProps) {
  const loopDuration = scene.loopDuration ?? IDEA_SCENE_DURATION;
  // One loop of the scene as a share from 0 to 1; a still scene shows its end.
  const progress = useSharedValue(0.7);
  useEffect(() => {
    if (!playing) {
      cancelAnimation(progress);
      progress.value = 0.7;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: loopDuration, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [playing, progress, loopDuration]);

  const { path, colourBefore, colourAfter } = scene.pebble;
  const stepCount = path.length - 1;
  const stepDuration = (MOVE_END - MOVE_START) / stepCount;
  // When the Pebble stands on each cell of its path, and how far that is from where it starts.
  const pathTimes = path.map((_cell, stepIndex) => MOVE_START + stepIndex * stepDuration);
  const pathOffsetsX = path.map((cell) => (cell.column - path[0].column) * SCENE_CELL);
  const pathOffsetsY = path.map((cell) => (cell.row - path[0].row) * SCENE_CELL);
  // The box moves with the Pebble's first step, the same way.
  const boxShiftX = (path[1].column - path[0].column) * SCENE_CELL;
  const boxShiftY = (path[1].row - path[0].row) * SCENE_CELL;
  const firstStepEnd = MOVE_START + stepDuration;
  // The share of the loop when the Pebble's centre crosses the portal, where it flips: halfway through that step.
  const portalCells = scene.portal?.between ?? null;
  const crossingStepIndex = portalCells
    ? path.findIndex(
        (cell, stepIndex) =>
          stepIndex > 0 &&
          portalCells.some((portalCell) => sameCell(portalCell, cell)) &&
          portalCells.some((portalCell) => sameCell(portalCell, path[stepIndex - 1])),
      )
    : -1;
  const crossing = crossingStepIndex > 0 ? MOVE_START + (crossingStepIndex - 0.5) * stepDuration : null;
  // With boxes on the board, a flip turns them all: the Pebble's old colour is floor now, and the other colour is boxes.
  const showsBoxes = scene.box !== null || scene.showsBoxes === true;
  const flipsBoxes = showsBoxes && crossing !== null && colourAfter !== colourBefore;
  const tileColourRowsBefore = scene.tileRows.map((tileRow) => [...tileRow].map((letter) => TILE_COLOURS_BY_LETTER[letter]));
  const tileColourRowsAfter = flipsBoxes ? tileColoursAfterPush(scene) : null;

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.06, FADE_OUT_START, FADE_OUT_END, 1], [0, 1, 1, 0, 0]),
  }));
  const pebbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, pathTimes, pathOffsetsX, 'clamp') },
      { translateY: interpolate(progress.value, pathTimes, pathOffsetsY, 'clamp') },
    ],
  }));
  const afterColourStyle = useAnimatedStyle(() => ({
    opacity: crossing === null ? 0 : interpolate(progress.value, [crossing - 0.02, crossing + 0.02], [0, 1], 'clamp'),
  }));
  // The flipped board fades back out with the moved pieces, so the loop starts again unflipped.
  const flippedBoardStyle = useAnimatedStyle(() => ({
    opacity:
      crossing === null
        ? 0
        : interpolate(progress.value, [crossing - 0.02, crossing + 0.02, FADE_OUT_START, FADE_OUT_END], [0, 1, 1, 0], 'clamp'),
  }));
  const boxStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [MOVE_START, firstStepEnd], [0, boxShiftX], 'clamp') },
      { translateY: interpolate(progress.value, [MOVE_START, firstStepEnd], [0, boxShiftY], 'clamp') },
    ],
  }));
  // When the Pebble first stands on each star's cell.
  const starArrivalTimes = scene.stars.map((star) => pathTimes[path.findIndex((cell) => sameCell(cell, star.cell))]);


  const pebbleSize = SCENE_CELL * PEBBLE_RADIUS * 2;
  const pebbleOffset = (SCENE_CELL - pebbleSize) / 2;
  const boxInset = SCENE_CELL * BOX_INSET;
  const boxSize = SCENE_CELL - 2 * boxInset;
  const seamStyle = { backgroundColor: seamColour, boxShadow: `0 0 6px ${seamColour}` };
  let portalSeamPlace = null;
  if (portalCells) {
    const [firstCell, secondCell] = portalCells;
    portalSeamPlace =
      firstCell.row === secondCell.row
        ? { left: Math.max(firstCell.column, secondCell.column) * SCENE_CELL - 1.5, top: firstCell.row * SCENE_CELL + 3, width: 3, height: SCENE_CELL - 6 }
        : { left: firstCell.column * SCENE_CELL + 3, top: Math.max(firstCell.row, secondCell.row) * SCENE_CELL - 1.5, width: SCENE_CELL - 6, height: 3 };
  }
  return (
    <View style={[styles.scene, { width: SCENE_CELL * scene.tileRows[0].length, height: SCENE_CELL * scene.tileRows.length }]}>
      <SceneTiles
        tileColourRows={tileColourRowsBefore}
        boxColour={showsBoxes ? colourBefore : null}
        skippedBoxCell={scene.box?.fromCell ?? null}
        tileColours={tileColours}
      />
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        {scene.box && (
          <Animated.View
            style={[
              { position: 'absolute', left: scene.box.fromCell.column * SCENE_CELL, top: scene.box.fromCell.row * SCENE_CELL, width: SCENE_CELL, height: SCENE_CELL },
              boxStyle,
            ]}
          >
            <View
              style={{
                position: 'absolute',
                left: boxInset,
                top: boxInset,
                width: boxSize,
                height: boxSize,
                borderRadius: boxSize * BOX_CORNER_RADIUS,
                backgroundColor: tileColours[scene.box.colour],
              }}
            />
            {scene.box.carriesPortal && <View style={[styles.seam, seamStyle, { left: SCENE_CELL - 1.5, top: 3, width: 3, height: SCENE_CELL - 6 }]} />}
          </Animated.View>
        )}
      </Animated.View>
      {tileColourRowsAfter && (
        <Animated.View style={[StyleSheet.absoluteFill, flippedBoardStyle]}>
          <SceneTiles tileColourRows={tileColourRowsAfter} boxColour={colourAfter} skippedBoxCell={null} tileColours={tileColours} />
        </Animated.View>
      )}
      {portalSeamPlace && <View style={[styles.seam, seamStyle, portalSeamPlace]} />}
      {scene.stars.map((star, starIndex) => (
        <SceneStar
          key={`${star.cell.row}-${star.cell.column}`}
          cell={star.cell}
          colour={tileColours[star.colour]}
          seamColour={seamColour}
          progress={progress}
          burstStart={starArrivalTimes[starIndex]}
        />
      ))}
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        <Animated.View style={[{ position: 'absolute', left: path[0].column * SCENE_CELL + pebbleOffset, top: path[0].row * SCENE_CELL + pebbleOffset }, pebbleStyle]}>
          <View style={{ width: pebbleSize, height: pebbleSize, borderRadius: pebbleSize / 2, backgroundColor: tileColours[colourBefore] }} />
          <Animated.View
            style={[
              { position: 'absolute', left: 0, top: 0, width: pebbleSize, height: pebbleSize, borderRadius: pebbleSize / 2, backgroundColor: tileColours[colourAfter] },
              afterColourStyle,
            ]}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

interface SceneStarProps {
  cell: SceneCell;
  colour: string;
  seamColour: string;
  progress: SharedValue<number>;
  /** The share of the loop when the Pebble reaches it and it bursts. */
  burstStart: number;
}

/** One star in the scene, bursting as the Pebble arrives. */
function SceneStar({ cell, colour, seamColour, progress, burstStart }: SceneStarProps) {
  const starStyle = useAnimatedStyle(() => {
    const burst = interpolate(progress.value, [burstStart, burstStart + 0.15], [0, 1], 'clamp');
    return { opacity: 1 - burst, transform: [{ scale: 1 + burst * 0.6 }] };
  });
  return (
    <Animated.View style={[styles.star, { left: cell.column * SCENE_CELL, top: cell.row * SCENE_CELL }, starStyle]}>
      <Svg width={SCENE_CELL} height={SCENE_CELL}>
        <Polygon
          points={starPoints(SCENE_CELL / 2, SCENE_CELL / 2, SCENE_CELL * STAR_OUTER_RADIUS * 1.3, SCENE_CELL * STAR_INNER_RADIUS)}
          fill={colour}
          stroke={seamColour}
          strokeWidth={1}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  catcher: { flex: 1, alignItems: 'center', paddingTop: '22%', paddingHorizontal: 20 },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 10,
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
  },
  part: { alignSelf: 'stretch', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  name: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  tip: { fontSize: 16, lineHeight: 22, textAlign: 'center', maxWidth: 260 },
  scene: { borderRadius: 6, overflow: 'hidden' },
  seam: { position: 'absolute', borderRadius: 1.5 },
  star: { position: 'absolute', width: SCENE_CELL, height: SCENE_CELL },
  button: { alignSelf: 'stretch', borderRadius: 16, paddingVertical: 14, alignItems: 'center', overflow: 'hidden', marginTop: 4 },
  buttonFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  buttonText: { fontSize: 17, fontWeight: '800' },
});
