/*
 * The text of a card, without the markup.
 *
 * A description can arrive as paragraphs.  The detail panel keeps that
 * shape, but a card folds the description to two lines, and there the
 * tags themselves would be the thing the reader sees.  So the card reads
 * the words and drops the tags.
 */
const plain=value=>String(value??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
