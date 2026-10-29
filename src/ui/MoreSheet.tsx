// The ⋯ sheet: the settings a player sets once and then leaves alone
// (vibration, tap moves, language), and on the web the keyboard keys. Sound
// and colours stay on the game screen, one tap away.
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Svg from 'react-native-svg';
import type { Language } from '../state/store';
import { useAppColours } from './AppColours';
import { t, type StringKey } from './i18n';
import { IconShape, type IconKind } from './IconButton';
import { PickerSheet, SheetButton } from './PickerSheet';

interface MoreSheetProps {
  visible: boolean;
  language: Language;
  vibrationOn: boolean;
  tapMovesOn: boolean;
  onToggleVibration: () => void;
  onToggleTapMoves: () => void;
  onChooseLanguage: (language: Language) => void;
  onClose: () => void;
}

const LANGUAGES: Language[] = ['pt', 'en'];
const KEYS: { keys: string; meaning: StringKey }[] = [
  { keys: '← ↑ → ↓', meaning: 'key.move' },
  { keys: 'Z', meaning: 'key.undo' },
  { keys: 'R', meaning: 'key.reset' },
  { keys: 'Enter', meaning: 'key.next' },
  { keys: 'M', meaning: 'key.sound' },
  { keys: 'L', meaning: 'key.levels' },
  { keys: 'Esc', meaning: 'key.back' },
];

export function MoreSheet(props: MoreSheetProps) {
  const { visible, language, vibrationOn, tapMovesOn, onToggleVibration, onToggleTapMoves, onChooseLanguage, onClose } = props;
  const appColours = useAppColours();
  const switchColours = { trackColor: { false: appColours.controlBorder, true: appColours.accent }, thumbColor: '#ffffff' };
  const keyCapColours = { borderColor: appColours.controlBorder, backgroundColor: appColours.control, color: appColours.ink };
  return (
    <PickerSheet
      visible={visible}
      heading={t(language, 'moreOptions')}
      onBackdropPress={onClose}
      onRequestClose={onClose}
      buttons={<SheetButton label={t(language, 'ok')} onPress={onClose} emphasised />}
    >
      <View style={styles.rows}>
        {/* The web never vibrates, so it has no vibration switch. */}
        {Platform.OS !== 'web' && (
          <SettingRow icon="vibration" label={t(language, 'vibration')}>
            <Switch accessibilityLabel={t(language, 'vibration')} value={vibrationOn} onValueChange={onToggleVibration} {...switchColours} />
          </SettingRow>
        )}
        <SettingRow icon="tapMoves" label={t(language, 'tapMoves')}>
          <Switch accessibilityLabel={t(language, 'tapMoves')} value={tapMovesOn} onValueChange={onToggleTapMoves} {...switchColours} />
        </SettingRow>
        <SettingRow label={t(language, 'language')}>
          <View accessibilityRole="radiogroup" style={[styles.segments, { borderColor: appColours.controlBorder }]}>
            {LANGUAGES.map((languageOption) => {
              const isChosen = languageOption === language;
              return (
                <Pressable
                  key={languageOption}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isChosen }}
                  onPress={() => onChooseLanguage(languageOption)}
                  style={[styles.segment, isChosen && { backgroundColor: appColours.accent }]}
                >
                  <Text style={[styles.segmentText, { color: isChosen ? appColours.onAccent : appColours.ink }]}>
                    {languageOption.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SettingRow>
        {Platform.OS === 'web' && (
          <View style={[styles.keyboard, { borderTopColor: appColours.controlBorder }]}>
            <Text style={[styles.keyboardHeading, { color: appColours.quiet }]}>{t(language, 'keyboard')}</Text>
            <View style={styles.keys}>
              {KEYS.map(({ keys, meaning }) => (
                <View key={meaning} style={styles.key}>
                  <Text style={[styles.keyCap, keyCapColours]}>{keys}</Text>
                  <Text style={[styles.keyMeaning, { color: appColours.ink }]}>{t(language, meaning)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </PickerSheet>
  );
}

function SettingRow({ icon, label, children }: { icon?: IconKind; label: string; children: ReactNode }) {
  const appColours = useAppColours();
  return (
    <View style={styles.row}>
      <View style={styles.rowLabel}>
        {icon && (
          <Svg width={22} height={22} viewBox="0 0 24 24">
            <IconShape icon={icon} colour={appColours.ink} />
          </Svg>
        )}
        <Text style={[styles.rowText, { color: appColours.ink }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 12, paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 40 },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  rowText: { fontSize: 16 },
  segments: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  segment: { paddingVertical: 6, paddingHorizontal: 14 },
  segmentText: { fontSize: 14, fontWeight: '600' },
  keyboard: { borderTopWidth: 1, paddingTop: 12, gap: 8 },
  keyboardHeading: { fontSize: 13 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 8 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keyCap: { fontSize: 12, fontWeight: '600', borderWidth: 1, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  keyMeaning: { fontSize: 14 },
});
