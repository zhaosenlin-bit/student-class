/*
 * The words of a shop, out of a library.
 *
 * A few lessons were published with a note about what they cost and
 * how many free tries a reader gets.  Those sentences were true of the
 * shelf they came from, and they are not true here: every lesson in
 * this library can be opened and taken away, and none of them is for
 * sale.  So the sentences about prices, trials and memberships are
 * taken out — paragraph by paragraph, because a paragraph that only
 * says "no purchase needed" is a promise this library keeps, not a
 * price, and it stays.
 */

/* A paragraph that talks about money, trials or membership. */
const SHOP_PARAGRAPH = [
  /售价\s*[\d.]+\s*元/,
  /价格\s*[:：]?\s*[\d.]+\s*元/,
  /购买作品|可购买|购买后|需购买|要购买|付费后/,
  /会员权益|平台会员|会员可|VIP|开通会员/,
  /付费/,
  /试用|试看|普通用户/,
  /退款|售后/,
  /优惠价|促销价|限时优惠|折扣价|优惠券/,
];

const plainText = (html) =>
  String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

/*
 * A heading that only names a shop section, such as "试用与购买".
 */
const SHOP_HEADING =
  /^(试用与购买|购买与试用|试用说明|购买说明|价格与试用|会员与价格|价格说明|收费说明|购买与会员)$/;

/*
 * The sentences of a block, with the place each one sits in the plain
 * text.  The map from plain text back to the marked-up text is what
 * lets a sentence be taken out without taking the tags with it.
 */
function sentencesOf(plain) {
  const out = [];
  const re = /[^。！？!?；;]+[。！？!?；;]?/g;
  let match;
  while ((match = re.exec(plain))) {
    if (!match[0].trim()) continue;
    out.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
  }
  return out;
}

/* Where each character of the plain text sits in the marked-up text. */
function plainToRaw(raw) {
  const map = [];
  let plain = 0;
  let inTag = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '<') {
      inTag = true;
      continue;
    }
    if (ch === '>') {
      inTag = false;
      continue;
    }
    if (inTag) continue;
    map[plain++] = i;
  }
  map[plain] = raw.length;
  return map;
}

function removePlainRanges(raw, ranges) {
  if (!ranges.length) return raw;
  const map = plainToRaw(raw);
  const cuts = ranges
    .map(([start, end]) => [map[start] ?? raw.length, map[end] ?? raw.length])
    .sort((a, b) => b[0] - a[0]);
  let out = raw;
  for (const [from, to] of cuts) out = out.slice(0, from) + out.slice(to);
  return out;
}

/*
 * The description of a lesson is a little essay in HTML: a few
 * paragraphs, sometimes a heading in front of them.  The paragraphs
 * that talk about a shop are dropped, and so are the headings that
 * only introduce them.
 */
export function scrubShopCopy(html) {
  if (typeof html !== 'string' || !html) return html;
  if (!/售价|购买|会员|付费|试用|试看|退款|优惠|促销|折扣价/.test(html)) return html;

  const blocks = html.split(/(?=<p\b|<h[1-6]\b)/i);
  const kept = [];

  for (const block of blocks) {
    if (!block.trim()) continue;
    const text = plainText(block);
    if (!text) continue;

    /* A heading that only names a shop section goes with its section. */
    if (SHOP_HEADING.test(text)) continue;

    /* A whole paragraph about money goes; a paragraph with one such
       sentence keeps everything else. */
    const whole = SHOP_PARAGRAPH.some((re) => re.test(text));
    if (whole) {
      /* But keep the lesson's own words when they are in the same breath. */
      const parts = sentencesOf(text);
      const shop = parts.filter((s) => SHOP_PARAGRAPH.some((re) => re.test(s.text)));
      const keep = parts.filter((s) => !SHOP_PARAGRAPH.some((re) => re.test(s.text)));
      if (!keep.length) continue;
      const cleaned = removePlainRanges(block, shop.map((s) => [s.start, s.end]));
      if (!plainText(cleaned).trim()) continue;
      kept.push(cleaned);
      continue;
    }

    kept.push(block);
  }

  const out = kept.join('').trim();
  return out || html;
}

