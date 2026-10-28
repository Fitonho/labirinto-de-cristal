// The game screen.
import { Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { levels } from '../src/levels/index';
import type { RootState } from '../src/state/store';

export default function GameScreen() {
  const levelIndex = useSelector((state: RootState) => state.game.levelIndex);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{levels[levelIndex].id}</Text>
    </View>
  );
}
