// The sheet the level and colour pickers open over the game: a heading, a
// scrolling list and a Close button on a dimmed backdrop. Stands in for the
// web <select>, which React Native does not have. It opens and closes without
// a fade: the fade held it on screen for about 300 ms after a pick.
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useAppColours } from './AppColours';
import { BACKDROP_COLOUR } from './theme';

interface PickerSheetProps {
  visible: boolean;
  heading: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function PickerSheet({ visible, heading, closeLabel, onClose, children }: PickerSheetProps) {
  const appColours = useAppColours();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: appColours.page }]} onPress={() => {}}>
          <Text style={[styles.heading, { color: appColours.ink }]}>{heading}</Text>
          <ScrollView>{children}</ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: appColours.accent }]}>{closeLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: BACKDROP_COLOUR, justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { borderRadius: 12, padding: 16, width: '100%', maxWidth: 420, maxHeight: '80%' },
  heading: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  closeButton: { alignSelf: 'flex-end', marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
  closeText: { fontSize: 16 },
});
