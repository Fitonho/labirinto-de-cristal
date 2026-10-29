// The chapters screen: one card per chapter with a picture of its first board,
// what it teaches, how much of it is solved and its stars. A locked chapter
// says how many more solves open it. Reset progress sits quietly at the bottom,
// behind a confirm step. It takes the current level's colours. Its back arrow
// returns to the game until the home screen exists; see levelsNavigation.ts.
import { useCallback, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import type { ChapterSummary } from '../src/state/levelProgress';
import { progressActions } from '../src/state/progress';
import type { Language } from '../src/state/store';
import { AppColoursProvider, useAppColours } from '../src/ui/AppColours';
import { BoardPicture } from '../src/ui/BoardPicture';
import { t, tFilled, type StringKey } from '../src/ui/i18n';
import { IconButton } from '../src/ui/IconButton';
import { backToGame, openChapterFromChapters } from '../src/ui/levelsNavigation';
import { PickerSheet, SheetButton } from '../src/ui/PickerSheet';
import type { BoardPalette } from '../src/ui/theme';
import { useKeyboardCommands } from '../src/ui/useKeyboardCommands';
import { useLevelProgress } from '../src/ui/useLevelProgress';

const PICTURE_WIDTH = 72;
const PICTURE_HEIGHT = 64;

export default function ChaptersScreen() {
  const dispatch = useDispatch();
  const { language, appColours, palette, summaries } = useLevelProgress();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const solvedCount = summaries.reduce((total, summary) => total + summary.solvedCount, 0);
  const levelCount = summaries.reduce((total, summary) => total + summary.levels.length, 0);
  const starCount = summaries.reduce((total, summary) => total + summary.starCount, 0);
  const parCount = summaries.reduce((total, summary) => total + summary.parCount, 0);

  // L, the key that opens the levels, closes them again.
  useKeyboardCommands(
    useCallback((command) => {
      if (command.type !== 'levels') return false;
      backToGame();
      return true;
    }, []),
    Platform.OS === 'web' && !confirmVisible,
  );
  // Android's back button does what the back arrow does.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        backToGame();
        return true;
      });
      return () => subscription.remove();
    }, []),
  );

  return (
    <AppColoursProvider value={appColours}>
      <SafeAreaView style={[styles.page, { backgroundColor: appColours.page }]}>
        <View style={styles.column}>
          <View style={styles.header}>
            <IconButton icon="back" label={t(language, 'backToGame')} onPress={backToGame} size={44} />
            <Text accessibilityRole="header" style={[styles.heading, { color: appColours.ink }]}>
              {t(language, 'chapters')}
            </Text>
            {parCount > 0 && (
              <Text
                accessibilityLabel={tFilled(language, 'starsLabel', { count: starCount })}
                style={[styles.chip, { color: appColours.ink, borderColor: appColours.controlBorder, backgroundColor: appColours.control }]}
              >
                {`★ ${starCount} / ${parCount}`}
              </Text>
            )}
          </View>
          <ScrollView contentContainerStyle={styles.cards}>
            {summaries.map((summary) => (
              <ChapterCard key={summary.chapter} summary={summary} language={language} palette={palette} />
            ))}
          </ScrollView>
          <View style={[styles.footer, { borderColor: appColours.controlBorder }]}>
            <Text style={[styles.footerText, { color: appColours.quiet }]}>
              {tFilled(language, 'levelsSolved', { solved: solvedCount, total: levelCount })}
            </Text>
            {solvedCount > 0 && (
              <Pressable accessibilityRole="button" onPress={() => setConfirmVisible(true)} hitSlop={8}>
                <Text style={[styles.footerText, { color: appColours.accent }]}>{t(language, 'resetProgress')}</Text>
              </Pressable>
            )}
          </View>
        </View>
        <PickerSheet
          visible={confirmVisible}
          heading={t(language, 'resetProgressQuestion')}
          onBackdropPress={() => setConfirmVisible(false)}
          onRequestClose={() => setConfirmVisible(false)}
          buttons={
            <>
              <SheetButton label={t(language, 'cancel')} onPress={() => setConfirmVisible(false)} />
              <SheetButton
                label={t(language, 'resetProgressConfirm')}
                emphasised
                onPress={() => {
                  dispatch(progressActions.resetProgress());
                  setConfirmVisible(false);
                }}
              />
            </>
          }
        >
          <Text style={[styles.confirmText, { color: appColours.ink }]}>
            {tFilled(language, 'resetProgressDetail', { solved: solvedCount, stars: starCount })}
          </Text>
        </PickerSheet>
      </SafeAreaView>
    </AppColoursProvider>
  );
}

interface ChapterCardProps {
  summary: ChapterSummary;
  language: Language;
  palette: BoardPalette;
}

function ChapterCard({ summary, language, palette }: ChapterCardProps) {
  const appColours = useAppColours();
  const chapterName = t(language, `chapter.${summary.chapter}` as StringKey);
  const solvedText = tFilled(language, 'solvedOfTotal', { solved: summary.solvedCount, total: summary.levels.length });
  const starsText = summary.parCount > 0 ? `★ ${summary.starCount}` : t(language, 'noParsYet');
  const lockedText = summary.previousChapter
    ? tFilled(language, 'chapterLocked', {
        count: summary.solvesToOpenCount,
        chapter: t(language, `chapter.${summary.previousChapter}` as StringKey),
      })
    : '';
  const solvedShare = summary.levels.length > 0 ? summary.solvedCount / summary.levels.length : 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${chapterName}, ${summary.open ? solvedText : lockedText}`}
      accessibilityState={{ disabled: !summary.open }}
      disabled={!summary.open}
      onPress={() => openChapterFromChapters(summary.chapter)}
      style={({ pressed }) => [
        styles.card,
        { borderColor: appColours.controlBorder, backgroundColor: appColours.control },
        !summary.open && styles.locked,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.picture}>
        <BoardPicture levelData={summary.levels[0]} maxWidth={PICTURE_WIDTH} maxHeight={PICTURE_HEIGHT} palette={palette} />
      </View>
      <View style={styles.cardText}>
        <Text style={[styles.chapterName, { color: appColours.ink }]}>{chapterName}</Text>
        <Text style={[styles.cardLine, { color: appColours.quiet }]}>{t(language, `chapterIdea.${summary.chapter}` as StringKey)}</Text>
        <Text style={[styles.cardLine, { color: appColours.quiet }]}>{summary.open ? `${solvedText} · ${starsText}` : lockedText}</Text>
        <View style={[styles.bar, { backgroundColor: appColours.touchPadLine }]}>
          <View style={[styles.barFill, { width: `${Math.round(solvedShare * 100)}%`, backgroundColor: appColours.accent }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { flex: 1, fontSize: 24, fontWeight: '700' },
  chip: { fontSize: 14, fontWeight: '600', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  cards: { gap: 12, paddingBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderRadius: 16, padding: 12 },
  locked: { opacity: 0.5 },
  pressed: { opacity: 0.6 },
  picture: { width: PICTURE_WIDTH, height: PICTURE_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1, gap: 3 },
  chapterName: { fontSize: 18, fontWeight: '700' },
  cardLine: { fontSize: 13.5 },
  bar: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  barFill: { height: '100%', borderRadius: 3 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 10 },
  footerText: { fontSize: 14 },
  confirmText: { fontSize: 15, lineHeight: 21 },
});
