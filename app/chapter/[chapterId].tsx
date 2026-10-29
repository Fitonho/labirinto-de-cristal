// One chapter's levels: a picture of each level's board with its number, ✓
// once solved and ★ at par or better. Locked levels are faded with a lock. The
// big button at the bottom plays the level the player is on, or the first
// open one they haven't solved. Its back arrow goes up to the chapters; see
// levelsNavigation.ts.
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';
import { useDispatch } from 'react-redux';
import type { LevelData } from '../../src/core';
import { levels } from '../../src/levels/index';
import { levelMarkFor, levelToPlayIn, type LevelMark } from '../../src/state/levelProgress';
import { actions, type Language } from '../../src/state/store';
import { AppColoursProvider, useAppColours } from '../../src/ui/AppColours';
import { BoardPicture } from '../../src/ui/BoardPicture';
import { t, tFilled, type StringKey } from '../../src/ui/i18n';
import { IconButton, IconShape } from '../../src/ui/IconButton';
import { backToChapters, backToGame } from '../../src/ui/levelsNavigation';
import { starPoints } from '../../src/ui/pieceLooks';
import type { BoardPalette } from '../../src/ui/theme';
import { useKeyboardCommands } from '../../src/ui/useKeyboardCommands';
import { useLevelProgress } from '../../src/ui/useLevelProgress';

const COLUMN_COUNT = 3;
const GRID_GAP = 10;
const PAGE_PADDING = 16;

