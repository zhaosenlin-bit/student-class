/*
 * Reading and writing the strings inside a program.
 *
 * A string written in a program may hold a line break, a quote or a
 * backslash.  Those are written as two characters.  When the wording
 * is read the two characters become the thing they stand for, and when
 * the wording is written the two characters are made again.
 *
 * If this is not done carefully a line break ends the string in the
 * middle of a line, and the program stops.
 */

/* One escape inside a string. */
const ESCAPE = /\\(?:u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])/g;

/* What an escape stands for. */
const ESCAPE_VALUE = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
};

/*
 * Read a string without changing what it says.
 *
 * The walk goes through the string once, so an escape is read as one
 * thing and never as two.  A backslash that stands for a backslash is
 * not mistaken for the start of another escape.
 */
export function readLiteral(raw) {
  let out = '';
  let last = 0;
  ESCAPE.lastIndex = 0;
  let m;
  while ((m = ESCAPE.exec(raw)) !== null) {
    out += raw.slice(last, m.index);
    const body = m[0].slice(1);
    if (body.length === 1 && Object.prototype.hasOwnProperty.call(ESCAPE_VALUE, body)) {
      out += ESCAPE_VALUE[body];
    } else if (body.length === 1 && /['"`\\/]/.test(body)) {
      out += body;
    } else if (/^u\{[0-9a-fA-F]+\}$/.test(body)) {
      out += String.fromCodePoint(parseInt(body.slice(2, -1), 16));
    } else if (/^u[0-9a-fA-F]{4}$/.test(body)) {
      out += String.fromCharCode(parseInt(body.slice(1), 16));
    } else {
      /* An escape that is not one is kept as it was written. */
      out += m[0];
    }
    last = m.index + m[0].length;
  }
  out += raw.slice(last);
  return out;
}

/*
 * Write a string back so that it says the same thing.
 *
 * The quote that holds the string decides how the characters inside
 * are written.  A line break inside a string has to be written as the
 * two characters that stand for it, or the string ends in the middle
 * of a line and the program stops.
 */
export function writeLiteral(value, quote) {
  let out = value.replace(/\\/g, '\\\\');
  if (quote === "'") out = out.replace(/'/g, "\\'");
  else if (quote === '"') out = out.replace(/"/g, '\\"');
  else out = out.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  out = out
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '\\0')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return out;
}
