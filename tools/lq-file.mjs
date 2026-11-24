/*
 * Writing a file, and trying again when the machine is busy.
 *
 * A file that is being looked at by another program may refuse to be
 * opened for a moment.  That is not a reason to stop, so the write
 * is tried again a few times.
 */
import fs from 'node:fs';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function writeFileSafe(file, text) {
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      fs.writeFileSync(file, text);
      return true;
    } catch (e) {
      const code = e.code || '';
      if (attempt === 6 || !['UNKNOWN', 'EPERM', 'EACCES', 'EBUSY'].includes(code)) {
        throw e;
      }
      await wait(250 * attempt);
    }
  }
  return false;
}
