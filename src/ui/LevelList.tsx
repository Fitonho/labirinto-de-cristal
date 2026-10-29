// The levels grouped by chapter, one numbered button each, with the current
// level filled in the accent colour. The levels screen shows it; saved
// progress and chapter pictures come with the level map.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { chapters, levels } from '../levels/index';
import type { Language } from '../state/store';
import { useAppColours } from './AppColours';
import { t, type StringKey } from './i18n';

interface LevelListProps {
  language: Language;
  currentLevelIndex: number;
  onPick: (levelIndex: number) => void;
}

export function LevelList({ language, currentLevelIndex, onPick }: LevelListProps) {
  const appColours = useAppColours();
  const levelButtonColours = { borderColor: appColours.controlBorder, backgroundColor: appColours.control };
  const currentLevelButtonColours = { borderColor: appColours.accent, backgroundColor: appColours.accent };
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {chapters.map((chapter) => (
        <View key={chapter} style={styles.chapter}>
          <Text style={[styles.chapterName, { color: appColours.quiet }]}>{t(language, `chapter.${chapter}` as StringKey)}</Text>
          <View style={styles.levelButtons}>
            {levels.map((level, levelIndex) => {
              if (level.chapter !== chapter) return null;
              const isCurrent = levelIndex === currentLevelIndex;
              return (
                <Pressable
                  key={level.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(language, 'level')} ${level.order}`}
                  accessibilityState={{ selected: isCurrent }}
                  onPress={() => onPick(levelIndex)}
                  style={({ pressed }) => [styles.levelButton, isCurrent ? currentLevelButtonColours : levelButtonColours, pressed && styles.pressed]}
                >
                  <Text style={[styles.levelNumber, { color: isCurrent ? appColours.onAccent : appColours.ink }]}>{level.order}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { gap: 20, paddingBottom: 16 },
  chapter: { gap: 10 },
  chapterName: { fontSize: 15, fontWeight: '600' },
  levelButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  levelButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: { fontSize: 18, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
