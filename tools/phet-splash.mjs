/*
 * The loading screen of a simulation belongs to the library as well.
 *
 * The upstream splash draws the name and the mark of its own maker and
 * a progress bar in its own colours.  The picture is handed to the page
 * as a picture of this library instead, and the bar is painted in the
 * colours of 乐启享.  Both are put in place before the upstream script
 * runs, so the loading screen is ours from the very first frame.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPLASH_FILE = path.join(ROOT, 'mirror', 'leqixiang', 'brand', 'lq-splash.svg');

export const splashStyle =
  '<style id="lq-splash-style">' +
  '#progressBarForeground{fill:#4356ad !important}' +
  '#progressBarBackground{stroke:#f0a22e}' +
  '#phetioGradient stop{stop-color:#f0a22e}' +
  '</style>';

export function applySplash(html) {
  const splash = fs.readFileSync(SPLASH_FILE, 'utf8');
  const uri = `data:image/svg+xml;base64,${Buffer.from(splash, 'utf8').toString('base64')}`;
  /*
   * The picture of the loading screen is written into the document
   * before the script that shows it runs.  Every such line is taken out
   * and the picture of this library is put in its place, so the loading
   * screen belongs to 乐启享 from the very first frame.
   */
  let out = html.replace(
    /<script>window\.PHET_SPLASH_DATA_URI\s*=\s*"[^"]*";?<\/script>/g,
    ''
  );
  const head = `<script>window.PHET_SPLASH_DATA_URI=${JSON.stringify(uri)};</script>` + splashStyle;
  if (/<body[^>]*>/i.test(out)) {
    return out.replace(/<body[^>]*>/i, (m) => `${m}\n${head}`);
  }
  return head + out;
}

export default applySplash;
