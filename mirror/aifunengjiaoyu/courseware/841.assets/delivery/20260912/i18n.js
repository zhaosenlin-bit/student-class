import {loadLocaleForPage,fetchScopedLocale} from './france-locale-requests.mjs';
import {normalizeLocale,isLocale,localeTag,optionMarkup,localeUI,createTranslator,createLocaleController,fetchLocaleCatalog} from './locale-core.js';
// Presentation-only localization. The story data, save schema, event handlers,
// cylinder coordinates and live media objects remain owned by each chapter.
const KEY='frenchRevolution.language',han=/\p{Script=Han}/u;
import {normalize,createEnglish,loadEnglishCatalog} from './localization-core.js';
if(!document.querySelector('link[href="i18n.css"],[data-i18n-style]')){
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./i18n.css',import.meta.url);style.dataset.i18nStyle='';document.head.append(style);
}
let language='zh',available=true;
try{language=normalizeLocale(localStorage.getItem(KEY));}catch{}
const catalog=new Map();
async function readScopedCatalog(code){
 return loadLocaleForPage(window.location.href,code,async relative=>{
  return fetchScopedLocale(new URL(relative,import.meta.url));
 });
}
async function readCatalog(){
 await loadEnglishCatalog(catalog,['current-chapter'],()=>readScopedCatalog('en'));
}
if(language==='en')try{await readCatalog();}catch{available=false;}
const localeCache=new Map();let targetTranslate=value=>value;
async function readTargetCatalog(code){return readScopedCatalog(code);}
if(!['zh','en'].includes(language))try{const data=await readTargetCatalog(language);localeCache.set(language,data);targetTranslate=createTranslator(data,language);available=true;}catch{available=false;}
else if(language==='zh')available=true;

const translate=createEnglish(catalog);
export function english(source){
 const text=String(source),key=normalize(text);
 if(catalog.has(key))return catalog.get(key);
 // A notebook combines two authored entries. Keep its complete body intact
 // before the generic translator splits line breaks, arrows or other separators.
 const colon=text.indexOf('：');
 if(colon>0){const label=normalize(text.slice(0,colon)),body=normalize(text.slice(colon+1));if(catalog.has(label)&&catalog.has(body))return catalog.get(label)+': '+catalog.get(body);}
 return translate(text);
}
const englishUI=createTranslator({},'en');
export const t=s=>language==='en'?englishUI(english(s)):language==='zh'?s:targetTranslate(s);
const texts=new WeakMap(),blocks=new WeakMap(),attributes=new WeakMap();
const ignored=e=>e?.closest('script,style,pre,code,[data-i18n-ignore]');
const aliases={
 '平等':['equality','equal'], '权利上平等':['equal in rights'],
 '国民议会':['the National Assembly','National Assembly'],
 '三级会议':['the Estates-General','Estates-General'],
 '第三等级':['the Third Estate','Third Estate'],
 '法律和权利':["rights or treatment under the law"],
 '国民':['the nation'], '国家权力':['state power'],
 '来自国民':['comes from the nation'], '权力来源':['the source of power'],
 '生活':['everyday hardship','everyday life'],
 '经济':['economic'], '供应问题':['supply problem','supply problems'],
 '基本权利':['basic rights'], '自由':['liberty','freedom'],
 '别人的权利':['the rights of others'],
 '个人':['individuals'], '新的规则':['new rules'],
 '受到保护':['protected'], '不会因此自动消失':['would not disappear automatically'],
 '不等于':['does not mean'], '保留国王':['keeps a king','retain the king'],
 '王权暂停':['royal power was suspended'], '正式废除君主制':['formally abolished the monarchy'],
 '共和国建立':['the Republic was established'], '路易十六被处决':['Louis XVI was executed']
};
function renderMarked(element,record){
 const fragment=document.createDocumentFragment(),translated=t(record.source);
 const terms=record.marks.flatMap(m=>[t(m.text),...(language==='en'?aliases[m.text]||[]:[])].filter(s=>!han.test(s)).map(text=>({text,cls:m.cls})));
 terms.sort((a,b)=>b.text.length-a.text.length);
 if(!terms.length){element.textContent=translated;return;}
 const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('(^|[^\\p{L}\\p{N}])('+[...new Set(terms.map(t=>t.text))].map(escape).join('|')+')(?=$|[^\\p{L}\\p{N}])','giu');
 let offset=0;for(const match of translated.matchAll(pattern)){
  const position=match.index+match[1].length,matched=match[2];fragment.append(document.createTextNode(translated.slice(offset,position)));
  const mark=document.createElement('mark');mark.className=terms.find(t=>t.text.toLowerCase()===matched.toLowerCase()).cls;
  mark.textContent=matched;fragment.append(mark);offset=position+matched.length;
 }
 fragment.append(document.createTextNode(translated.slice(offset)));element.replaceChildren(fragment);
}
function apply(){
 // Wait for a complete catalog before recording translated blocks. A failed
 // first request must leave the original DOM available for a later retry.
 if(!available)return;
 observer.disconnect();
 const grouped=new Set();
 for(const element of document.querySelectorAll('p,h1,h2,h3,h4,blockquote,.speaker,li,strong,small,button')){
  if(ignored(element)||[...grouped].some(parent=>parent.contains(element)))continue;
  let record=blocks.get(element);
  if(record&&element.innerHTML!==record.last)record=null;
  if(!record&&element.querySelector('mark,br,.knowledge-term')&&[...element.querySelectorAll('*')].every(e=>['MARK','BR','SPAN','EM','STRONG'].includes(e.tagName))&&t(element.textContent)!==element.textContent){
   record={source:element.textContent,original:[...element.childNodes].map(n=>n.cloneNode(true)),marks:[...element.querySelectorAll('mark,.knowledge-term')].map(m=>({text:m.textContent,cls:m.className})),language:'zh',last:element.innerHTML};blocks.set(element,record);
  }
  if(record){
   if(record.language!==language){
    if(language!=='zh')renderMarked(element,record);else element.replaceChildren(...record.original.map(n=>n.cloneNode(true)));
    record.language=language;record.last=element.innerHTML;
   }
   grouped.add(element);
  }
 }
 const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
 while(walker.nextNode()){
  const node=walker.currentNode,parent=node.parentElement;
  if(ignored(parent)||[...grouped].some(e=>e.contains(node)))continue;
  let record=texts.get(node);if(!record||node.data!==record.last)record={source:node.data,last:node.data};
  const value=t(record.source);if(node.data!==value)node.data=value;record.last=value;texts.set(node,record);
 }
 for(const element of document.querySelectorAll('[aria-label],[title],[alt],[placeholder]')){
  if(ignored(element))continue;let records=attributes.get(element);if(!records){records={};attributes.set(element,records);}
  for(const attr of ['aria-label','title','alt','placeholder']){
   if(!element.hasAttribute(attr))continue;const current=element.getAttribute(attr);let record=records[attr];
   if(!record||current!==record.last)record={source:current,last:current};
   const value=t(record.source);if(value!==current)element.setAttribute(attr,value);record.last=value;records[attr]=record;
  }
 }
 for(const node of document.querySelectorAll('svg text.mind-node-copy,svg text.mind-center-copy,svg text.mind-center-title')){
  node.removeAttribute('textLength');node.removeAttribute('lengthAdjust');
  const width=node.classList.contains('mind-node-copy')?252:node.classList.contains('mind-center-copy')?225:205;
  if(language!=='zh'&&node.getComputedTextLength?.()>width){node.setAttribute('textLength',String(width));node.setAttribute('lengthAdjust','spacingAndGlyphs');}
 }
 observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt','placeholder']});
}
const observer=new MutationObserver(apply);
const toolbar=document.querySelector('#toolbar')||document.querySelector('header');

