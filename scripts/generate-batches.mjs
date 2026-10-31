// Fills the Lab with a spread of generated levels: about 20 for each chapter's
// idea, across board sizes and difficulties. Every batch is one
// `npm run generate` run with its own file in lab-batches/, several at once
// (one per CPU core, at most), and the results are joined into
// src/levels/lab.json at the end, replacing what was there.
// Run with: node scripts/generate-batches.mjs [seconds per batch, default 600]
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';

const secondsPerBatch = Number(process.argv[2] ?? 600);

// [tag, size, generate options, level count]. The par ranges grow with the board.
const batches = [
  ['push-4x4', '4x4', '--needs push --par 5-12', 7],
  ['push-5x5', '5x5', '--needs push --par 10-20', 7],
  ['push-6x6', '6x6', '--needs push --par 15-30', 6],
  ['portal-4x4', '4x4', '--needs portal --par 6-14', 7],
  ['portal-5x5', '5x5', '--needs portal,push --par 12-24', 7],
  ['portal-6x6', '6x6', '--needs portal,push --par 18-34', 6],
  ['star-4x4', '4x4', '--needs star-push --par 6-14', 5],
  ['star-5x5', '5x5', '--needs star-push --par 12-24', 5],
  ['two-stars-5x5', '5x5', '--needs push --stars 2 --par 14-30', 5],
  ['two-stars-6x6', '6x6', '--needs push,portal --stars 2 --par 20-40', 5],
  ['carry-4x4', '4x4', '--needs carry --par 8-16', 7],
  ['carry-5x5', '5x5', '--needs carry --par 12-26', 7],
  ['carry-6x6', '6x6', '--needs carry --par 18-36', 6],
  ['challenge-5x5', '5x5', '--needs push,portal,carry --par 24-45', 7],
  ['challenge-6x6', '6x6', '--needs push,portal,carry --par 30-55', 7],
  ['challenge-7x7', '7x7', '--needs push,portal --portals 2 --par 30-60', 6],
];

const batchFolder = 'lab-batches';
mkdirSync(batchFolder, { recursive: true });
const runCount = Math.max(1, Math.min(batches.length, availableParallelism() - 1));
console.log(`${batches.length} batches, ${runCount} at a time, up to ${secondsPerBatch} s each.`);

function runBatch([tag, size, options, levelCount]) {
  const outFile = `${batchFolder}/${tag}.json`;
  writeFileSync(outFile, '[]\n');
  const argumentList = ['scripts/generate.mjs', '--size', size, ...options.split(' '), '--count', String(levelCount), '--time', String(secondsPerBatch), '--tag', tag, '--out', outFile, '--append'];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, argumentList, { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('exit', () => {
      const foundCount = JSON.parse(readFileSync(outFile, 'utf8')).length;
      console.log(`${tag}: ${foundCount} of ${levelCount}`);
      resolve();
    });
  });
}

const waitingBatches = [...batches];
await Promise.all(
  Array.from({ length: runCount }, async () => {
    while (waitingBatches.length) await runBatch(waitingBatches.shift());
  }),
);

const labLevels = [];
for (const [tag] of batches) {
  const outFile = `${batchFolder}/${tag}.json`;
  if (!existsSync(outFile)) continue;
  for (const labLevel of JSON.parse(readFileSync(outFile, 'utf8'))) labLevels.push({ ...labLevel, order: labLevels.length + 1 });
}
writeFileSync('src/levels/lab.json', JSON.stringify(labLevels, null, 2) + '\n');
rmSync(batchFolder, { recursive: true });
console.log(`The Lab now has ${labLevels.length} levels.`);
