// Writes tests/levelFingerprints.json: a short fingerprint of every level's
// board. The levels test fails when a board changes without its fingerprint,
// because saved best moves are kept per level id: give a changed board a new
// id, or, if the old bests still hold on it, rerun this script and commit.
// Run with: node scripts/level-fingerprints.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const levelsFolder = fileURLToPath(new URL('../src/levels/', import.meta.url));
const outputFile = fileURLToPath(new URL('../tests/levelFingerprints.json', import.meta.url));

/** FNV-1a over the board's grid, start and doors; the same function as in tests/levels.test.ts. */
export function fingerprintOf(levelData) {
  const boardText = JSON.stringify([levelData.grid, levelData.start, levelData.doors ?? []]);
  let hash = 0x811c9dc5;
  for (let characterIndex = 0; characterIndex < boardText.length; characterIndex++) {
    hash ^= boardText.charCodeAt(characterIndex);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

const fingerprintsByLevelId = {};
for (const chapterFile of ['samples.json', 'drafts.json']) {
  for (const levelData of JSON.parse(readFileSync(levelsFolder + chapterFile, 'utf8'))) {
    fingerprintsByLevelId[levelData.id] = fingerprintOf(levelData);
  }
}
writeFileSync(outputFile, JSON.stringify(fingerprintsByLevelId, null, 2) + '\n');
console.log(`Wrote ${Object.keys(fingerprintsByLevelId).length} fingerprints to tests/levelFingerprints.json`);