const button=document.createElement('select');button.id='language-toggle';button.dataset.i18nIgnore='';button.dataset.ui='';button.innerHTML=optionMarkup();
let localeError=null,retrying=false,failedLanguage=available?null:language;
const controller=createLocaleController({initial:language,load:async next=>{
 if(next==='zh')return null;
 if(next==='en'){if(!catalog.size||failedLanguage==='en')await readCatalog();return null;}
 if(!localeCache.has(next))localeCache.set(next,await readTargetCatalog(next));return localeCache.get(next);
},commit:(next,data)=>{
 language=next;available=true;failedLanguage=null;targetTranslate=data?createTranslator(data,next):value=>value;
 try{localStorage.setItem(KEY,next);}catch{}
 refreshControl();apply();document.dispatchEvent(new CustomEvent('app-languagechange',{detail:{language}}));
}});
function renderLocaleError(){
 localeError?.remove();localeError=null;if(!failedLanguage)return;
 const failed=failedLanguage;
 localeError=document.createElement('aside');localeError.className='locale-error';localeError.dataset.i18nIgnore='';localeError.dataset.ui='';localeError.setAttribute('role','alert');
 const message=document.createElement('p');message.textContent=failed==='en'?'English text could not load. Retry, or select 中文 to continue in Chinese.':localeUI(failed).error;
 const retry=document.createElement('button');retry.textContent=failed==='en'?(retrying?'Loading English…':'Retry English'):localeUI(failed).retry;retry.disabled=retrying;
 retry.onclick=async()=>{if(retrying)return;retrying=true;renderLocaleError();await setLanguage(failed);retrying=false;renderLocaleError();};
 localeError.append(message,retry);document.body.append(localeError);
}
function refreshControl(){
 document.documentElement.lang=localeTag(language);button.value=language;button.setAttribute('aria-label',localeUI(language).label);renderLocaleError();
}
let request=0;
async function setLanguage(value){
 if(!isLocale(value)&&value!=='zh-CN')return;
 const next=normalizeLocale(value),ticket=++request;button.setAttribute('aria-busy','true');
 try{await controller.select(next);}catch{if(ticket===request){failedLanguage=next;refreshControl();}}
 finally{if(ticket===request)button.removeAttribute('aria-busy');}
}
button.addEventListener('change',()=>setLanguage(button.value));
// Read-only diagnostics and a shared translator for chapter toolbar labels.
window.appLanguage=Object.freeze({translate:english,translateVisible:t,inspect:()=>({language,available,entries:language==='en'?catalog.size:Object.keys(localeCache.get(language)||{}).length,untranslated:[...document.querySelectorAll('body *')].filter(e=>!ignored(e)&&e.checkVisibility?.({checkVisibilityCSS:true})&&[...e.childNodes].some(n=>n.nodeType===3&&han.test(n.data))).map(e=>e.textContent.trim()).filter((s,i,a)=>a.indexOf(s)===i)})});
toolbar?.append(button);refreshControl();apply();
window.addEventListener('storage',event=>{if(event.key===KEY)void setLanguage(normalizeLocale(event.newValue));});
document.addEventListener('fr-delivery-settingschange',()=>{const next=normalizeLocale(localStorage.getItem(KEY));if(next!==language)void setLanguage(next);});
if(available)document.dispatchEvent(new CustomEvent('app-localeready'));
