// The new idea lighting up twice on the real board as the new-idea card
// folds away: the portals as glowing seams, or a ring round each star or box
// (levelIdeas.ts picks which). It sits over the board and takes no touches.
// Its shapes only change when a glow starts, so moves never redraw it.
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { IDEA_CARD_CLOSE_DURATION, IDEA_GLOW_DURATION, type IdeaHighlight } from './levelIdeas';
import { SEAM_GLOW, SEAM_WIDTH } from './theme';

interface IdeaGlowProps {
  highlight: IdeaHighlight | null;
  tileSize: number;
  seamColour: string;
  /** Goes up by one each time the card closes, which starts a glow. */
  glowCount: number;
}

export const IdeaGlow = memo(function IdeaGlow({ highlight, tileSize, seamColour, glowCount }: IdeaGlowProps) {
  const glow = useSharedValue(0);
  useEffect(() => {
    if (glowCount === 0) return;
    const half = IDEA_GLOW_DURATION / 2;
    glow.value = withDelay(
      IDEA_CARD_CLOSE_DURATION,
      withSequence(
        withTiming(1, { duration: half }),
        withTiming(0, { duration: half }),
        withTiming(1, { duration: half }),
        withTiming(0, { duration: half }),
      ),
    );
  }, [glowCount, glow]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  if (!highlight) return null;

  const seamStyle = { backgroundColor: seamColour, boxShadow: `0 0 ${SEAM_GLOW * 2}px ${seamColour}` };
  const barThickness = SEAM_WIDTH * 2.5;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glowStyle]}>
      {highlight.portals.map((portal) => {
        const isRightEdge = portal.side === 'right';
        return (
          <View
            key={`${portal.row}-${portal.column}-${portal.side}`}
            style={[
              styles.shape,
              seamStyle,
              isRightEdge
                ? { left: (portal.column + 1) * tileSize - barThickness / 2, top: portal.row * tileSize, width: barThickness, height: tileSize }
                : { left: portal.column * tileSize, top: (portal.row + 1) * tileSize - barThickness / 2, width: tileSize, height: barThickness },
            ]}
          />
        );
      })}
      {highlight.cells.map((cell) => (
        <View
          key={`${cell.row}-${cell.column}`}
          style={[
            styles.shape,
            styles.ring,
            {
              left: cell.column * tileSize + tileSize * 0.04,
              top: cell.row * tileSize + tileSize * 0.04,
              width: tileSize * 0.92,
              height: tileSize * 0.92,
              borderRadius: tileSize * 0.24,
              borderColor: seamColour,
              boxShadow: `0 0 ${SEAM_GLOW * 2}px ${seamColour}`,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  shape: { position: 'absolute', borderRadius: 4 },
  ring: { borderWidth: 4 },
});
