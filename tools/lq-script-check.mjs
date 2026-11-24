/*
 * A lesson is only good if its scripts still read well.
 *
 * Every lesson is put through the compiler before it is kept, so that
 * a change which would stop a lesson from running is caught at once
 * and can be put back the way it was.
 */
import vm from 'node:vm';

/*
 * The module wording is taken out, because the module form cannot be
 * read as an ordinary script.
 */
export const asScript = (body) =>
  body
    .replace(/\bimport\b[^;'"]*?['"][^'"]*['"]\s*;?/g, ';')
    .replace(/\bexport\s*\{[^}]*\}\s*;?/g, ';')
    .replace(/\bexport\s+default\s+/g, 'const __default = ')
    .replace(/\bexport\s+/g, '');

/*
 * Read a program that stands on its own, in a file of its own.
 */
export function checkProgram(text) {
  try {
    new vm.Script(asScript(text));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e.message).split('\n')[0] };
  }
}

/* The scripts of a page, each on its own. */
export function scriptsOf(html) {
  const out = [];
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const type = (/\btype\s*=\s*("([^"]*)"|'([^']*)')/i.exec(m[1] || '') || [])[2] ??
      (/\btype\s*=\s*("([^"]*)"|'([^']*)')/i.exec(m[1] || '') || [])[3] ??
      '';
    const body = m[2] || '';
    if (!body.trim()) continue;
    /* A block of data is not a program and is not read as one. */
    if (type && !/^(?:text\/javascript|text\/ecmascript|application\/javascript|module)$/i.test(type)) {
      continue;
    }
    out.push(body);
  }
  return out;
}

/*
 * Read every script of a page.
 *
 * The answer says whether the page is sound and, when it is not, which
 * script is at fault and why.
 */
export function checkScripts(html) {
  const scripts = scriptsOf(html);
  for (let i = 0; i < scripts.length; i++) {
    try {
      new vm.Script(asScript(scripts[i]), { filename: `script-${i + 1}` });
    } catch (e) {
      return { ok: false, script: i + 1, error: String(e.message).split('\n')[0] };
    }
  }
  return { ok: true, scripts: scripts.length };
}
