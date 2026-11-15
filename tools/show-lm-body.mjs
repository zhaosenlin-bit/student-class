import fs from 'node:fs';

const t = fs.readFileSync('mirror/leqixiang/courseware/afe-754.html', 'utf8');
/* The bootstrap is called as  longMarchSaveClient(config, html)  where the
   two arguments are a JSON object and a JSON string. */
const at = t.indexOf('({"protocol"') + 1;
let depth = 0;
let end = -1;
for (let i = at; i < t.length; i++) {
  if (t[i] === '{') depth++;
  else if (t[i] === '}') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
const config = JSON.parse(t.slice(at, end));
/* The second argument is the document, stored as a JSON string. */
const strStart = t.indexOf('"', end);
const html = JSON.parse(t.slice(strStart, t.indexOf('</script>', strStart) - 1));
console.log('config keys:', Object.keys(config).join(', '));
console.log('html length:', html.length);
const b = html.indexOf('<body');
console.log(html.slice(b, b + 2600));
