// Writes the game's sound effects into assets/sounds/ as mono 16-bit WAV files:
// node scripts/make-sounds.mjs. They are synthesised here rather than
// recorded, so the repo owns them and a sound is retuned by changing a number.
// Rerun the script and commit the files after any change.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const outputFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/** Seeded white noise, so every run writes the same bytes. */
function makeNoise(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 2147483648 - 1;
  };
}

/** A struck glass bar: partials at the free-bar ratios, each decaying faster than the last. */
function addBell(samples, startSeconds, frequency, loudness) {
  const ratios = [1, 2.76, 5.4, 8.93];
  const levels = [1, 0.45, 0.22, 0.1];
  const decays = [0.35, 0.16, 0.08, 0.045];
  const startIndex = Math.round(startSeconds * SAMPLE_RATE);
  for (let sampleIndex = startIndex; sampleIndex < samples.length; sampleIndex++) {
    const time = (sampleIndex - startIndex) / SAMPLE_RATE;
    const attack = Math.min(1, time / 0.002);
    let value = 0;
    ratios.forEach((ratio, partialIndex) => {
      value += levels[partialIndex] * Math.exp(-time / decays[partialIndex]) * Math.sin(2 * Math.PI * frequency * ratio * time);
    });
    samples[sampleIndex] += loudness * attack * value;
  }
}

/** A thump whose pitch falls from startFrequency to endFrequency, with a little filtered noise for texture. */
function addThump(samples, startFrequency, endFrequency, decay, noiseLevel, seed) {
  const noise = makeNoise(seed);
  let phase = 0;
  let filteredNoise = 0;
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
    const time = sampleIndex / SAMPLE_RATE;
    const frequency = endFrequency + (startFrequency - endFrequency) * Math.exp(-time / 0.03);
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    filteredNoise += 0.15 * (noise() - filteredNoise);
    const attack = Math.min(1, time / 0.003);
    const texture = noiseLevel * filteredNoise * Math.exp(-time / 0.015) * 4;
    samples[sampleIndex] += attack * Math.exp(-time / decay) * (Math.sin(phase) + texture);
  }
}

/** The door: a rising glassy sweep with a soft shimmer, then a bell on arrival. */
function addSweep(samples) {
  let phase = 0;
  let upperPhase = 0;
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
    const time = sampleIndex / SAMPLE_RATE;
    const frequency = 520 * Math.pow(2, Math.min(time, 0.22) * 4.5);
    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
    upperPhase += (2 * Math.PI * frequency * 1.5) / SAMPLE_RATE;
    const envelope = Math.min(1, time / 0.04) * Math.exp(-time / 0.12);
    const shimmer = 0.75 + 0.25 * Math.sin(2 * Math.PI * 28 * time);
    samples[sampleIndex] += 0.5 * envelope * shimmer * (Math.sin(phase) + 0.4 * Math.sin(upperPhase));
  }
  addBell(samples, 0.2, 1568, 0.35);
}

/** Draws a sound, scales its loudest sample to `peak` and fades the last 10 ms so it never ends in a click. */
function render(durationSeconds, draw, peak) {
  const samples = new Float32Array(Math.round(durationSeconds * SAMPLE_RATE));
  draw(samples);
  const loudest = samples.reduce((largest, value) => Math.max(largest, Math.abs(value)), 0) || 1;
  const fadeLength = Math.round(0.01 * SAMPLE_RATE);
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
    const fade = Math.min(1, (samples.length - sampleIndex) / fadeLength);
    samples[sampleIndex] = (samples[sampleIndex] / loudest) * peak * fade;
  }
  return samples;
}

function wavFile(samples) {
  const dataByteCount = samples.length * 2;
  const file = Buffer.alloc(44 + dataByteCount);
  file.write('RIFF', 0);
  file.writeUInt32LE(36 + dataByteCount, 4);
  file.write('WAVE', 8);
  file.write('fmt ', 12);
  file.writeUInt32LE(16, 16); // format chunk size
  file.writeUInt16LE(1, 20); // PCM
  file.writeUInt16LE(1, 22); // mono
  file.writeUInt32LE(SAMPLE_RATE, 24);
  file.writeUInt32LE(SAMPLE_RATE * 2, 28); // bytes per second
  file.writeUInt16LE(2, 32); // bytes per sample frame
  file.writeUInt16LE(16, 34); // bits per sample
  file.write('data', 36);
  file.writeUInt32LE(dataByteCount, 40);
  samples.forEach((value, sampleIndex) => {
    file.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + sampleIndex * 2);
  });
  return file;
}

/** One file per sound cue kind in src/ui/sounds.ts. */
const samplesBySoundName = {
  step: render(0.07, (samples) => addThump(samples, 260, 180, 0.012, 0.6, 7), 0.22),
  push: render(0.2, (samples) => addThump(samples, 150, 85, 0.05, 0.5, 11), 0.75),
  bump: render(0.14, (samples) => addThump(samples, 95, 45, 0.03, 0.9, 23), 0.7),
  door: render(0.7, addSweep, 0.6),
  crystal: render(0.9, (samples) => addBell(samples, 0, 1318.5, 1), 0.6),
  win: render(
    1.5,
    (samples) =>
      [1046.5, 1318.5, 1568, 2093].forEach((frequency, noteIndex) =>
        addBell(samples, noteIndex * 0.09, frequency, 1 - noteIndex * 0.12),
      ),
    0.7,
  ),
};

mkdirSync(outputFolder, { recursive: true });
for (const [soundName, samples] of Object.entries(samplesBySoundName)) {
  writeFileSync(join(outputFolder, `${soundName}.wav`), wavFile(samples));
  console.log(`${soundName}.wav: ${(samples.length / SAMPLE_RATE).toFixed(2)} s`);
}
