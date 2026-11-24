/*
 * Telling the words of a reader apart from the marks on the page.
 *
 * A line of signs and numbers is a formula.  The name of a book and
 * its author is a name.  A short word that is only the name of a
 * part of the program is not something a reader reads.  None of these
 * are given a Chinese wording, because none of them are wording.
 */

const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;

const SKIP_EXACT = new Set([
  'JSON', 'Mode:', 'is an', ', the', 'the', 'and', 'sin', 'cos', 'tan',
  'min', 'max', 'const', 'NaOH', 'NaCl', 'KCl', 'Ca(NO', 'CuSO', '(kr)Y',
  'mgh_B', '3d_xz', 'L/mH', 'f/Hz', 'm/kg', 'y/mm', 'x/mm', 'h/mm',
  'rad/s', 'sinθ₂', '|cosθ', '|proj', '|sinθ', '0,min', '2 min', '5 min',
  'HNO₃', 'H₂CO₃', 'HCO₃⁻', 'tot', 'III', 'EXP', 'MISC', 'VIEW', 'SHAPE',
  'HEAD', 'TAIL', 'SOMA', 'AXON', 'Gland', 'Ctrl', 'Del', 'JSON', 'PNG'
]);

/* The name of a file that the page happens to show. */
const isFileName = (s) =>
  /\.(html?|png|jpe?g|gif|svg|webp|glb|gltf|json|csv|txt|js|css|xml|ico|mp3|mp4|wav|woff2?|ttf|obj|mtl)$/i.test(
    s.trim()
  ) ||
  /^[^\s]*\/[^\s/]+\.[a-z0-9]{2,5}$/i.test(s.trim());

/* A formula written in the notation of the mathematics pages. */
const isMaths = (s) =>
  /\\[a-zA-Z]+/.test(s) ||
  /^\$[^$]*\$$/.test(s.trim()) ||
  s.includes('&#') ||
  /&(?:gt|lt|amp|quot);/.test(s) ||
  /[×÷√²³∫∑≤≥≠±→₀-₉]/.test(s) ||
  /[λμσθφαβγδωΩΔπ]/.test(s) ||
  /\b(?:sin|cos|tan|asin|acos|atan|arcsin|arccos|arctan|log|ln|sqrt|exp)\s*\(/.test(s);

/* The name of something in the program, such as h_drop. */
const isIdentifier = (s) => /[A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]+/.test(s);

/* A piece of markup that was cut in half. */
const isBrokenMarkup = (s) => /<\/?[a-zA-Z]/.test(s) || /script>$/i.test(s.trim());

/* A chemical written as its letters. */
const isChemistry = (s) => {
  const t = s.trim();
  if (t.length < 3) return false;
  if (!/^[A-Z][a-z](?:[A-Z][a-z]?)*(?:\([A-Za-z]*\))?[₀-₉0-9]*$/.test(t)) return false;
  return true;
};

/* The name a program gives one of its own parts. */
const isMarker = (s) => /^Marker-\d+$/i.test(s.trim());

/* A name written in pinyin. */
const isPinyin = (s) => /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u.test(s);

/* The signs that hold a formula together. */
const SIGNS = /^[\s\d.,;:'"()[\]/*+=^°′″\-–—<>|{}ΩθφαβγλμσΔ×÷≈≤≥]+$/;

/* The words a piece of text is made of. */
const tokens = (s) => s.match(/[A-Za-z]+/g) || [];

/*
 * A formula is short and made of short words: "I = V / R", "a = 6 cm".
 * A sentence that happens to hold a number is still a sentence.
 */
const isFormula = (s) => {
  if (!/[=⇒∫∂√∑→]/.test(s)) return false;
  return tokens(s).every((t) => t.length <= 3);
};

/* A group of short words that holds a number is a measure, not wording. */
const isMeasure = (s) => {
  const t = tokens(s);
  if (t.length < 2) return false;
  if (!t.every((w) => w.length <= 3)) return false;
  return /[\d°²³/]/.test(s);
};

export function worthWording(s) {
  if (!s) return false;
  if (CJK.test(s)) return false;
  if (SKIP_EXACT.has(s)) return false;
  /* A picture that is only worth its bytes. */
  if (/^(data:image|https?:|\/\/)/i.test(s)) return false;
  /* A file, a formula, a name of a part: none of them are wording. */
  if (isFileName(s)) return false;
  if (isMaths(s)) return false;
  if (isIdentifier(s)) return false;
  if (isMarker(s)) return false;
  if (isChemistry(s)) return false;
  if (isPinyin(s)) return false;
  if (isBrokenMarkup(s)) return false;
  /* The name of a book and its author. */
  if (/^[A-Z][A-Za-z]{1,14},\s*[A-Z]\./.test(s)) return false;
  /* A line of signs and numbers. */
  if (SIGNS.test(s)) return false;
  /* A formula and a measure are left as they are. */
  if (isFormula(s)) return false;
  if (isMeasure(s)) return false;
  /* A short lower-case word is usually the name of a part. */
  if (s.length <= 3 && /^[a-z]+$/.test(s)) return false;
  return true;
}

export { SKIP_EXACT };
