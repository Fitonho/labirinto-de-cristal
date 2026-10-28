// npm run solve -- <level id> [max states]
import { loadLevel } from '../core';
import { levels } from '../levels/index';
import { solve } from './solver';

const [id, max] = process.argv.slice(2);
const level = levels.find((l) => l.id === id);
if (!level) {
  console.error(`Unknown level "${id}". Levels: ${levels.map((l) => l.id).join(', ')}`);
  process.exit(1);
}
const result = solve(loadLevel(level), max ? Number(max) : undefined);
if (!result) console.log(`${id}: no solution found within the state limit`);
else console.log(`${id}: ${result.moves} moves (${result.states} states searched)\n${result.path.map((d) => d[0].toUpperCase()).join('')}`);
