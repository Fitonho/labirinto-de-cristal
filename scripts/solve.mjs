// Runs the level solver from the command line: npm run solve -- sample-c
import { build } from 'esbuild';

const out = await build({
  entryPoints: ['src/tools/solve-cli.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
await import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`);
