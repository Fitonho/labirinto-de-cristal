// The small burst when the Pebble collects a star: the star stays on its
// cell while the Pebble slides in, then swells and fades as eight small stars
// fly out. A stand-in until the win screen exists. It belongs to the move that
// collected the star and fades to nothing, so it needs no timer to clean up:
// the next action drops it.
//
// The layer mounts the burst a frame after the move, so building it never
// delays the move's first frame; the burst only starts once the slide ends.
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { COLLECT_BURST_DURATION, SLIDE_DURATION } from './motion';
import { shardDirections, starPoints } from './pieceLooks';
import { STAR_INNER_RADIUS, STAR_OUTER_RADIUS } from './theme';

const SHARD_COUNT = 8;
/** The small stars start this far from the centre and fly this much further, as shares of the tile size. */
const SHARD_START = 0.2;
const SHARD_TRAVEL = 0.55;
const SHARD_SIZE = 0.1;

export interface CollectBurstProps {
  size: number;
  left: number; // the star's cell
  top: number;
  colour: string; // the star's colour on screen
}

/** `burst` is a new object for each move that collected a star, and null after any other action. */
export function CollectBurstLayer({ burst }: { burst: CollectBurstProps | null }) {
  const [shownBurst, setShownBurst] = useState<CollectBurstProps | null>(null);
  useEffect(() => {
    if (!burst) {
      setShownBurst(null);
      return;
    }
    const frame = requestAnimationFrame(() => setShownBurst(burst));
    return () => cancelAnimationFrame(frame);
  }, [burst]);
  // Keyed by the star's cell, so collecting a second star right after the first plays a fresh burst.
  return shownBurst && <CollectBurst key={JSON.stringify(shownBurst)} {...shownBurst} />;
}

function CollectBurst({ size, left, top, colour }: CollectBurstProps) {
  const progress = useSharedValue(0);
  useLayoutEffect(() => {
    // Mounted a frame after the move, so it waits a frame less for the slide to end.
    progress.value = withDelay(SLIDE_DURATION - 16, withTiming(1, { duration: COLLECT_BURST_DURATION, easing: Easing.linear }));
  }, [progress]);
  const points = useMemo(() => starPoints(size / 2, size / 2, size * STAR_OUTER_RADIUS, size * STAR_INNER_RADIUS), [size]);
  const starStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.value, transform: [{ scale: 1 + progress.value * 0.7 }] }));
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size }}>
      {shardDirections(SHARD_COUNT).map((shardDirection, shardIndex) => (
        <Shard key={shardIndex} size={size} colour={colour} progress={progress} {...shardDirection} />
      ))}
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, starStyle]}>
        <Svg width={size} height={size}>
          <Polygon points={points} fill={colour} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

interface ShardProps {
  size: number;
  colour: string;
  progress: SharedValue<number>;
  offsetX: number;
  offsetY: number;
}

/** A small star, drawn as a turned square so it needs no SVG of its own. */
function Shard({ size, colour, progress, offsetX, offsetY }: ShardProps) {
  const shardSize = size * SHARD_SIZE;
  const shardStyle = useAnimatedStyle(() => {
    const distance = size * (SHARD_START + SHARD_TRAVEL * (1 - Math.pow(1 - progress.value, 3)));
    return {
      // Hidden under the star until the Pebble arrives.
      opacity: progress.value > 0 ? 1 - progress.value : 0,
      transform: [{ translateX: offsetX * distance }, { translateY: offsetY * distance }, { rotate: '45deg' }],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: (size - shardSize) / 2,
          top: (size - shardSize) / 2,
          width: shardSize,
          height: shardSize,
          borderRadius: shardSize * 0.2,
          backgroundColor: colour,
        },
        shardStyle,
      ]}
    />
  );
}
