// The board colours setting: random, a new palette every level, or one
// favourite palette for every level. Each palette shows as a tile split into
// its dark and light colours, with its name. A pick recolours the game behind
// the sheet straight away, so the player can try palettes before choosing:
// OK or a tap outside the sheet keeps the pick, Cancel or the back button
// puts back the choice from when the sheet opened.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PALETTE_IDS, type PaletteChoice } from '../state/palettes';
import type { Language } from '../state/store';
import { useAppColours } from './AppColours';
import { t, type StringKey } from './i18n';
import { PickerSheet, SheetButton } from './PickerSheet';
import { boardPalettes } from './theme';

interface ColourPickerProps {
  visible: boolean;
  language: Language;
  paletteChoice: PaletteChoice;
  onPick: (paletteChoice: PaletteChoice) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const SWATCH_SIZE = 28;

export function ColourPicker({ visible, language, paletteChoice, onPick, onConfirm, onCancel }: ColourPickerProps) {
  const appColours = useAppColours();
  const optionColours = (isChosen: boolean) =>
    isChosen ? { borderColor: appColours.accent, borderWidth: 2 } : { borderColor: appColours.controlBorder, borderWidth: 1 };
  return (
    <PickerSheet
      visible={visible}
      heading={t(language, 'colours')}
      onBackdropPress={onConfirm}
      onRequestClose={onCancel}
      buttons={
        <>
          <SheetButton label={t(language, 'cancel')} onPress={onCancel} />
          <SheetButton label={t(language, 'ok')} onPress={onConfirm} emphasised />
        </>
      }
    >
      <View style={styles.options}>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: paletteChoice === 'random' }}
          onPress={() => onPick('random')}
          style={[styles.option, { backgroundColor: appColours.control }, optionColours(paletteChoice === 'random')]}
        >
          <View style={styles.swatchRow}>
            {PALETTE_IDS.slice(0, 4).map((paletteId) => (
              <View key={paletteId} style={[styles.miniSwatch, { backgroundColor: boardPalettes[paletteId].tileColours.black }]} />
            ))}
          </View>
          <Text style={[styles.optionText, { color: appColours.ink }]}>{t(language, 'randomColours')}</Text>
        </Pressable>
        {PALETTE_IDS.map((paletteId) => {
          const { tileColours } = boardPalettes[paletteId];
          const isChosen = paletteChoice === paletteId;
          return (
            <Pressable
              key={paletteId}
              accessibilityRole="radio"
              accessibilityState={{ checked: isChosen }}
              onPress={() => onPick(paletteId)}
              style={[styles.option, { backgroundColor: appColours.control }, optionColours(isChosen)]}
            >
              <View style={[styles.swatch, { borderColor: appColours.controlBorder }]}>
                <View style={[styles.swatchHalf, { backgroundColor: tileColours.black }]} />
                <View style={[styles.swatchHalf, { backgroundColor: tileColours.white }]} />
              </View>
              <Text style={[styles.optionText, { color: appColours.ink }]}>{t(language, `palette.${paletteId}` as StringKey)}</Text>
            </Pressable>
          );
        })}
      </View>
    </PickerSheet>
  );
}

const styles = StyleSheet.create({
  options: { gap: 8, marginTop: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 8, paddingHorizontal: 10, minHeight: 48 },
  optionText: { fontSize: 16, flexShrink: 1 },
  swatch: { width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: 6, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  swatchHalf: { flex: 1 },
  swatchRow: { width: SWATCH_SIZE, height: SWATCH_SIZE, flexDirection: 'row', flexWrap: 'wrap', borderRadius: 6, overflow: 'hidden' },
  miniSwatch: { width: SWATCH_SIZE / 2, height: SWATCH_SIZE / 2 },
});
