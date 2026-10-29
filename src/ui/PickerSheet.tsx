// The sheet the level and colour pickers open over the game: a heading, a
// scrolling list and a row of buttons on a dimmed backdrop. Stands in for the
// web <select>, which React Native does not have. It opens and closes without
// a fade: the fade held it on screen for about 300 ms after a pick.
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppColours } from './AppColours';
import { BACKDROP_COLOUR } from './theme';

interface PickerSheetProps {
  visible: boolean;
  heading: string;
  /** A tap on the dimmed backdrop around the sheet. */
  onBackdropPress: () => void;
  /** Android's back button and the web's Escape key. */
  onRequestClose: () => void;
  /** The buttons along the bottom, built with SheetButton. */
  buttons: ReactNode;
  children: ReactNode;
}

export function PickerSheet({ visible, heading, onBackdropPress, onRequestClose, buttons, children }: PickerSheetProps) {
  const appColours = useAppColours();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onRequestClose}>
      <Pressable style={styles.backdrop} onPress={onBackdropPress}>
        <Pressable style={[styles.sheet, { backgroundColor: appColours.page }]} onPress={() => {}}>
          <Text style={[styles.heading, { color: appColours.ink }]}>{heading}</Text>
          <ScrollView>{children}</ScrollView>
          <View style={styles.buttons}>{buttons}</View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface SheetButtonProps {
  label: string;
  onPress: () => void;
  /** The main action, drawn bold. */
  emphasised?: boolean;
}

export function SheetButton({ label, onPress, emphasised = false }: SheetButtonProps) {
  const appColours = useAppColours();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={[styles.buttonText, { color: appColours.accent }, emphasised && styles.emphasisedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: BACKDROP_COLOUR, justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { borderRadius: 12, padding: 16, width: '100%', maxWidth: 420, maxHeight: '80%' },
  heading: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  buttons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  button: { paddingVertical: 8, paddingHorizontal: 12 },
  buttonText: { fontSize: 16 },
  emphasisedText: { fontWeight: '700' },
});
