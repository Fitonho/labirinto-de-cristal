// Round buttons with line icons for the switches above the board and for
// Undo and Restart. Icons are drawn with react-native-svg on a 24-point grid,
// so no icon font has to load. A switch that is off shows its icon crossed out.
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { palette } from './theme';

export type IconKind = 'sound' | 'vibration' | 'tapMoves' | 'undo' | 'restart';

interface IconButtonProps {
  icon: IconKind;
  label: string;
  onPress: () => void;
  /** Set for a switch: whether it is on. Left out for a plain button. */
  switchedOn?: boolean;
  size?: number;
}

export function IconButton({ icon, label, onPress, switchedOn, size = 40 }: IconButtonProps) {
  const isSwitch = switchedOn !== undefined;
  const iconColour = switchedOn === false ? palette.quiet : palette.ink;
  return (
    <Pressable
      accessibilityRole={isSwitch ? 'switch' : 'button'}
      accessibilityLabel={label}
      accessibilityState={isSwitch ? { checked: switchedOn } : undefined}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}
    >
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24">
        <IconShape icon={icon} colour={iconColour} />
        {switchedOn === false && <Path d="M4 4 L20 20" stroke={iconColour} strokeWidth={2} strokeLinecap="round" />}
      </Svg>
    </Pressable>
  );
}

function IconShape({ icon, colour }: { icon: IconKind; colour: string }) {
  const line = { stroke: colour, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  switch (icon) {
    case 'sound':
      return (
        <>
          <Path d="M3 9 H7 L12 5 V19 L7 15 H3 Z" fill={colour} />
          <Path d="M15.5 9 A4 4 0 0 1 15.5 15" {...line} />
          <Path d="M18 6.5 A7.5 7.5 0 0 1 18 17.5" {...line} />
        </>
      );
    case 'vibration':
      return (
        <>
          <Rect x={8} y={3} width={8} height={18} rx={2} {...line} />
          <Path d="M4.5 8 L2.5 10 L4.5 12 L2.5 14 L4.5 16" {...line} />
          <Path d="M19.5 8 L21.5 10 L19.5 12 L21.5 14 L19.5 16" {...line} />
        </>
      );
    case 'tapMoves':
      return (
        <>
          {/* A fingertip and the ring a tap sends out. */}
          <Circle cx={12} cy={12} r={3.5} fill={colour} />
          <Circle cx={12} cy={12} r={8} {...line} strokeDasharray="3 2.5" />
        </>
      );
    case 'undo':
      return (
        <>
          <Path d="M8 13 L3.5 8.5 L8 4" {...line} />
          <Path d="M3.5 8.5 H14 A5.5 5.5 0 0 1 14 19.5 H10" {...line} />
        </>
      );
    case 'restart':
      return (
        <>
          <Path d="M19.5 12 A7.5 7.5 0 1 1 17.3 6.7" {...line} />
          <Path d="M19 3 V8 H14" {...line} />
        </>
      );
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.controlBorder,
    backgroundColor: palette.control,
  },
  pressed: { opacity: 0.6 },
});
