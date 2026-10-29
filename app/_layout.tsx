// Root of the Expo app: one Redux store, in the phone's language, with the
// saved settings and progress, and gesture support for every screen.
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { levels } from '../src/levels/index';
import { logger, logging } from '../src/state/logger';
import { createStore } from '../src/state/store';
import { languageForLocale } from '../src/ui/i18n';
import { useSavedProgress } from '../src/ui/useProgress';
import { useSavedSettings } from '../src/ui/useSettings';

// ?debug in the page address turns logging on, even on the production site.
if (Platform.OS === 'web' && new URLSearchParams(window.location.search).has('debug')) logging.enabled = true;

export default function RootLayout() {
  useEffect(() => logger.info('started', { levels: levels.length }), []);
  const [store] = useState(() => createStore(languageForLocale(getLocales()[0]?.languageTag)));
  useSavedSettings(store);
  useSavedProgress(store);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </Provider>
    </GestureHandlerRootView>
  );
}
