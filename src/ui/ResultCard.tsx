// The card that rises over the touch area, covering it exactly, once a level is won: the moves, a
// par badge, the best, a big Next button and Play again, Undo and Levels. It is
// always mounted, hidden below the screen, so the winning move mounts nothing;
// the rise and the badge stamp run on shared values with UI-thread delays.
// Colours come from the level's palette.
import { memo, useLayoutEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg from 'react-native-svg';
import type { Colour } from '../core';
import type { Language } from '../state/store';
import { useAppColours } from './AppColours';
import { t } from './i18n';
import { IconShape, type IconKind } from './IconButton';
import {
  PAR_BADGE_DELAY,
  PAR_BADGE_DURATION,
  RESULT_CARD_DELAY,
  RESULT_CARD_DROP_DURATION,
  RESULT_CARD_INPUT_GUARD,
  RESULT_CARD_RISE_DURATION,
} from './motion';
import { PEEK_RING_COLOUR, RESULT_CARD_SHADOW } from './theme';
import type { WinResult } from './winResult';

interface ResultCardProps {
  won: boolean;
  /** The win to show; kept on screen while the card drops away. */
  result: WinResult | null;
  isLastLevel: boolean;
  language: Language;
  /** The glow round the under-par badge: the level's door seam colour. */
  seamColour: string;
  /** The two colours the next level will draw, shown as a dot on Next, or null with a favourite palette. */
  nextTileColours: Record<Colour, string> | null;
  /** Goes up by one when the player taps or swipes during the win moment, which lands the card at once. */
  skipCount: number;
  onNext: () => void;
  onPlayAgain: () => void;
  onUndo: () => void;
  onLevels: () => void;
}

export const ResultCard = memo(function ResultCard({
  won,
  result,
  isLastLevel,
  language,
  seamColour,
  nextTileColours,
  skipCount,
  onNext,
  onPlayAgain,
  onUndo,
  onLevels,
}: ResultCardProps) {
  const appColours = useAppColours();
  const rise = useSharedValue(0); // 0 hidden below the screen, 1 landed
  const badgeStamp = useSharedValue(0);
  const cardHeight = useSharedValue(400);
  // When the buttons start taking touches, in Date.now() time.
  const pressableAfter = useRef(0);
  const shownResult = useRef(result);
  if (result) shownResult.current = result;

  // A layout effect starts the rise in the same commit as the winning move, so its delay counts from the move.
  useLayoutEffect(() => {
    if (won) {
      rise.value = withDelay(RESULT_CARD_DELAY, withTiming(1, { duration: RESULT_CARD_RISE_DURATION, easing: Easing.out(Easing.back(1.4)) }));
      badgeStamp.value = 0;
      badgeStamp.value = withDelay(
        RESULT_CARD_DELAY + PAR_BADGE_DELAY,
        withTiming(1, { duration: PAR_BADGE_DURATION, easing: Easing.out(Easing.back(2)) }),
      );
      pressableAfter.current = Date.now() + RESULT_CARD_DELAY + RESULT_CARD_RISE_DURATION + RESULT_CARD_INPUT_GUARD;
    } else {
      rise.value = withTiming(0, { duration: RESULT_CARD_DROP_DURATION });
    }
  }, [won, rise, badgeStamp]);

  useLayoutEffect(() => {
    if (!won || skipCount === 0) return;
    rise.value = 1;
    badgeStamp.value = 1;
    pressableAfter.current = Date.now() + RESULT_CARD_INPUT_GUARD;
    // Only a new skip lands the card; a win itself starts the rise above.
  }, [skipCount]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: rise.value === 0 ? 0 : 1,
    transform: [{ translateY: (1 - rise.value) * (cardHeight.value + 24) }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, badgeStamp.value * 2),
    transform: [{ scale: 1.6 - 0.6 * badgeStamp.value }],
  }));
  const onLayout = (layoutEvent: LayoutChangeEvent) => {
    cardHeight.value = layoutEvent.nativeEvent.layout.height;
  };

  // Drops the card away, then acts. A press before the card has settled is ignored.
  const pressWith = (action: () => void, dropsCard: boolean) => () => {
    if (Date.now() < pressableAfter.current) return;
    if (dropsCard) rise.value = withTiming(0, { duration: RESULT_CARD_DROP_DURATION });
    action();
  };

  const shown = shownResult.current;
  if (!shown) return null;
  const parts: string[] = [];
  if (shown.par !== null) parts.push(`${t(language, 'par')} ${shown.par}`);
  if (shown.standingBestMoves !== null) parts.push(`${t(language, 'best')} ${shown.standingBestMoves}`);
  const badgeLooks = {
    onPar: { text: t(language, 'onPar'), box: { backgroundColor: appColours.accent }, ink: appColours.onAccent },
    underPar: {
      text: t(language, 'underPar'),
      box: { backgroundColor: appColours.ink, borderColor: seamColour, borderWidth: 2, boxShadow: `0 0 8px ${seamColour}` },
      ink: appColours.page,
    },
    overPar: {
      text: t(language, 'overPar').replace('{count}', String(shown.movesOverPar)),
      box: { borderColor: appColours.controlBorder, borderWidth: 1 },
      ink: appColours.quiet,
    },
  };
  const badge = shown.parBadge ? badgeLooks[shown.parBadge] : null;

  return (
    <Animated.View
      pointerEvents={won ? 'auto' : 'none'}
      onLayout={onLayout}
      style={[styles.card, { backgroundColor: appColours.control, borderColor: appColours.controlBorder }, cardStyle]}
    >
      <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.title, { color: appColours.ink }]}>
        {t(language, isLastLevel ? 'allDone' : 'won')}
      </Text>
      <View style={styles.scoreRow}>
        <View style={styles.moveFigure}>
          <Text style={[styles.moveNumber, { color: appColours.ink }]}>{shown.moveCount}</Text>
          <Text style={[styles.moveUnit, { color: appColours.quiet }]}>{t(language, 'movesUnit')}</Text>
        </View>
        {badge && (
          <Animated.View style={[styles.badge, badge.box, badgeStyle]}>
            <Text style={[styles.badgeText, { color: badge.ink }]}>{badge.text}</Text>
          </Animated.View>
        )}
      </View>
      {(parts.length > 0 || shown.isNewBest) && (
        <Text style={[styles.details, { color: appColours.quiet }]}>
          {parts.join(' · ')}
          {shown.isNewBest && (
            <Text style={[styles.newBest, { color: appColours.accent }]}>{`${parts.length > 0 ? ' · ' : ''}${t(language, 'newBest')}`}</Text>
          )}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={pressWith(isLastLevel ? onLevels : onNext, !isLastLevel)}
        style={({ pressed }) => [styles.primary, { backgroundColor: appColours.accent }, pressed && styles.pressed]}
      >
        {!isLastLevel && nextTileColours && (
          // A peek at the next level's colours: its dark half over its light one.
          <View style={[styles.peek, { backgroundColor: nextTileColours.white }]}>
            <View style={[styles.peekHalf, { backgroundColor: nextTileColours.black }]} />
          </View>
        )}
        <Text style={[styles.primaryText, { color: appColours.onAccent }]}>
          {isLastLevel ? t(language, 'backToLevels') : `${t(language, 'nextLevel')} →`}
        </Text>
      </Pressable>
      <View style={styles.secondaryRow}>
        <SecondaryButton icon="restart" label={t(language, 'playAgain')} onPress={pressWith(onPlayAgain, true)} />
        <SecondaryButton icon="undo" label={t(language, 'undo')} onPress={pressWith(onUndo, true)} />
        <SecondaryButton icon="levels" label={t(language, 'levels')} onPress={pressWith(onLevels, false)} />
      </View>
    </Animated.View>
  );
});

