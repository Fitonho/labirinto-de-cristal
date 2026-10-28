// Bundles the web game into dist/, which Netlify publishes.
import { build } from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  sourcemap: true,
  outfile: 'dist/main.js',
});
for (const path of ['index.html', 'index.css']) {
  cpSync(path, `dist/${path}`);
}
