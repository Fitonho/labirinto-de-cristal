// Runs the level generator from the command line: npm run generate -- --size 6x6 --needs push
import { build } from 'esbuild';

const buildResult = await build({
  entryPoints: ['src/tools/generate-cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(buildResult.outputFiles[0].text).toString('base64')}`);