function SecondaryButton({ icon, label, onPress }: { icon: IconKind; label: string; onPress: () => void }) {
  const appColours = useAppColours();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, { borderColor: appColours.controlBorder, backgroundColor: appColours.page }, pressed && styles.pressed]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <IconShape icon={icon} colour={appColours.ink} />
      </Svg>
      <Text style={[styles.secondaryText, { color: appColours.ink }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    justifyContent: 'space-between',
    boxShadow: RESULT_CARD_SHADOW,
  },
  title: { fontSize: 18, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  moveFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  moveNumber: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  moveUnit: { fontSize: 15 },
  badge: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  badgeText: { fontSize: 14, fontWeight: '800' },
  details: { fontSize: 15 },
  newBest: { fontWeight: '700' },
  primary: { borderRadius: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  primaryText: { fontSize: 18, fontWeight: '800' },
  peek: { width: 18, height: 18, borderRadius: 9, overflow: 'hidden', borderWidth: 1.5, borderColor: PEEK_RING_COLOUR, transform: [{ rotate: '45deg' }] },
  peekHalf: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%' },
  secondaryRow: { flexDirection: 'row', gap: 8 },
  secondary: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 6, alignItems: 'center', gap: 2 },
  secondaryText: { fontSize: 13 },
  pressed: { opacity: 0.6 },
});
