// Root of the Expo app: one Redux store, in the phone's language, with the
// saved settings and progress, and gesture support for every screen. The game
// is the first screen, with home drawn over it for a returning player; the
// chapters and a chapter's levels open over it. Nothing is drawn until the
// saved progress is read, so the first frame is already the right screen.
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider, useSelector } from 'react-redux';
import { levels } from '../src/levels/index';
import { logger, logging } from '../src/state/logger';
import { createStore, selectPaletteId, type RootState } from '../src/state/store';
import { languageForLocale } from '../src/ui/i18n';
import { appColoursFor, boardPalettes } from '../src/ui/theme';
import { useSavedProgress } from '../src/ui/useProgress';
import { useSavedSettings } from '../src/ui/useSettings';

// ?debug in the page address turns logging on, even on the production site.
if (Platform.OS === 'web' && new URLSearchParams(window.location.search).has('debug')) logging.enabled = true;

/**
 * The screens, on a background in the current level's page colour, so a
 * screen sliding in never shows the default white behind it.
 */
function Screens() {
  const paletteId = useSelector(selectPaletteId);
  const savedLoaded = useSelector((rootState: RootState) => rootState.session.savedLoaded);
  const pageColour = useMemo(() => appColoursFor(boardPalettes[paletteId]).page, [paletteId]);
  // Reading the saved file takes a few milliseconds; until then the page stays plain.
  if (!savedLoaded) return <View style={{ flex: 1, backgroundColor: pageColour }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: pageColour } }}>
      {/* The levels sit one step up from the game, so they come in from the side the back arrow points to. */}
      <Stack.Screen name="levels" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="chapter/[chapterId]" options={{ animation: 'slide_from_left' }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => logger.info('started', { levels: levels.length }), []);
  const [store] = useState(() => createStore(languageForLocale(getLocales()[0]?.languageTag)));
  useSavedSettings(store);
  useSavedProgress(store);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <Screens />
      </Provider>
    </GestureHandlerRootView>
  );
}
