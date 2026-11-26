/*
 * The shop's own machinery, named once.
 *
 * A lesson that was made on a platform comes with the platform's
 * shop window attached: the price list, the membership papers, the
 * invoices, the back office, the points wallet, and the application
 * that ties them together.  None of it is part of the lesson, none
 * of it is ever asked for, and it has no business going out with a
 * download.
 *
 * The names are written out one by one on purpose.  A pattern such
 * as "admin-*.js" would also catch a lesson of one's own; a list of
 * the exact names cannot.
 *
 * The names are the ones a reader sees inside the file that is taken
 * away, so the same rule works for a lesson that keeps its own copy
 * and for one that shares the copy in the pool.
 */

const EXACT = new Set([
  'assets/js/admin-coupons.js',
  'assets/js/admin-orders.js',
  'assets/js/admin-teacher-settlements.js',
  'assets/js/points-history.js',
  'assets/js/points-wallet-v1.js',
  'assets/finance/index.mjs',
  'assets/invoices/index.mjs',
  'assets/invoices/style.css',
]);

const PREFIX = ['assets/premium-catalogue/'];
const PATTERN = /^assets\/assets\/app\..*\.min\.js$/;

export function isPlatformFile(name) {
  const rel = String(name || '').split('\\').join('/');
  return (
    EXACT.has(rel) ||
    PATTERN.test(rel) ||
    PREFIX.some((p) => rel.startsWith(p))
  );
}

export const PLATFORM_EXACT = EXACT;
export const PLATFORM_PREFIX = PREFIX;
