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
import type { Colour } from '../core';
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
  /** "Exemplos 2": the chapter and the level's number, under the New label. */
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
              <Text style={[styles.label, { color: appColours.accent }]}>{`${t(language, 'ideaNew')} · ${levelPlace}`.toUpperCase()}</Text>
            </CardPart>
            <CardPart clock={clock} order={1}>
              <Text accessibilityRole="header" style={[styles.name, { color: appColours.ink }]}>
                {levelName}
              </Text>
            </CardPart>
            <CardPart clock={clock} order={2}>
              {idea && <IdeaScene idea={idea} tileColours={tileColours} seamColour={seamColour} playing={open && !reducedMotion} />}
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

/** The little scene's cell size, in points; a scene is four cells wide. */
const SCENE_CELL = 34;
/** Within one loop: when the Pebble starts and stops moving, and when the moved pieces fade out to start again. */
const MOVE_START = 0.15;
const MOVE_END = 0.55;

interface Scene {
  floors: Colour[];
  pebble: { fromCell: number; toCell: number; colourBefore: Colour; colourAfter: Colour };
  /** A box the Pebble pushes one cell, which may carry a portal on its far side. */
  box: { fromCell: number; colour: Colour; carriesPortal: boolean } | null;
  /** A portal that stays on the edge before this cell. */
  portalBeforeCell: number | null;
  star: { cell: number; colour: Colour } | null;
}

const SCENES: Record<LevelIdea, Scene> = {
  push: {
    floors: ['black', 'black', 'black', 'black'],
    pebble: { fromCell: 0, toCell: 1, colourBefore: 'white', colourAfter: 'white' },
    box: { fromCell: 1, colour: 'white', carriesPortal: false },
    portalBeforeCell: null,
    star: null,
  },
  portal: {
    floors: ['black', 'black', 'white', 'white'],
    pebble: { fromCell: 0, toCell: 2, colourBefore: 'white', colourAfter: 'black' },
    box: null,
    portalBeforeCell: 2,
    star: null,
  },
  portalPush: {
    floors: ['black', 'black', 'black', 'black'],
    pebble: { fromCell: 0, toCell: 1, colourBefore: 'white', colourAfter: 'white' },
    box: { fromCell: 1, colour: 'white', carriesPortal: true },
    portalBeforeCell: null,
    star: null,
  },
  crystalColour: {
    floors: ['white', 'white', 'black', 'black'],
    pebble: { fromCell: 0, toCell: 3, colourBefore: 'black', colourAfter: 'white' },
    box: null,
    portalBeforeCell: 2,
    star: { cell: 3, colour: 'white' },
  },
};

interface IdeaSceneProps {
  idea: LevelIdea;
  tileColours: Record<Colour, string>;
  seamColour: string;
  playing: boolean;
}

/** The idea played on four cells: a push, a flip through a portal, a portal carried by a push, or reaching a star. */
function IdeaScene({ idea, tileColours, seamColour, playing }: IdeaSceneProps) {
  const scene = SCENES[idea];
  // One loop of the scene as a share from 0 to 1; a still scene shows its end.
  const progress = useSharedValue(0.7);
  useEffect(() => {
    if (!playing) {
      cancelAnimation(progress);
      progress.value = 0.7;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(withTiming(1, { duration: IDEA_SCENE_DURATION, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(progress);
  }, [playing, progress]);

  const { fromCell, toCell, colourBefore, colourAfter } = scene.pebble;
  const travel = (toCell - fromCell) * SCENE_CELL;
  // The share of the loop when the Pebble's centre crosses the portal, where it flips.
  const crossing =
    scene.portalBeforeCell === null
      ? null
      : MOVE_START + ((MOVE_END - MOVE_START) * (scene.portalBeforeCell - (fromCell + 0.5))) / (toCell - fromCell);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.06, 0.85, 0.95, 1], [0, 1, 1, 0, 0]),
  }));
  const pebbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [MOVE_START, MOVE_END], [0, travel], 'clamp') }],
  }));
  const afterColourStyle = useAnimatedStyle(() => ({
    opacity: crossing === null ? 0 : interpolate(progress.value, [crossing - 0.02, crossing + 0.02], [0, 1], 'clamp'),
  }));
  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [MOVE_START, MOVE_END], [0, SCENE_CELL], 'clamp') }],
  }));
  const starStyle = useAnimatedStyle(() => {
    const burst = interpolate(progress.value, [MOVE_END, MOVE_END + 0.15], [0, 1], 'clamp');
    return { opacity: 1 - burst, transform: [{ scale: 1 + burst * 0.6 }] };
  });

  const pebbleSize = SCENE_CELL * PEBBLE_RADIUS * 2;
  const pebbleOffset = (SCENE_CELL - pebbleSize) / 2;
  const boxInset = SCENE_CELL * BOX_INSET;
  const boxSize = SCENE_CELL - 2 * boxInset;
  const seamStyle = { backgroundColor: seamColour, boxShadow: `0 0 6px ${seamColour}` };
  return (
    <View style={[styles.scene, { width: SCENE_CELL * scene.floors.length, height: SCENE_CELL }]}>
      {scene.floors.map((floor, cellIndex) => (
        <View key={cellIndex} style={{ position: 'absolute', left: cellIndex * SCENE_CELL, top: 0, width: SCENE_CELL, height: SCENE_CELL, backgroundColor: tileColours[floor] }} />
      ))}
      {scene.portalBeforeCell !== null && <View style={[styles.seam, seamStyle, { left: scene.portalBeforeCell * SCENE_CELL - 1.5 }]} />}
      {scene.star && (
        <Animated.View style={[styles.star, { left: scene.star.cell * SCENE_CELL }, starStyle]}>
          <Svg width={SCENE_CELL} height={SCENE_CELL}>
            <Polygon
              points={starPoints(SCENE_CELL / 2, SCENE_CELL / 2, SCENE_CELL * STAR_OUTER_RADIUS * 1.3, SCENE_CELL * STAR_INNER_RADIUS)}
              fill={tileColours[scene.star.colour]}
              stroke={seamColour}
              strokeWidth={1}
            />
          </Svg>
        </Animated.View>
      )}
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        {scene.box && (
          <Animated.View style={[{ position: 'absolute', left: scene.box.fromCell * SCENE_CELL, top: 0, width: SCENE_CELL, height: SCENE_CELL }, boxStyle]}>
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
            {scene.box.carriesPortal && <View style={[styles.seam, seamStyle, { left: SCENE_CELL - 1.5 }]} />}
          </Animated.View>
        )}
        <Animated.View style={[{ position: 'absolute', left: fromCell * SCENE_CELL + pebbleOffset, top: pebbleOffset }, pebbleStyle]}>
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
  seam: { position: 'absolute', top: 3, width: 3, height: SCENE_CELL - 6, borderRadius: 1.5 },
  star: { position: 'absolute', top: 0, width: SCENE_CELL, height: SCENE_CELL },
  button: { alignSelf: 'stretch', borderRadius: 16, paddingVertical: 14, alignItems: 'center', overflow: 'hidden', marginTop: 4 },
  buttonFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  buttonText: { fontSize: 17, fontWeight: '800' },
});
