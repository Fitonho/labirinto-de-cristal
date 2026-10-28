// A list of levels grouped by chapter, shown over the game. Stands in for the
// web <select>, which React Native does not have.
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { chapters, levels } from '../levels/index';
import type { Language } from '../state/store';
import { t, type StringKey } from './i18n';
import { palette } from './theme';

interface LevelPickerProps {
  visible: boolean;
  language: Language;
  currentLevelIndex: number;
  onPick: (levelIndex: number) => void;
  onClose: () => void;
}

export function LevelPicker({ visible, language, currentLevelIndex, onPick, onClose }: LevelPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.heading}>{t(language, 'chooseLevel')}</Text>
          <ScrollView>
            {chapters.map((chapter) => (
              <View key={chapter} style={styles.chapter}>
                <Text style={styles.chapterName}>{t(language, `chapter.${chapter}` as StringKey)}</Text>
                <View style={styles.levelButtons}>
                  {levels.map((level, levelIndex) =>
                    level.chapter !== chapter ? null : (
                      <Pressable
                        key={level.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${t(language, 'level')} ${level.order}`}
                        onPress={() => onPick(levelIndex)}
                        style={[styles.levelButton, levelIndex === currentLevelIndex && styles.currentLevelButton]}
                      >
                        <Text style={[styles.levelNumber, levelIndex === currentLevelIndex && styles.currentLevelNumber]}>
                          {level.order}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t(language, 'close')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { backgroundColor: palette.page, borderRadius: 12, padding: 16, width: '100%', maxWidth: 420, maxHeight: '80%' },
  heading: { fontSize: 18, fontWeight: '600', color: palette.ink, marginBottom: 8 },
  chapter: { marginTop: 8 },
  chapterName: { color: palette.quiet, marginBottom: 6 },
  levelButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  levelButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.controlBorder,
    backgroundColor: palette.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLevelButton: { backgroundColor: palette.accent, borderColor: palette.accent },
  levelNumber: { fontSize: 16, color: palette.ink },
  currentLevelNumber: { color: '#ffffff', fontWeight: '600' },
  closeButton: { alignSelf: 'flex-end', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { color: palette.accent, fontSize: 16 },
});
