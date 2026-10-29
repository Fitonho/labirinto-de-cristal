// The home screen, at the top of the screens: the game's name, a picture of
// the board exactly as the player left it with the Pebble blinking on it,
// where that board is, Continue and the chapters. Sound, colours and ⋯ stay
// in the corner, as on the game screen. It is drawn over the game screen, whose
// board is already built underneath, so Continue only slides it away to the
// left. Its colours are the level's, so Continue never changes colour.
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { GameState, LevelData } from '../core';
import type { Language } from '../state/store';
import { useAppColours } from './AppColours';
import { BoardPicture } from './BoardPicture';
import { boardPictureShapesForState, pictureTileSizeForGrid } from './boardPicture';
import { levelNameFor, t, tFilled, type StringKey } from './i18n';
import { IconButton } from './IconButton';
import type { BoardPalette } from './theme';

/** How long Continue takes to slide home away, in milliseconds. */
export const HOME_EXIT_DURATION = 280;
/** The picture never grows past this, so a tiny level doesn't fill a tablet. */
const PICTURE_MAX_WIDTH = 360;
/** Room kept under the picture for the line that says where the board is. */
const PLACE_LINE_HEIGHT = 40;
/** The Pebble blinks every few seconds, like it does on the board. */
const BLINK_INTERVAL = 3600;

interface HomeProps {
  open: boolean;
  exit: 'slide' | 'instant';
  /** The board as it stands; null while home is closed, so a move never redraws the hidden picture. */
  state: GameState | null;
  level: LevelData;
  language: Language;
  palette: BoardPalette;
  starCount: number;
  parCount: number;
  allSolved: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onOpenColours: () => void;
  onOpenMore: () => void;
  onContinue: () => void;
  onOpenChapters: () => void;
}

export const Home = memo(function Home({
  open,
  exit,
  state,
  level,
  language,
  palette,
  starCount,
  parCount,
  allSolved,
  soundOn,
  onToggleSound,
  onOpenColours,
  onOpenMore,
  onContinue,
  onOpenChapters,
}: HomeProps) {
  const appColours = useAppColours();
  const { width: screenWidth } = useWindowDimensions();
  // Kept while home slides away, so the picture doesn't vanish halfway.
  const [shownState, setShownState] = useState(state);
  if (state && state !== shownState) setShownState(state);
  const awayShare = useSharedValue(open ? 0 : 1); // 0 on screen, 1 slid off to the left
  useEffect(() => {
    if (open) awayShare.value = 0;
    else if (exit === 'slide') awayShare.value = withTiming(1, { duration: HOME_EXIT_DURATION, easing: Easing.in(Easing.cubic) });
    else awayShare.value = 1;
  }, [open, exit, awayShare]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -awayShare.value * screenWidth }] }));

  const chapterName = t(language, `chapter.${level.chapter}` as StringKey);
  const moveCount = shownState?.moveCount ?? 0;
  const placeParts = [chapterName, `${level.order} · ${levelNameFor(language, level.id, level.order)}`];
  if (moveCount > 0) placeParts.push(`${moveCount} ${t(language, moveCount === 1 ? 'moveUnit' : 'movesUnit')}`);
  const pageStyle = { backgroundColor: appColours.page };

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
      style={[StyleSheet.absoluteFill, pageStyle, slideStyle]}
    >
      <SafeAreaView style={styles.page}>
        <View style={styles.column}>
          <View style={styles.header}>
            {parCount > 0 && (
              <Text
                accessibilityLabel={tFilled(language, 'starsLabel', { count: starCount })}
                style={[styles.chip, { color: appColours.ink, borderColor: appColours.controlBorder, backgroundColor: appColours.control }]}
              >
                {`★ ${starCount} / ${parCount}`}
              </Text>
            )}
            <View style={styles.headerGap} />
            <IconButton icon="sound" label={t(language, 'sound')} switchedOn={soundOn} onPress={onToggleSound} size={40} />
            <IconButton icon="colours" label={t(language, 'colours')} onPress={onOpenColours} size={40} />
            <IconButton icon="more" label={t(language, 'moreOptions')} onPress={onOpenMore} size={40} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: appColours.ink }]}>
            {t(language, 'title')}
          </Text>
          {shownState && <LeftBoard state={shownState} level={level} palette={palette} blinking={open} placeText={placeParts.join(' · ')} />}
          {allSolved && <Text style={[styles.allSolved, { color: appColours.accent }]}>{t(language, 'everythingSolved')}</Text>}
          <View style={styles.actions}>
            <HomeButton label={t(language, allSolved ? 'chapters' : 'continue')} emphasised onPress={allSolved ? onOpenChapters : onContinue} />
            <HomeButton label={t(language, allSolved ? 'continue' : 'levels')} onPress={allSolved ? onContinue : onOpenChapters} />
          </View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
});

