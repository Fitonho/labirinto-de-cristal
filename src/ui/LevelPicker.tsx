// A list of levels grouped by chapter, shown over the game.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { chapters, levels } from '../levels/index';
import type { Language } from '../state/store';
import { useAppColours } from './AppColours';
import { t, type StringKey } from './i18n';
import { PickerSheet, SheetButton } from './PickerSheet';

interface LevelPickerProps {
  visible: boolean;
  language: Language;
  currentLevelIndex: number;
  onPick: (levelIndex: number) => void;
  onClose: () => void;
}

export function LevelPicker({ visible, language, currentLevelIndex, onPick, onClose }: LevelPickerProps) {
  const appColours = useAppColours();
  const levelButtonColours = { borderColor: appColours.controlBorder, backgroundColor: appColours.control };
  const currentLevelButtonColours = { borderColor: appColours.accent, backgroundColor: appColours.accent };
  return (
    <PickerSheet
      visible={visible}
      heading={t(language, 'chooseLevel')}
      onBackdropPress={onClose}
      onRequestClose={onClose}
      buttons={<SheetButton label={t(language, 'close')} onPress={onClose} />}
    >
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
                  onPress={() => onPick(levelIndex)}
                  style={[styles.levelButton, isCurrent ? currentLevelButtonColours : levelButtonColours]}
                >
                  <Text
                    style={[
                      styles.levelNumber,
                      { color: isCurrent ? appColours.onAccent : appColours.ink },
                      isCurrent && styles.currentLevelNumber,
                    ]}
                  >
                    {level.order}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  chapter: { marginTop: 8 },
  chapterName: { marginBottom: 6 },
  levelButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: { fontSize: 16 },
  currentLevelNumber: { fontWeight: '600' },
});
