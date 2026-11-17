#!/usr/bin/env node
/*
 * Checks that the browser can be told to ignore `debugger` statements.
 *
 * A few of the courses watch for a developer tool and freeze themselves
 * when one is attached.  The check opens a page with a debugger statement
 * in it and asks whether the page keeps running.
 */
import { connect, sleep } from './cdpx.mjs';

const PAGE = `data:text/html,<script>function loop(){var t=performance.now();(function(){}).constructor('debugger')();if(performance.now()-t>100){setTimeout(loop,50);}else{setTimeout(loop,50);}}</script><body>alive</body>`;

const p = await connect(9222);
await p.goto(PAGE);
await sleep(3000);
const r = await Promise.race([
  p.evaluate('document.body.innerText').catch((e) => ({ error: e.message })),
  new Promise((res) => setTimeout(() => res({ error: 'no answer in 4s' }), 4000)),
]);
console.log('page answers:', JSON.stringify(r));
await p.close();
