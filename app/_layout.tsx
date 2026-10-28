// Root of the Expo app: one Redux store and gesture support for every screen.
import { Stack } from 'expo-router';
import { useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { createStore } from '../src/state/store';

export default function RootLayout() {
  const [store] = useState(() => createStore('pt'));
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <Stack screenOptions={{ headerShown: false }} />
      </Provider>
    </GestureHandlerRootView>
  );
}
