/**
 * Local server only: reads keys from `.env.local` / `.env` in the project folder
 * (both are git-ignored), so ANTHROPIC_API_KEY, the PINTEREST_* and AUTOPILOT_* keys don't
 * have to be typed before every `npm run ai-proxy`. Values already set in the
 * terminal win. On Vercel the keys come from the project's Environment Variables.
 */
import fs from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || m[1].startsWith('VITE_') || process.env[m[1]] !== undefined) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (value) process.env[m[1]] = value;
  }
}
