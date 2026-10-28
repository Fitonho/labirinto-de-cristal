// Bundles the web game into dist/, which Netlify publishes.
import { build } from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/web/main.ts'],
  bundle: true,
  format: 'esm',
  target: 'es2020',
  sourcemap: true,
  outfile: 'dist/main.js',
  // Logging is on everywhere except Netlify's production deploy (and ?debug turns it on there).
  define: { __DEV__: String(process.env.CONTEXT !== 'production') },
});
for (const staticFile of ['index.html', 'index.css']) {
  cpSync(staticFile, `dist/${staticFile}`);
}
