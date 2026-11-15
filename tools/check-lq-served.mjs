#!/usr/bin/env node
/* What the browser actually gets from the local server. */
const ORIGIN = 'http://localhost:4173';

for (const path of ['/app.js', '/download-store.js', '/lq-mode.js']) {
  const res = await fetch(ORIGIN + path);
  const text = await res.text();
  console.log(
    path,
    res.status,
    text.length + 'B',
    'cache=' + res.headers.get('cache-control'),
    'subject-more=' + text.includes('download-subject-more'),
    'feedback=' + text.includes('course-feedback')
  );
}

const html = await (await fetch(ORIGIN + '/')).text();
const tags = html.match(/<script[^>]*src="[^"]+"/g) || [];
console.log('index scripts:\n  ' + tags.join('\n  '));