interface LeftBoardProps {
  state: GameState;
  level: LevelData;
  palette: BoardPalette;
  blinking: boolean;
  placeText: string;
}

/** The board the player left, as one still picture, with the Pebble's eyes drawn over it so they can blink. */
function LeftBoard({ state, level, palette, blinking, placeText }: LeftBoardProps) {
  const appColours = useAppColours();
  const [areaSize, setAreaSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setAreaSize({ width, height });
  };
  const maxWidth = Math.min(areaSize.width, PICTURE_MAX_WIDTH);
  const maxHeight = Math.max(0, areaSize.height - PLACE_LINE_HEIGHT);
  const shapes = useMemo(
    () => boardPictureShapesForState(state, pictureTileSizeForGrid(state.columnCount, state.rowCount, maxWidth, maxHeight)),
    [state, maxWidth, maxHeight],
  );
  const blink = useSharedValue(0);
  useEffect(() => {
    if (!blinking) {
      cancelAnimation(blink);
      blink.value = 0;
      return;
    }
    blink.value = withRepeat(
      withSequence(withDelay(BLINK_INTERVAL, withTiming(1, { duration: 70 })), withTiming(0, { duration: 90 })),
      -1,
    );
    return () => cancelAnimation(blink);
  }, [blinking, blink]);
  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - 0.83 * blink.value }] }));

  const { centreX, centreY, radius } = shapes.pebble;
  const eyeHalfWidth = radius * 0.11;
  const eyeHalfHeight = radius * 0.24;
  const eyeColour = palette.tileColours[shapes.floorColour];
  return (
    <View style={styles.boardArea} onLayout={onLayout}>
      {maxWidth > 0 && maxHeight > 0 && (
        <View style={{ boxShadow: `0 0 0 1px ${appColours.boardEdge}, 0 2px 8px ${appColours.boardEdge}` }}>
          <BoardPicture levelData={level} state={state} maxWidth={maxWidth} maxHeight={maxHeight} palette={palette} />
          {radius >= 6 &&
            [centreX - radius * 0.32, centreX + radius * 0.32].map((eyeCentreLeft) => (
              <Animated.View
                key={eyeCentreLeft}
                pointerEvents="none"
                style={[
                  styles.eye,
                  {
                    left: eyeCentreLeft - eyeHalfWidth,
                    top: centreY - radius * 0.08 - eyeHalfHeight,
                    width: eyeHalfWidth * 2,
                    height: eyeHalfHeight * 2,
                    borderRadius: eyeHalfWidth,
                    backgroundColor: eyeColour,
                  },
                  eyeStyle,
                ]}
              />
            ))}
        </View>
      )}
      <Text numberOfLines={1} style={[styles.place, { color: appColours.quiet }]}>
        {placeText}
      </Text>
    </View>
  );
}

function HomeButton({ label, emphasised = false, onPress }: { label: string; emphasised?: boolean; onPress: () => void }) {
  const appColours = useAppColours();
  const colours = emphasised
    ? { backgroundColor: appColours.accent, borderColor: appColours.accent }
    : { backgroundColor: appColours.control, borderColor: appColours.controlBorder };
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.button, colours, pressed && styles.pressed]}>
      <Text style={[emphasised ? styles.primaryText : styles.secondaryText, { color: emphasised ? appColours.onAccent : appColours.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerGap: { flex: 1 },
  chip: { fontSize: 14, fontWeight: '600', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  title: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  boardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  eye: { position: 'absolute' },
  place: { fontSize: 15, textAlign: 'center' },
  allSolved: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  actions: { gap: 10 },
  button: { borderRadius: 16, borderWidth: 1, paddingVertical: 15, alignItems: 'center' },
  primaryText: { fontSize: 18, fontWeight: '800' },
  secondaryText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
