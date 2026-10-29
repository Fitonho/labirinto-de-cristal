// npm run generate -- --size 6x6 --needs push,portal --par 15-30
// Finds new levels with levelGenerator.ts and writes them to the Lab
// (src/levels/lab.json), each with its shortest solution and a link that opens
// it in the web app. Run with no options for the help.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_GENERATOR_OPTIONS, generateLevel, MECHANICS, seededRandom, type GeneratorOptions, type Mechanic } from './levelGenerator';
import { linkQueryFor, solutionLettersFor, type LabLevel } from '../levels/lab';

const HELP = `Finds new levels and writes them to the Lab chapter (src/levels/lab.json).

  npm run generate -- --size 6x6 --needs push,portal --par 15-30

  --size     columns x rows, e.g. 5x5 or 6x5 (required; 7x7 is about the largest that stays quick)
  --needs    mechanics the level can't be won without: ${MECHANICS.join(', ')}
  --stars    1 or 2 (default 1; with 2, each star alone needs a push and both together take longer)
  --portals  how many portals (default 1 when --needs has portal or carry, else 0); every one must be needed
  --par      shortest solution range, e.g. 15-30 (default ${DEFAULT_GENERATOR_OPTIONS.minMoves}-${DEFAULT_GENERATOR_OPTIONS.maxMoves})
  --count    how many levels to find (default 10)
  --time     stop after this many seconds (default 300)
  --seed     start of the random numbers, to repeat a run (default: the clock)
  --append   add to the Lab instead of replacing it
  --url      where the app runs, for the links (default http://localhost:8081/)

Every board is tidied (calmer colours, same solution length) before it is written.
In the app the Lab shows in dev, in Expo Go and on the web with ?debug; each Lab level has a Solve button.`;

// npm runs scripts from the repo's root folder.
const labFile = resolve('src/levels/lab.json');

function optionValues(argumentList: string[]): Map<string, string> {
  const valuesByName = new Map<string, string>();
  for (let argumentIndex = 0; argumentIndex < argumentList.length; argumentIndex++) {
    const name = argumentList[argumentIndex].replace(/^--/, '');
    const nextArgument = argumentList[argumentIndex + 1];
    if (nextArgument === undefined || nextArgument.startsWith('--')) valuesByName.set(name, 'true');
    else {
      valuesByName.set(name, nextArgument);
      argumentIndex++;
    }
  }
  return valuesByName;
}

function fail(message: string): never {
  console.error(`${message}\n\n${HELP}`);
  process.exit(1);
}

const valuesByName = optionValues(process.argv.slice(2));
if (!valuesByName.has('size')) fail('Say how big: --size 6x6');
const [columnCount, rowCount] = valuesByName.get('size')!.split('x').map(Number);
if (!(columnCount >= 2 && rowCount >= 2)) fail(`Can't read --size ${valuesByName.get('size')}`);
const mechanics = (valuesByName.get('needs') ?? '').split(',').filter(Boolean) as Mechanic[];
const unknownMechanics = mechanics.filter((mechanic) => !MECHANICS.includes(mechanic));
if (unknownMechanics.length) fail(`Unknown mechanic: ${unknownMechanics.join(', ')}`);
const starCount = Number(valuesByName.get('stars') ?? DEFAULT_GENERATOR_OPTIONS.starCount);
if (starCount !== 1 && starCount !== 2) fail('--stars is 1 or 2');
const [minMoves, maxMoves] = (valuesByName.get('par') ?? `${DEFAULT_GENERATOR_OPTIONS.minMoves}-${DEFAULT_GENERATOR_OPTIONS.maxMoves}`).split('-').map(Number);
if (!(minMoves <= maxMoves)) fail(`Can't read --par ${valuesByName.get('par')}`);
const needsPortal = mechanics.includes('portal') || mechanics.includes('carry');

const options: GeneratorOptions = {
  ...DEFAULT_GENERATOR_OPTIONS,
  columnCount,
  rowCount,
  mechanics,
  starCount,
  portalCount: Number(valuesByName.get('portals') ?? (needsPortal ? 1 : 0)),
  minMoves,
  maxMoves,
};
const levelCount = Number(valuesByName.get('count') ?? 10);
const timeLimitMs = Number(valuesByName.get('time') ?? 300) * 1000;
const seed = Number(valuesByName.get('seed') ?? Date.now() % 1_000_000);
const appUrl = valuesByName.get('url') ?? 'http://localhost:8081/';
const appending = valuesByName.has('append');

const labLevels: LabLevel[] = appending ? JSON.parse(readFileSync(labFile, 'utf8')) : [];
const boardKeys = new Set(labLevels.map((labLevel) => JSON.stringify([labLevel.grid, labLevel.start, labLevel.portals])));
const random = seededRandom(seed);
const startedAt = Date.now();
let foundCount = 0;
let tryCount = 0;
console.error(`Seed ${seed}. Looking for ${levelCount} levels, ${columnCount}x${rowCount}, needing ${mechanics.join(', ') || 'nothing in particular'}, ${minMoves} to ${maxMoves} moves...`);
while (foundCount < levelCount && Date.now() - startedAt < timeLimitMs) {
  tryCount++;
  const generated = generateLevel(options, random);
  if (!generated) continue;
  const boardKey = JSON.stringify([generated.level.grid, generated.level.start, generated.level.portals]);
  if (boardKeys.has(boardKey)) continue;
  boardKeys.add(boardKey);
  foundCount++;
  const labLevel: LabLevel = {
    ...generated.level,
    id: `lab-${seed}-${foundCount}`,
    chapter: 'lab',
    order: labLevels.length + 1,
    solution: solutionLettersFor(generated.solution),
  };
  labLevels.push(labLevel);
  writeFileSync(labFile, JSON.stringify(labLevels, null, 2) + '\n');
  const seconds = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n${labLevel.id}: ${labLevel.par} moves (${seconds} s, try ${tryCount})\n  ${labLevel.grid.join('\n  ')}`);
  console.log(`  start ${labLevel.start.join(',')}, portals ${JSON.stringify(labLevel.portals)}\n  solution ${labLevel.solution}`);
  console.log(`  ${appUrl}${linkQueryFor(labLevel)}`);
}
console.error(`\nFound ${foundCount} in ${Math.round((Date.now() - startedAt) / 1000)} s (${tryCount} tries). The Lab now has ${labLevels.length} levels.`);
