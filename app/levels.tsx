// The levels screen: a full screen over the game, opened by the game's back
// arrow, Android's back button, the result sheet's Levels button and the L
// key. The game stays mounted underneath, so going back shows the board
// exactly as it was. It takes the current level's colours, so going in and
// out never changes colour. Its own back arrow returns to the game until the
// home screen exists.
import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { actions, selectPaletteId, type RootState } from '../src/state/store';
import { AppColoursProvider } from '../src/ui/AppColours';
import { t } from '../src/ui/i18n';
import { IconButton } from '../src/ui/IconButton';
import { LevelList } from '../src/ui/LevelList';
import { appColoursFor, boardPalettes } from '../src/ui/theme';
import { useKeyboardCommands } from '../src/ui/useKeyboardCommands';

/** Back to the game under this screen, or to a fresh game when the page was opened at /levels directly. */
function backToGame() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function LevelsScreen() {
  const dispatch = useDispatch();
  const { language, levelIndex } = useSelector((rootState: RootState) => rootState.game);
  const paletteId = useSelector(selectPaletteId);
  const appColours = useMemo(() => appColoursFor(boardPalettes[paletteId]), [paletteId]);

  const pickLevel = useCallback(
    (pickedLevelIndex: number) => {
      backToGame();
      if (pickedLevelIndex === levelIndex) return;
      // Build the new board on a later frame, so the game screen can come back into view first.
      requestAnimationFrame(() => requestAnimationFrame(() => dispatch(actions.selectLevel(pickedLevelIndex))));
    },
    [dispatch, levelIndex],
  );
  // L, the key that opened this screen, closes it again.
  useKeyboardCommands(
    useCallback((command) => {
      if (command.type !== 'levels') return false;
      backToGame();
      return true;
    }, []),
    Platform.OS === 'web',
  );

  return (
    <AppColoursProvider value={appColours}>
      <SafeAreaView style={[styles.page, { backgroundColor: appColours.page }]}>
        <View style={styles.column}>
          <View style={styles.header}>
            <IconButton icon="back" label={t(language, 'backToGame')} onPress={backToGame} size={44} />
            <Text accessibilityRole="header" style={[styles.heading, { color: appColours.ink }]}>
              {t(language, 'levels')}
            </Text>
          </View>
          <LevelList language={language} currentLevelIndex={levelIndex} onPick={pickLevel} />
        </View>
      </SafeAreaView>
    </AppColoursProvider>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { fontSize: 24, fontWeight: '700' },
});
