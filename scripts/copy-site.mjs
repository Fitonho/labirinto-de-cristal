// Collects the files the browser needs into dist/, which Netlify publishes.
import { cpSync, rmSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
for (const path of ['index.html', 'index.css', 'build']) {
  cpSync(path, `dist/${path}`, { recursive: true });
}