export default function ChapterScreen() {
  const dispatch = useDispatch();
  const { chapterId, from } = useLocalSearchParams<{ chapterId: string; from?: string }>();
  const { language, levelIndex, currentLevelId, bestMovesByLevelId, palette, appColours, summaries, openLevelIds } = useLevelProgress();
  const summary = summaries.find((chapterSummary) => chapterSummary.chapter === chapterId) ?? summaries[0];
  const levelToPlay = levelToPlayIn(summary, openLevelIds, bestMovesByLevelId, currentLevelId);
  // Measured from the grid itself, so the three columns always fit whatever the page's padding and insets.
  const [gridWidth, setGridWidth] = useState(0);
  const cellWidth = Math.floor((gridWidth - (COLUMN_COUNT - 1) * GRID_GAP) / COLUMN_COUNT);
  const rows = useMemo(() => {
    const levelRows: LevelData[][] = [];
    for (let levelIndexInChapter = 0; levelIndexInChapter < summary.levels.length; levelIndexInChapter += COLUMN_COUNT) {
      levelRows.push(summary.levels.slice(levelIndexInChapter, levelIndexInChapter + COLUMN_COUNT));
    }
    return levelRows;
  }, [summary]);
  const goBack = useCallback(() => backToChapters(from === 'chapters'), [from]);

  const playLevel = useCallback(
    (level: LevelData) => {
      backToGame();
      const pickedLevelIndex = levels.indexOf(level);
      if (pickedLevelIndex === levelIndex) return;
      // Build the new board on a later frame, so the game screen can come back into view first.
      requestAnimationFrame(() => requestAnimationFrame(() => dispatch(actions.selectLevel(pickedLevelIndex))));
    },
    [dispatch, levelIndex],
  );
  // L, the key that opens the levels, closes them again.
  useKeyboardCommands(
    useCallback((command) => {
      if (command.type !== 'levels') return false;
      backToGame();
      return true;
    }, []),
    Platform.OS === 'web',
  );
  // Android's back button does what the back arrow does.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => subscription.remove();
    }, [goBack]),
  );

  const chapterName = t(language, `chapter.${summary.chapter}` as StringKey);
  return (
    <AppColoursProvider value={appColours}>
      <SafeAreaView style={[styles.page, { backgroundColor: appColours.page }]}>
        <View style={styles.column}>
          <View style={styles.header}>
            <IconButton icon="back" label={t(language, 'backToChapters')} onPress={goBack} size={44} />
            <Text accessibilityRole="header" style={[styles.heading, { color: appColours.ink }]}>
              {chapterName}
            </Text>
            <Text style={[styles.chip, { color: appColours.ink, borderColor: appColours.controlBorder, backgroundColor: appColours.control }]}>
              {`${summary.solvedCount} / ${summary.levels.length}`}
            </Text>
          </View>
          <ScrollView contentContainerStyle={styles.grid} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
            {cellWidth > 0 &&
              rows.map((rowLevels) => (
                <View key={rowLevels[0].id} style={styles.gridRow}>
                  {rowLevels.map((level) => (
                    <LevelCell
                      key={level.id}
                      level={level}
                      mark={levelMarkFor(level, bestMovesByLevelId)}
                      open={openLevelIds.has(level.id)}
                      current={level.id === currentLevelId}
                      width={cellWidth}
                      language={language}
                      palette={palette}
                      onPress={playLevel}
                    />
                  ))}
                </View>
              ))}
          </ScrollView>
          <Text style={[styles.legend, { color: appColours.quiet }]}>{t(language, 'levelLegend')}</Text>
          {levelToPlay && (
            <Pressable
              accessibilityRole="button"
              onPress={() => playLevel(levelToPlay)}
              style={({ pressed }) => [styles.playButton, { backgroundColor: appColours.accent }, pressed && styles.pressed]}
            >
              <Text style={[styles.playText, { color: appColours.onAccent }]}>
                {tFilled(language, 'playLevel', { number: levelToPlay.order })}
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </AppColoursProvider>
  );
}

interface LevelCellProps {
  level: LevelData;
  mark: LevelMark;
  open: boolean;
  current: boolean;
  width: number;
  language: Language;
  palette: BoardPalette;
  onPress: (level: LevelData) => void;
}

function LevelCell({ level, mark, open, current, width, language, palette, onPress }: LevelCellProps) {
  const appColours = useAppColours();
  const pictureHeight = Math.round(width * 0.62);
  const stateText = !open ? t(language, 'levelLocked') : mark === 'atPar' ? t(language, 'levelAtPar') : mark === 'solved' ? t(language, 'levelSolved') : '';
  const cellColours = useMemo(
    () => ({
      width,
      borderColor: current ? appColours.accent : appColours.controlBorder,
      backgroundColor: appColours.control,
      borderWidth: current ? 2 : 1,
    }),
    [width, current, appColours],
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[`${t(language, 'level')} ${level.order}`, stateText].filter(Boolean).join(', ')}
      accessibilityState={{ disabled: !open, selected: current }}
      disabled={!open}
      onPress={() => onPress(level)}
      style={({ pressed }) => [styles.cell, cellColours, !open && styles.locked, pressed && styles.pressed]}
    >
      <View style={[styles.cellPicture, { height: pictureHeight }]}>
        <BoardPicture levelData={level} maxWidth={width - 12} maxHeight={pictureHeight} palette={palette} />
      </View>
      <View style={styles.cellLabel}>
        <Text style={[styles.cellNumber, { color: appColours.ink }]}>{level.order}</Text>
        {mark === 'atPar' && (
          // The Beacon's star in the portal colour, outlined so it shows on light pages too.
          <Svg width={15} height={15} viewBox="0 0 16 16">
            <Polygon points={starPoints(8, 8, 7.5, 2.6)} fill={palette.seamColour} stroke={appColours.ink} strokeWidth={0.8} />
          </Svg>
        )}
        {mark === 'solved' && <Text style={[styles.cellMark, { color: appColours.accent }]}>✓</Text>}
        {!open && (
          <Svg width={13} height={13} viewBox="0 0 24 24">
            <IconShape icon="lock" colour={appColours.quiet} />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: PAGE_PADDING, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { flex: 1, fontSize: 24, fontWeight: '700' },
  chip: { fontSize: 14, fontWeight: '600', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3, overflow: 'hidden' },
  grid: { gap: GRID_GAP, paddingBottom: 8 },
  gridRow: { flexDirection: 'row', gap: GRID_GAP },
  cell: { borderRadius: 12, padding: 6, gap: 5, alignItems: 'center' },
  cellPicture: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  cellLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cellNumber: { fontSize: 15, fontWeight: '600' },
  cellMark: { fontSize: 15, fontWeight: '700' },
  locked: { opacity: 0.45 },
  pressed: { opacity: 0.6 },
  legend: { fontSize: 13, textAlign: 'center' },
  playButton: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  playText: { fontSize: 17, fontWeight: '700' },
});
