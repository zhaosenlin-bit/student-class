/*
 * The shop model, out of the catalogue.
 *
 * The page a reader sees is already a plain library: no prices, no
 * checkout, no refunds, no membership.  But the catalogue file the
 * browser downloads still carried the desk behind it — a price on
 * every lesson, a set of paid course packs, a trial clock on a
 * handful of lessons, refund wording and the seller's licence number.
 *
 * None of it is true of this library, so none of it stays in the file.
 * The keys the shell still reads keep their names and their meaning:
 * `downloadMode` still says "this is a library you can download from",
 * and the access flags still say which lessons are on this machine.
 * Everything that only made sense on a shelf where things cost money
 * is removed outright.
 */

/* Keys that only ever described a purchase. */
const SHOP_PRODUCT_KEYS = [
  'price',
  'originalPrice',
  'usageTerm',
  'promotion',
  'timedFree',
  'freeSample',
  'accessState',
  'canPurchase',
  'canFeedback',
  'feedbackRequiresPurchase',
];

/* Keys that described the catalogue as a place where things are sold. */
const SHOP_CATALOG_KEYS = [
  'bundles',
  'downloadPlans',
  'downloadUpgradePolicy',
  'downloadRefundPolicyVersion',
  'downloadRefundNotice',
  'downloadAccount',
  'channels',
  'selling',
  'salesMode',
  'seller',
  'creditCode',
  'support',
];

/*
 * A lesson that is on this machine is open: it can be previewed and it
 * can be taken away.  A lesson that is not on this machine says why,
 * and the reason is "it is not here", never "it was not paid for".
 */
function freeOne(product) {
  for (const key of SHOP_PRODUCT_KEYS) delete product[key];
  if ('mode' in product) product.mode = 'free';
  if ('downloadReason' in product) product.downloadReason = '';
  if ('localReason' in product) product.localReason = '';
  return product;
}

/*
 * The two large courseware packs kept the name of the shelf they were
 * mirrored from.  The catalogue the browser downloads says where a
 * lesson came from in a word; that word was another site's name, and
 * this library does not point at anybody else's shelf.  The packs get
 * a name of their own, and the credit stays where it belongs — in the
 * NOTICE files next to the material itself.
 */
const PACK_NAMES = {
  aifunengjiaoyu: 'studio',
  xbjiaoyu: 'library',
};

export function stripShopData(catalog) {
  if (!catalog || typeof catalog !== 'object') return catalog;

  for (const key of SHOP_CATALOG_KEYS) delete catalog[key];

  for (const product of catalog.products || []) {
    freeOne(product);
    if (product.source && PACK_NAMES[product.source]) {
      product.source = PACK_NAMES[product.source];
    }
  }

  return catalog;
}

/*
 * The same file, read and cleaned in place.  Used by the tool that
 * cleans a catalogue which is already on disk.
 */
export function stripShopDataFile(text) {
  return JSON.stringify(stripShopData(JSON.parse(text)));
}

