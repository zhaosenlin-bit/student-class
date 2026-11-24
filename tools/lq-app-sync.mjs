/*
 * Keeping the page and the library in step.
 *
 * The catalogue and the folder of lessons are two things, and a page that
 * is left open for a while can see them drift apart: a lesson is added or
 * taken away, the server is told, and the page goes on showing the list it
 * was handed when it opened.  A card for a lesson that is no longer on the
 * disk leads nowhere — the reader opens it and gets an empty frame.
 *
 * So the page asks the server, before every page it draws, whether its copy
 * of the catalogue is still the good one.  The server answers with the mark
 * it gave out last time: "not changed" is one line, and the reader sees the
 * list as it is now rather than as it was when the page opened.
 *
 * The patch lives in its own file so that the build and the live shell
 * carry the same words.
 */

export function patchAppSync(js) {
  /* The mark of the catalogue the page is holding. */
  js = js.replace('let catalog=[],info={},', "let catalog=[],catalogEtag='',info={},");

  /*
   * Only the catalogue carries a mark; the other answers do not, and a mark
   * from some other answer must not be mistaken for one.
   */
  const helpers =
    '\n/* The mark of the catalogue this page is holding. */\n'
    + "const rememberEtag=(r,url)=>{if(url!=='/api/catalog')return;"
    + "const e=r.headers.get('etag');if(e)catalogEtag=e;};\n"
    + '/* Ask the server whether the list in this page is still the good one. */\n'
    + "async function syncCatalog(){try{const r=await fetch('/api/catalog',"
    + "{headers:catalogEtag?{'If-None-Match':catalogEtag}:{}});"
    + 'if(r.status===304||!r.ok)return false;'
    + "const data=await r.json();rememberEtag(r,'/api/catalog');"
    + 'info=data;syncPromotionClock(data.serverTime);catalog=data.products;'
    + 'downloadBulk.invalidate();legalFooter();return true;}catch{return false;}}\n';
  js = js.replace(
    "async function refreshCatalog(){info=await api('/api/catalog');",
    helpers + "async function refreshCatalog(){info=await api('/api/catalog');"
  );

  /* The answer that comes back is stamped, so the page knows its mark. */
  js = js.replace(
    'body:body?JSON.stringify(body):undefined});const data=await r.json();',
    'body:body?JSON.stringify(body):undefined});rememberEtag(r,url);const data=await r.json();'
  );

  /* Every page is drawn against the list as it is now. */
  js = js.replace(
    'async function route(){const serial=++routeSerial;',
    'async function route(){const serial=++routeSerial;await syncCatalog();'
  );

  /*
   * A lesson that is not on the disk answers the call with "not found".
   * That is a plain statement about the library, not a failure to report,
   * so it is written as a page with a way back instead of an error.
   */
  js = js.replace(
    "if(error.code==='PHONE_BINDING_REQUIRED'){introPage(id);await phone.open('bind');return;}throw error;}",
    "if(error.code==='PHONE_BINDING_REQUIRED'){introPage(id);await phone.open('bind');return;}"
      + "if(error.status===404){$('#main').innerHTML='<div class=\"empty\"><h2>这份课件不在本地课件库里</h2>"
      + '<a class="button" href="#catalog">返回课件库</a></div>\';return;}throw error;}'
  );

  for (const marker of [
    'async function syncCatalog(){',
    'const rememberEtag=(r,url)=>',
    'await syncCatalog();',
    '这份课件不在本地课件库里',
  ]) {
    if (!js.includes(marker)) throw new Error('app.js patch missed: ' + marker);
  }
  return js;
}
