// The game screen: board, move counter, level picker, undo, restart, the
// language switch, and the move's sound and vibration. All game changes go through the Redux store.
import { useCallback, useEffect, useState } from 'react';
import { PixelRatio, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { levels } from '../src/levels/index';
import { actions, type RootState } from '../src/state/store';
import { Board } from '../src/ui/Board';
import { tileSizeFor } from '../src/ui/boardLayout';
import type { Command } from '../src/ui/commands';
import { t } from '../src/ui/i18n';
import { LevelPicker } from '../src/ui/LevelPicker';
import { palette } from '../src/ui/theme';
import { useHaptics } from '../src/ui/useHaptics';
import { useKeyboardCommands } from '../src/ui/useKeyboardCommands';
import { useSettings } from '../src/ui/useSettings';
import { useSounds } from '../src/ui/useSounds';

export default function GameScreen() {
  const dispatch = useDispatch();
  const { history, events, language, levelIndex } = useSelector((rootState: RootState) => rootState.game);
  const state = history.present;
  const level = levels[levelIndex];
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [pickerVisible, setPickerVisible] = useState(false);
  const { soundOn, vibrationOn, toggleSound, toggleVibration } = useSettings();

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

  const tileSize = tileSizeFor(state, Math.min(screenWidth, 640), screenHeight, PixelRatio.get());
  const moveText = `${t(language, 'moves')}: ${state.moveCount}${level.par ? ` (${t(language, 'par')} ${level.par})` : ''}`;
  const won = state.status === 'won';

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.column}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {t(language, 'title')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => dispatch(actions.setLanguage(language === 'pt' ? 'en' : 'pt'))}
          >
            <Text style={styles.link}>{t(language, 'language')}</Text>
          </Pressable>
        </View>
        <View style={styles.boardArea}>
          <Board state={state} events={events} tileSize={tileSize} onCommand={run} />
        </View>
        <Text accessibilityLiveRegion="polite" style={[styles.status, won && styles.wonStatus]}>
          {won ? `${t(language, 'won')} ${moveText}` : moveText}
        </Text>
        <View style={styles.controls}>
          <ControlButton label={`${t(language, 'level')} ${level.order} ▾`} onPress={() => setPickerVisible(true)} />
          <ControlButton label={t(language, 'undo')} onPress={() => run({ type: 'undo' })} />
          <ControlButton label={t(language, 'reset')} onPress={() => run({ type: 'reset' })} />
        </View>
        <Text style={styles.help}>{t(language, 'help')}</Text>
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

function ControlButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.page },
  column: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: palette.ink },
  link: { color: palette.accent, fontSize: 16 },
  boardArea: { alignItems: 'center' },
  status: { textAlign: 'center', marginVertical: 12, color: palette.quiet, fontSize: 16 },
  wonStatus: { color: palette.accent, fontWeight: '600' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: palette.controlBorder,
    borderRadius: 8,
    backgroundColor: palette.control,
  },
  buttonText: { fontSize: 16, color: palette.ink },
  help: { textAlign: 'center', color: palette.quiet, fontSize: 13.5, marginTop: 16 },
});
