// Root of the Expo app: one Redux store, in the phone's language, and gesture
// support for every screen.
import { getLocales } from 'expo-localization';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { createStore } from '../src/state/store';
import { languageForLocale } from '../src/ui/i18n';

export default function RootLayout() {
  const [store] = useState(() => createStore(languageForLocale(getLocales()[0]?.languageTag)));
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </Provider>
    </GestureHandlerRootView>
  );
}
