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
    /<script[^>]*>\s*window\.PHET_SPLASH_DATA_URI\s*=\s*"[^"]*";?\s*<\/script>/g,
    ''
  );
  /*
   * A few simulations put the name of the upstream house inside a
   * condition of their own, so the whole line cannot be matched as one
   * script.  The name itself is taken out wherever it is written.
   */
  out = out.replace(/window\.PHET_SPLASH_DATA_URI\s*=\s*"[^"]*"\s*;?/g, '');
  /* the colours of the bar of the loading screen, once and once only */
  out = out.replace(/<style id="lq-splash-style">[\s\S]*?<\/style>/g, '');
  /*
   * A few simulations hold their own picture of the loading screen: the
   * name and the mark of the upstream house, drawn in the middle of the
   * window while the simulation starts.  That picture is ours now, and
   * it is put in the middle again.
   */
  out = out.replace(/<img id="splash"([^>]*)>/g, (m, attrs) => {
    if (!/src="data:image\/svg\+xml;base64,/.test(attrs)) return m;
    const fixed = attrs
      .replace(/margin-top:\s*-?[\d.]+px/, 'margin-top:-52px')
      .replace(/margin-left:\s*-?[\d.]+px/, 'margin-left:-137px')
      .replace(
        /src="data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+"/,
        `src="${uri}"`
      );
    return `<img id="splash"${fixed}>`;
  });
  const head = `<script>window.PHET_SPLASH_DATA_URI=${JSON.stringify(uri)};</script>` + splashStyle;
  if (/<body[^>]*>/i.test(out)) {
    return out.replace(/<body[^>]*>/i, (m) => `${m}\n${head}`);
  }
  return head + out;
}

export default applySplash;
