/*
 * Where a lesson in the library was made from.
 *
 * The library holds one copy of every lesson, with a name of its own.
 * This gives the lesson that copy was made from, so that a change made
 * to one of them can be carried over to the other.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* The root of the library is found from this file's own place, so
   that it is the same on every system. */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* The name each family gives its lessons in the library. */
const FAMILIES = [
  { prefix: 'lq-', dir: 'mirror/studio/courseware' },
  { prefix: 'lab-explore-', dir: 'mirror/lab-explore/courseware' },
  { prefix: 'lab-physics-', dir: 'mirror/lab-physics/courseware' },
  { prefix: 'lab-process-', dir: 'mirror/lab-process/courseware' },
  { prefix: 'lab-reaction-', dir: 'mirror/lab-reaction/courseware' },
  { prefix: 'lab-virtual-', dir: 'mirror/lab-virtual/courseware' }
];

const first = (dir, name) => {
  const file = path.join(ROOT, dir, name);
  return fs.existsSync(file) ? file : null;
};

/* The lesson a lesson in the library was made from. */
export function sourceOf(id) {
  for (const f of FAMILIES) {
    if (!id.startsWith(f.prefix)) continue;
    const hit = first(f.dir, `${id.slice(f.prefix.length)}.html`);
    if (hit) return hit;
  }
  if (id.startsWith('lab-course-')) {
    const hit = first('mirror/lab-course/courseware', `${id.slice('lab-course-'.length)}.html`);
    if (hit) return hit;
  }
  if (id.startsWith('game-block-')) {
    const hit = path.join(
      ROOT,
      'mirror/game-block',
      id.slice('game-block-'.length),
      'index.html'
    );
    if (fs.existsSync(hit)) return hit;
  }
  return first('mirror/library/courseware', `${id}.html`);
}

export const LIB = path.join(ROOT, 'mirror/leqixiang/courseware');
