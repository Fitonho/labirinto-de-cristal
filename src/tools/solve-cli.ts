// npm run solve -- <level id> [max states]
import { loadLevel } from '../core';
import { levels } from '../levels/index';
import { solve } from './solver';

const [levelId, maxStatesArgument] = process.argv.slice(2);
const level = levels.find((candidate) => candidate.id === levelId);
if (!level) {
  console.error(`Unknown level "${levelId}". Levels: ${levels.map((knownLevel) => knownLevel.id).join(', ')}`);
  process.exit(1);
}
const solution = solve(loadLevel(level), maxStatesArgument ? Number(maxStatesArgument) : undefined);
if (!solution) {
  console.log(`${levelId}: no solution found within the state limit`);
} else {
  const pathLetters = solution.path.map((direction) => direction[0].toUpperCase()).join('');
  console.log(`${levelId}: ${solution.moveCount} moves (${solution.searchedStateCount} states searched)\n${pathLetters}`);
}
