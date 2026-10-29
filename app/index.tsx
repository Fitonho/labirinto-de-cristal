// The game screen: the switches and level picker on top, the board, then
// Undo, the move counter and Restart over the touch area. Plays the move's
// sound and vibration. All game changes go through the Redux store.
import { useCallback, useEffect, useState } from 'react';
import { PixelRatio, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { levels } from '../src/levels/index';
import { actions, type RootState } from '../src/state/store';
import { Board } from '../src/ui/Board';
import { tileSizeFor } from '../src/ui/boardLayout';
import type { Command } from '../src/ui/commands';
import { t } from '../src/ui/i18n';
import { IconButton } from '../src/ui/IconButton';
import { LevelPicker } from '../src/ui/LevelPicker';
import { palette } from '../src/ui/theme';
import { TouchPad } from '../src/ui/TouchPad';
import { useHaptics } from '../src/ui/useHaptics';
import { useKeyboardCommands } from '../src/ui/useKeyboardCommands';
import { useSettings } from '../src/ui/useSettings';
import { useSounds } from '../src/ui/useSounds';

/**
 * Height kept free of the board for everything else: the header, the Undo and
 * Restart row, the smallest touch area, and the padding and gaps between them.
 */
const CONTROLS_HEIGHT = 330;
/** The web's keyboard help line under the touch area. */
const HELP_HEIGHT = 48;

export default function GameScreen() {
  const dispatch = useDispatch();
  const { history, events, language, levelIndex } = useSelector((rootState: RootState) => rootState.game);
  const state = history.present;
  const level = levels[levelIndex];
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [pickerVisible, setPickerVisible] = useState(false);
  const { soundOn, vibrationOn, tapMovesOn, toggleSound, toggleVibration, toggleTapMoves } = useSettings();

  const run = useCallback(
    (command: Command) => {
      if (command.type === 'move') dispatch(actions.move(command.direction));
      if (command.type === 'undo') dispatch(actions.undo());
      if (command.type === 'reset') dispatch(actions.reset());
      if (command.type === 'toggleSound') toggleSound();
      if (command.type === 'toggleVibration') toggleVibration();
    },
    [dispatch, toggleSound, toggleVibration],
  );
  useKeyboardCommands(run, !pickerVisible);
  useHaptics(vibrationOn);
  useSounds(soundOn);
  useEffect(() => {
    // Screen readers and translators on the web read the page language.
    if (Platform.OS === 'web') document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
  }, [language]);

  const safeAreaInsets = useSafeAreaInsets();
  const reservedHeight = CONTROLS_HEIGHT + (Platform.OS === 'web' ? HELP_HEIGHT : 0) + safeAreaInsets.top + safeAreaInsets.bottom;
  const tileSize = tileSizeFor(state, Math.min(screenWidth, 640), screenHeight, PixelRatio.get(), reservedHeight);
  const moveText = `${t(language, 'moves')}: ${state.moveCount}${level.par ? ` (${t(language, 'par')} ${level.par})` : ''}`;
  const won = state.status === 'won';

  const hint = state.moveCount === 0 ? t(language, tapMovesOn ? 'hintTapOrSwipe' : 'hintSwipe') : null;

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text accessibilityRole="header" style={styles.title}>
              {t(language, 'title')}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => setPickerVisible(true)} hitSlop={8}>
              <Text style={styles.link}>{`${t(language, 'level')} ${level.order} ▾`}</Text>
            </Pressable>
          </View>
          <View style={styles.switches}>
            <IconButton icon="sound" label={t(language, 'sound')} switchedOn={soundOn} onPress={toggleSound} size={36} />
            {/* The web never vibrates, so it has no vibration switch. */}
            {Platform.OS !== 'web' && (
              <IconButton
                icon="vibration"
                label={t(language, 'vibration')}
                switchedOn={vibrationOn}
                onPress={toggleVibration}
                size={36}
              />
            )}
            <IconButton icon="tapMoves" label={t(language, 'tapMoves')} switchedOn={tapMovesOn} onPress={toggleTapMoves} size={36} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(language, 'language')}
              onPress={() => dispatch(actions.setLanguage(language === 'pt' ? 'en' : 'pt'))}
              hitSlop={4}
              style={({ pressed }) => [styles.languageButton, pressed && styles.pressed]}
            >
              <Text style={styles.languageText}>{t(language, 'languageShort')}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.boardArea}>
          <Board state={state} events={events} tileSize={tileSize} onCommand={run} />
        </View>
        {/* Undo and Restart sit at the top of the touch area, away from where a thumb rests while tapping.
            Undo, pressed far more often, is on the right, under most players' thumb. */}
        <View style={styles.statusRow}>
          <IconButton icon="restart" label={t(language, 'reset')} onPress={() => run({ type: 'reset' })} size={48} />
          <Text accessibilityLiveRegion="polite" style={[styles.status, won && styles.wonStatus]}>
            {won ? `${t(language, 'won')} ${moveText}` : moveText}
          </Text>
          <IconButton icon="undo" label={t(language, 'undo')} onPress={() => run({ type: 'undo' })} size={48} />
        </View>
        <TouchPad tapMovesOn={tapMovesOn} hint={hint} label={t(language, 'touchArea')} onCommand={run} />
        {Platform.OS === 'web' && <Text style={styles.help}>{t(language, 'help')}</Text>}
      </View>
      <LevelPicker
        visible={pickerVisible}
        language={language}
        currentLevelIndex={levelIndex}
        onClose={() => setPickerVisible(false)}
        onPick={(pickedLevelIndex) => {
          // Close the picker first and build the new board on a later frame. Building it redraws every tile,
          // and doing that in the same frame held the picker on screen after the tap.
          setPickerVisible(false);
          requestAnimationFrame(() => requestAnimationFrame(() => dispatch(actions.selectLevel(pickedLevelIndex))));
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.page },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  titleBlock: { flexShrink: 1, gap: 2 },
  title: { fontSize: 20, fontWeight: '700', color: palette.ink },
  link: { color: palette.accent, fontSize: 16 },
  switches: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  languageButton: {
    height: 36,
    minWidth: 36,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.controlBorder,
    backgroundColor: palette.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageText: { fontSize: 13, fontWeight: '600', color: palette.ink },
  pressed: { opacity: 0.6 },
  boardArea: { alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  status: { flex: 1, textAlign: 'center', color: palette.quiet, fontSize: 16 },
  wonStatus: { color: palette.accent, fontWeight: '600' },
  help: { textAlign: 'center', color: palette.quiet, fontSize: 13.5 },
});
