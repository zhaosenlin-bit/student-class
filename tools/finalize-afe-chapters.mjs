#!/usr/bin/env node
/*
 * Localise the chapter documents of a chapter course.
 *
 * The documents were served from a session address that no longer exists.
 * Every path they name is rewritten to the local asset endpoint.
 *
 * The entry page itself is NOT written here: the player shell has to match
 * the chapter runtime of the course, so it is left to
 * tools/rebuild-chapter-index.mjs, which reads the runtime adapter that
 * ships with the course and knows whether the chapter frame needs a host
 * on the outside.  Writing the shell here used to overwrite that host and
 * left the frame asking for a session that nobody answered.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CW = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'courseware');
const MANIFEST = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'chapters.json');
const WORKS = path.join(ROOT, 'mirror', 'aifunengjiaoyu', 'programs-all.json');

/*
 * The chapter list comes from what the pull actually managed to mount, so
 * a course that the platform opens in more or fewer parts is written as it
 * really is instead of as a hand-written list.
 */
const courses = {};
if (fs.existsSync(MANIFEST)) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const works = fs.existsSync(WORKS) ? JSON.parse(fs.readFileSync(WORKS, 'utf8')) : [];
  const titleOf = new Map(works.map((w) => [String(w.id), String(w.title || '')]));
  for (const [id, info] of Object.entries(manifest)) {
    const chapters = (info.entries || []).map((e) => [e.title || e.id, e.path]);
    if (!chapters.length) continue;
    courses[id] = {
      title: titleOf.get(String(id)) || `课件 ${id}`,
      home: chapters[0][1],
      chapters,
    };
  }
}

const ASSET = (id) => `/api/program-assets/${id}/`;

/* Rewrite every relative path in a document to the local asset endpoint. */
const localise = (html, id, dir) => {
  const toLocal = (rel) => {
    const clean = rel.replace(/^\.?\//, '');
    /*
     * A "./" reference inside a chapter can point at that chapter's own
     * folder or at the course root — the platform mixes the two.  The file
     * that is actually on disk decides which spelling is the right one.
     */
    const inChapter = dir ? path.posix.join(dir, clean) : clean;
    const root = path.posix.join(CW, `${id}.assets`, clean);
    const inChapterFile = dir ? path.join(CW, `${id}.assets`, inChapter) : null;
    const useChapter =
      inChapterFile && fs.existsSync(inChapterFile) ? true : fs.existsSync(root);
    return `${ASSET(id)}${useChapter ? inChapter : clean}`;
  };
  let out = html;
  out = out.replace(/(["'])\.\/([^"']+?)\1/g, (m, quote, rest) => `${quote}${toLocal(rest)}${quote}`);
  out = out.replace(
    /(["'])(?!https?:|\/api\/|\/)([A-Za-z0-9_][^"':]*?\.(?:js|mjs|css|html?|png|jpe?g|gif|svg|webp|avif|glb|gltf|mp3|mp4|wav|ogg|m4a|json|woff2?|ttf))\1/g,
    (m, quote, rel) => `${quote}${toLocal(rel)}${quote}`
  );
  return out;
};

for (const [id, course] of Object.entries(courses)) {
  const dir = path.join(CW, `${id}.assets`);
  if (!fs.existsSync(dir)) continue;

  /* Every chapter document gets its own paths. */
  for (const [, rel] of course.chapters) {
    const file = path.join(dir, rel);
    if (!fs.existsSync(file)) continue;
    const folder = path.posix.dirname(rel);
    fs.writeFileSync(file, localise(fs.readFileSync(file, 'utf8'), id, folder));
  }

  /* The course map keeps its own paths. */
  const homeFile = path.join(dir, course.home);
  if (fs.existsSync(homeFile)) {
    let home = localise(fs.readFileSync(homeFile, 'utf8'), id, '');
    /* The lock script belongs to the trial session. */
    home = home.replace(
      /<script[^>]*src=["'][^"']*_turing_trial_locks\.js["'][^>]*>\s*<\/script>/gi,
      ''
    );
    fs.writeFileSync(homeFile, home);
  }

  console.log(`${id}: ${course.chapters.length} 章文档已本地化`);
}

/*
 * The player shell is written by the index builder: it is the one that
 * knows whether the course carries a runtime and therefore needs a host
 * on the outside of the chapter frame.  Writing the shell here used to
 * overwrite that host and left the frame asking for a session that nobody
 * answered, so the course opened on a black screen.
 */
execFileSync(process.execPath, [path.join(ROOT, 'tools', 'rebuild-chapter-index.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
});
