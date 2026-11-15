export const locales=Object.freeze([
 {code:'zh',label:'中文',tag:'zh-CN'}, {code:'en',label:'English',tag:'en'},
 {code:'fr',label:'Français',tag:'fr'}, {code:'es',label:'Español',tag:'es'},
 {code:'de',label:'Deutsch',tag:'de'}, {code:'it',label:'Italiano',tag:'it'},
 {code:'pt',label:'Português',tag:'pt'}
]);
export const isLocale=value=>locales.some(locale=>locale.code===value);
export function normalizeLocale(value){return value==='zh-CN'?'zh':isLocale(value)?value:'zh';}
export const baseLocale=value=>normalizeLocale(value)==='en'?'en':'zh';
export const localeTag=value=>locales.find(locale=>locale.code===normalizeLocale(value)).tag;
export const localeLabel=value=>locales.find(locale=>locale.code===normalizeLocale(value)).label;
export const optionMarkup=()=>locales.map(locale=>`<option value="${locale.code}" lang="${locale.tag}">${locale.label}</option>`).join('');
export const normalizeText=value=>String(value).replace(/\s+/g,'').trim();
const escapeRE=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const words={
 zh:['章','已回顾','已交谈','份材料已回顾','已连接','语言','译文暂时无法加载，请重试。','重试'],
 en:['Chapter','Reviewed:','Conversations:','documents reviewed','Connections:','Language','Translations could not load. Please retry.','Retry'],
 fr:['Chapitre','Consultés :','Conversations :','documents consultés','Liens :','Langue','Impossible de charger les traductions. Réessayez.','Réessayer'],
 es:['Capítulo','Revisados:','Conversaciones:','documentos revisados','Conexiones:','Idioma','No se pudieron cargar las traducciones. Inténtalo de nuevo.','Reintentar'],
 de:['Kapitel','Gelesen:','Gespräche:','Dokumente gelesen','Verbindungen:','Sprache','Die Übersetzungen konnten nicht geladen werden. Bitte erneut versuchen.','Erneut versuchen'],
 it:['Capitolo','Consultati:','Conversazioni:','documenti consultati','Collegamenti:','Lingua','Impossibile caricare le traduzioni. Riprova.','Riprova'],
 pt:['Capítulo','Consultados:','Conversas:','documentos consultados','Ligações:','Idioma','Não foi possível carregar as traduções. Tente novamente.','Tentar novamente']
};
export const localeUI=locale=>{const w=words[normalizeLocale(locale)];return {label:w[5],error:w[6],retry:w[7]};};
export function createTranslator(input,locale){
 const catalog=input instanceof Map?input:new Map(Object.entries(input));
 const shared=normalizeLocale(locale)==='zh'?{}:Object.fromEntries(Object.entries(sharedTranslations).map(([key,values])=>[key,values[['en','fr','es','de','it','pt'].indexOf(normalizeLocale(locale))]]));
 const values=new Map([...catalog,...Object.entries(shared)].map(([key,value])=>[normalizeText(key),value]));
 const affixes=[...catalog,...Object.entries(shared)].filter(([key])=>key.length>=2).sort((a,b)=>b[0].length-a[0].length);
 const templates=[];
 for(const [key,value] of [...catalog,...Object.entries(shared)]){
  if(!/\{\d+\}/.test(key))continue;
  const slots=[];let offset=0,pattern='^';
  for(const m of normalizeText(key).matchAll(/\{(\d+)\}/g)){pattern+=escapeRE(normalizeText(key).slice(offset,m.index))+'(.*?)';slots.push(m[1]);offset=m.index+m[0].length;}
  pattern+=escapeRE(normalizeText(key).slice(offset))+'$';templates.push({pattern:new RegExp(pattern),slots,value});
 }
 const language=normalizeLocale(locale),w=words[language];
 function translate(source,depth=0){
  const text=String(source),key=normalizeText(text);if(language==='zh'||depth>12)return text;
  if(values.has(key))return values.get(key);
  for(const template of templates){const m=key.match(template.pattern);if(m)return template.value.replace(/\{(\d+)\}/g,(token,n)=>m[template.slots.indexOf(n)+1]===undefined?token:translate(m[template.slots.indexOf(n)+1],depth+1));}
  if(!/\p{Script=Han}/u.test(text))return text;
  // Preserve a notebook body as one authored entry before splitting its lines.
  const colon=text.indexOf('：');if(colon>0){const head=normalizeText(text.slice(0,colon)),body=normalizeText(text.slice(colon+1));if(values.has(head)&&values.has(body))return values.get(head)+': '+values.get(body);}
  let m=text.match(/^第([1-8一二三四五六七八])章(.*)$/s);
  if(m){const number='一二三四五六七八'.indexOf(m[1])+1||Number(m[1]);return w[0]+' '+number+translate(m[2],depth+1).replace(/^\s*[｜：]\s*/, ' · ');}
  m=text.match(/^(已回顾|已交谈|已连接)\s*(\d+\s*\/\s*\d+)$/);if(m)return w[{'已回顾':1,'已交谈':2,'已连接':4}[m[1]]]+' '+m[2];
  m=text.match(/^(\d+\s*\/\s*\d+)\s*份材料已回顾$/);if(m)return m[1]+' '+w[3];
  m=text.match(/^(\d{4})年(\d{1,2})月(?:(\d{1,2})日)?$/);if(m){const date=new Date(Date.UTC(+m[1],+m[2]-1,+(m[3]||1)));return new Intl.DateTimeFormat(language,{year:'numeric',month:'long',...(m[3]?{day:'numeric'}:{}),timeZone:'UTC'}).format(date);}
  m=text.match(/^(\d{4})年$/);if(m)return m[1];
  m=text.match(/^(\d{4})年(\d{1,2})月至(\d{1,2})月$/);if(m)return translate(m[1]+'年'+m[2]+'月',depth+1)+'–'+translate(m[1]+'年'+m[3]+'月',depth+1);
  m=text.match(/^(\d{4})[—–-](\d{4})年$/);if(m)return m[1]+'–'+m[2];
  m=text.match(/^(.*)(，已读|，已交谈)$/s);if(m)return translate(m[1],depth+1)+translate(m[2],depth+1);
  m=text.match(/^对应正确。(.*)$/s);if(m)return translate('对应正确。',depth+1)+' '+translate(m[1],depth+1);
  m=text.match(/^(.*?)《(.+)》$/s);if(m)return (m[1]?translate(m[1],depth+1)+' · ':'')+translate(m[2],depth+1);
  for(const [prefix,value] of catalog)if(prefix.endsWith('：')&&prefix.length<40&&text.startsWith(prefix)&&text!==prefix)return value+translate(text.slice(prefix.length),depth+1);
  m=text.match(/^([ABC][.．、]?\s*|\d+[.．、]\s*)(.+)$/s);if(m&&values.has(normalizeText(m[2])))return m[1]+translate(m[2],depth+1);
  const sentences=text.match(/[^。！？]+[。！？]|[^。！？]+$/g);
  if(sentences?.length>1&&sentences.every(part=>!/[\p{Script=Han}]/u.test(part)||values.has(normalizeText(part))))return sentences.map(part=>translate(part,depth+1)).join(' ');
  m=text.match(/^(\s*[·，：:]\s*)(.+)$/s);if(m)return m[1].replace('：',': ')+translate(m[2],depth+1);
  // A component may concatenate a complete translated label with a status or hint.
  // Preserve known multi-part place names before splitting generic separators.
  for(const [prefix,value] of affixes)if(text.startsWith(prefix)&&text!==prefix&&/^[\s·，：:（(—–]/u.test(text.slice(prefix.length)))return value+translate(text.slice(prefix.length),depth+1);
  // Only complete known pieces are combined; unknown prose stays visible to coverage checks.
  for(const separator of ['\n',' → ',' · ','｜','：'])if(text.includes(separator))return text.split(separator).map(part=>translate(part,depth+1)).join(separator==='｜'?' · ':separator==='：'?': ':separator);

  return text;
 }
 return translate;
}
export function createLocaleController({initial='zh',load,commit}){
 let language=normalizeLocale(initial),epoch=0;
 return {get language(){return language;},async select(value){
  if(!isLocale(value)&&value!=='zh-CN')throw Error('Unsupported language');
  const next=normalizeLocale(value),ticket=++epoch;
  let data;try{data=await load(next);}catch(error){if(ticket!==epoch)return false;throw error;}
  if(ticket!==epoch)return false;
  await commit(next,data);language=next;return true;
 }};
}
export async function fetchLocaleCatalog(locale){
 throw Error('SCOPED_CATALOG_REQUIRED');
}

const sharedTranslations={"全屏":["Fullscreen","Plein écran","Pantalla completa","Vollbild","Schermo intero","Ecrã inteiro"],"退出全屏":["Exit fullscreen","Quitter le plein écran","Salir de pantalla completa","Vollbild verlassen","Esci da schermo intero","Sair do ecrã inteiro"],"配乐：开":["Music: on","Musique : activée","Música: activada","Musik: an","Musica: attiva","Música: ligada"],"配乐：关":["Music: off","Musique : désactivée","Música: desactivada","Musik: aus","Musica: disattiva","Música: desligada"],"地图背景音乐音量":["Map music volume","Volume de la musique de la carte","Volumen de la música del mapa","Lautstärke der Kartenmusik","Volume della musica della mappa","Volume da música do mapa"],"声音未能加载，点击重试":["Audio unavailable. Click to retry.","Son indisponible. Cliquez pour réessayer.","Audio no disponible. Pulsa para reintentar.","Audio nicht verfügbar. Zum Wiederholen klicken.","Audio non disponibile. Premi per riprovare.","Áudio indisponível. Clique para tentar novamente."],"地图资料":["Map information","Informations sur la carte","Información del mapa","Karteninformationen","Informazioni sulla mappa","Informações do mapa"],"法国国家地形图":["Terrain map of France","Carte du relief de la France","Mapa del relieve de Francia","Geländekarte Frankreichs","Mappa del rilievo della Francia","Mapa do relevo de França"],"可旋转的法国真实高程地图":["Rotatable elevation map of France","Carte du relief de la France orientable","Mapa de elevación de Francia giratorio","Drehbare Höhenkarte Frankreichs","Mappa altimetrica ruotabile della Francia","Mapa de altitude de França com rotação"],"地图视角":["Map view","Vue de la carte","Vista del mapa","Kartenansicht","Vista della mappa","Vista do mapa"],"复位视角":["Reset view","Réinitialiser la vue","Restablecer vista","Ansicht zurücksetzen","Ripristina vista","Repor vista"],"放大":["Zoom in","Agrandir","Acercar","Vergrößern","Ingrandisci","Ampliar"],"缩小":["Zoom out","Réduire","Alejar","Verkleinern","Riduci","Reduzir"],"切换平移":["Toggle pan","Activer le déplacement","Activar desplazamiento","Verschieben umschalten","Attiva spostamento","Alternar deslocamento"],"北向随地图旋转":["North follows map rotation","Le nord suit la rotation de la carte","El norte sigue la rotación del mapa","Norden folgt der Kartendrehung","Il nord segue la rotazione della mappa","O norte acompanha a rotação do mapa"],"山河之间，{0}":["A country in revolution · {0}","Entre monts et rivières · {0}","Entre montañas y ríos · {0}","Zwischen Bergen und Flüssen · {0}","Tra monti e fiumi · {0}","Entre montanhas e rios · {0}"],"八章与特别篇均提供中英文正文，进入章节后沿用当前语言。地图时间轴展示1789—1799，后续章节从本目录进入。":["All eight chapters and the special episodes use your selected language. The map timeline covers 1789–1799; later chapters are available here.","Les huit chapitres et les épisodes spéciaux utilisent la langue choisie. La carte couvre 1789–1799 ; les chapitres suivants sont accessibles ici.","Los ocho capítulos y los episodios especiales usan el idioma elegido. La cronología del mapa abarca 1789–1799; los capítulos posteriores se abren aquí.","Alle acht Kapitel und die Sonderfolgen verwenden die gewählte Sprache. Die Kartenzeitleiste umfasst 1789–1799; spätere Kapitel sind hier zugänglich.","Gli otto capitoli e gli episodi speciali usano la lingua scelta. La cronologia della mappa copre il periodo 1789–1799; i capitoli successivi sono accessibili qui.","Os oito capítulos e os episódios especiais usam o idioma escolhido. A cronologia do mapa abrange 1789–1799; os capítulos posteriores estão disponíveis aqui."],"回顾第{0}章{1}":["Review Chapter {0}{1}","Revoir le chapitre {0}{1}","Repasar el capítulo {0}{1}","Kapitel {0} wiederholen{1}","Ripassa il capitolo {0}{1}","Rever o capítulo {0}{1}"],"旧材料 · 第{0}章{1}":["Documents · Chapter {0}{1}","Documents · Chapitre {0}{1}","Documentos · Capítulo {0}{1}","Dokumente · Kapitel {0}{1}","Documenti · Capitolo {0}{1}","Documentos · Capítulo {0}{1}"],"记忆 · 第{0}章{1}":["Memory · Chapter {0}{1}","Souvenir · Chapitre {0}{1}","Recuerdo · Capítulo {0}{1}","Erinnerung · Kapitel {0}{1}","Ricordo · Capitolo {0}{1}","Memória · Capítulo {0}{1}"],"为什么会走到“{0}”？":["Why did this lead to “{0}”?","Pourquoi en est-on arrivé à « {0} » ?","¿Por qué se llegó a «{0}»?","Warum führte dies zu „{0}“?","Perché si è arrivati a «{0}»?","Porque se chegou a «{0}»?"],"从“{0}”出发，点击下一格，想一想它为什么发生。":["Start with “{0}”. Click the next scene and think about why it happened.","Partez de « {0} ». Cliquez sur la case suivante et réfléchissez à ses causes.","Empieza por «{0}». Pulsa en la siguiente casilla y piensa por qué ocurrió.","Beginne bei „{0}“. Klicke auf das nächste Feld und überlege, warum es dazu kam.","Parti da «{0}». Premi sulla casella successiva e rifletti sul perché è accaduto.","Comece por «{0}». Clique na casa seguinte e pense por que aconteceu."],"正文：支持七种语言":["Story: available in seven languages","Récit : disponible en sept langues","Texto: disponible en siete idiomas","Text: in sieben Sprachen verfügbar","Testo: disponibile in sette lingue","Texto: disponível em sete idiomas"]};

export async function fetchSpecialCatalog(host,code){
 const tag=localeTag(code);if(host.locales[tag])return host.locales[tag];
 const path=host.chapter.localePaths[tag];if(!path)throw Error('Unsupported episode language');
 const response=await fetch(new URL(path,host.packageURL));if(!response.ok)throw Error('Episode translations unavailable');
 const data=await response.json(),keys=Object.keys(host.locales['zh-CN']);
 if(!data||typeof data!=='object'||Array.isArray(data)||keys.some(key=>typeof data[key]!=='string'||!data[key].trim()))throw Error('Incomplete episode translations');
 host.locales[tag]=data;return data;
}


