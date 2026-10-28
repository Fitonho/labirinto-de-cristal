// Exports the Expo app as a static web site into dist/, which Netlify publishes.
// Kept as a script so the environment variables work the same on Windows.
import { execSync } from 'node:child_process';

execSync('npx expo export --platform web --output-dir dist', {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_OFFLINE: '1', // the export needs nothing from Expo's servers
    EXPO_NO_TELEMETRY: '1',
    // Logging is on everywhere except Netlify's production deploy (and ?debug turns it on there).
    EXPO_PUBLIC_DEBUG_LOGS: String(process.env.CONTEXT !== 'production'),
  },
});
