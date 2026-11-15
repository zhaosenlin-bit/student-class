(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function t(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(r){if(r.ep)return;r.ep=!0;const s=t(r);fetch(r.href,s)}})();const Cl=Object.freeze([{code:"zh",label:"中文",tag:"zh-CN"},{code:"en",label:"English",tag:"en"},{code:"fr",label:"Français",tag:"fr"},{code:"es",label:"Español",tag:"es"},{code:"de",label:"Deutsch",tag:"de"},{code:"it",label:"Italiano",tag:"it"},{code:"pt",label:"Português",tag:"pt"}]),da=n=>Cl.some(e=>e.code===n);function Un(n){return n==="zh-CN"?"zh":da(n)?n:"zh"}const ha=n=>Un(n)==="en"?"en":"zh",Pl=n=>Cl.find(e=>e.code===Un(n)).tag,xh=()=>Cl.map(n=>`<option value="${n.code}" lang="${n.tag}">${n.label}</option>`).join(""),On=n=>String(n).replace(/\s+/g,"").trim(),bc=n=>n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),sd={zh:["章","已回顾","已交谈","份材料已回顾","已连接","语言","译文暂时无法加载，请重试。","重试"],en:["Chapter","Reviewed:","Conversations:","documents reviewed","Connections:","Language","Translations could not load. Please retry.","Retry"],fr:["Chapitre","Consultés :","Conversations :","documents consultés","Liens :","Langue","Impossible de charger les traductions. Réessayez.","Réessayer"],es:["Capítulo","Revisados:","Conversaciones:","documentos revisados","Conexiones:","Idioma","No se pudieron cargar las traducciones. Inténtalo de nuevo.","Reintentar"],de:["Kapitel","Gelesen:","Gespräche:","Dokumente gelesen","Verbindungen:","Sprache","Die Übersetzungen konnten nicht geladen werden. Bitte erneut versuchen.","Erneut versuchen"],it:["Capitolo","Consultati:","Conversazioni:","documenti consultati","Collegamenti:","Lingua","Impossibile caricare le traduzioni. Riprova.","Riprova"],pt:["Capítulo","Consultados:","Conversas:","documentos consultados","Ligações:","Idioma","Não foi possível carregar as traduções. Tente novamente.","Tentar novamente"]},Ta=n=>{const e=sd[Un(n)];return{label:e[5],error:e[6],retry:e[7]}};function Mh(n,e){const t=n instanceof Map?n:new Map(Object.entries(n)),i=Un(e)==="zh"?{}:Object.fromEntries(Object.entries(yo).map(([u,d])=>[u,d[["en","fr","es","de","it","pt"].indexOf(Un(e))]])),r=new Map([...t,...Object.entries(i)].map(([u,d])=>[On(u),d])),s=[...t,...Object.entries(i)].filter(([u])=>u.length>=2).sort((u,d)=>d[0].length-u[0].length),a=[];for(const[u,d]of[...t,...Object.entries(i)]){if(!/\{\d+\}/.test(u))continue;const h=[];let p=0,g="^";for(const v of On(u).matchAll(/\{(\d+)\}/g))g+=bc(On(u).slice(p,v.index))+"(.*?)",h.push(v[1]),p=v.index+v[0].length;g+=bc(On(u).slice(p))+"$",a.push({pattern:new RegExp(g),slots:h,value:d})}const o=Un(e),l=sd[o];function c(u,d=0){const h=String(u),p=On(h);if(o==="zh"||d>12)return h;if(r.has(p))return r.get(p);for(const f of a){const E=p.match(f.pattern);if(E)return f.value.replace(/\{(\d+)\}/g,(_,y)=>E[f.slots.indexOf(y)+1]===void 0?_:c(E[f.slots.indexOf(y)+1],d+1))}if(!new RegExp("\\p{Script=Han}","u").test(h))return h;const g=h.indexOf("：");if(g>0){const f=On(h.slice(0,g)),E=On(h.slice(g+1));if(r.has(f)&&r.has(E))return r.get(f)+": "+r.get(E)}let v=h.match(/^第([1-8一二三四五六七八])章(.*)$/s);if(v){const f="一二三四五六七八".indexOf(v[1])+1||Number(v[1]);return l[0]+" "+f+c(v[2],d+1).replace(/^\s*[｜：]\s*/," · ")}if(v=h.match(/^(已回顾|已交谈|已连接)\s*(\d+\s*\/\s*\d+)$/),v)return l[{已回顾:1,已交谈:2,已连接:4}[v[1]]]+" "+v[2];if(v=h.match(/^(\d+\s*\/\s*\d+)\s*份材料已回顾$/),v)return v[1]+" "+l[3];if(v=h.match(/^(\d{4})年(\d{1,2})月(?:(\d{1,2})日)?$/),v){const f=new Date(Date.UTC(+v[1],+v[2]-1,+(v[3]||1)));return new Intl.DateTimeFormat(o,{year:"numeric",month:"long",...v[3]?{day:"numeric"}:{},timeZone:"UTC"}).format(f)}if(v=h.match(/^(\d{4})年$/),v)return v[1];if(v=h.match(/^(\d{4})年(\d{1,2})月至(\d{1,2})月$/),v)return c(v[1]+"年"+v[2]+"月",d+1)+"–"+c(v[1]+"年"+v[3]+"月",d+1);if(v=h.match(/^(\d{4})[—–-](\d{4})年$/),v)return v[1]+"–"+v[2];if(v=h.match(/^(.*)(，已读|，已交谈)$/s),v)return c(v[1],d+1)+c(v[2],d+1);if(v=h.match(/^对应正确。(.*)$/s),v)return c("对应正确。",d+1)+" "+c(v[1],d+1);if(v=h.match(/^(.*?)《(.+)》$/s),v)return(v[1]?c(v[1],d+1)+" · ":"")+c(v[2],d+1);for(const[f,E]of t)if(f.endsWith("：")&&f.length<40&&h.startsWith(f)&&h!==f)return E+c(h.slice(f.length),d+1);if(v=h.match(/^([ABC][.．、]?\s*|\d+[.．、]\s*)(.+)$/s),v&&r.has(On(v[2])))return v[1]+c(v[2],d+1);const m=h.match(/[^。！？]+[。！？]|[^。！？]+$/g);if(m?.length>1&&m.every(f=>!/[\p{Script=Han}]/u.test(f)||r.has(On(f))))return m.map(f=>c(f,d+1)).join(" ");if(v=h.match(/^(\s*[·，：:]\s*)(.+)$/s),v)return v[1].replace("：",": ")+c(v[2],d+1);for(const[f,E]of s)if(h.startsWith(f)&&h!==f&&/^[\s·，：:（(—–]/u.test(h.slice(f.length)))return E+c(h.slice(f.length),d+1);for(const f of[`
`," → "," · ","｜","："])if(h.includes(f))return h.split(f).map(E=>c(E,d+1)).join(f==="｜"?" · ":f==="："?": ":f);return h}return c}function Sh({initial:n="zh",load:e,commit:t}){let i=Un(n),r=0;return{get language(){return i},async select(s){if(!da(s)&&s!=="zh-CN")throw Error("Unsupported language");const a=Un(s),o=++r;let l;try{l=await e(a)}catch(c){if(o!==r)return!1;throw c}return o!==r?!1:(await t(a,l),i=a,!0)}}}const yo={章节:["Chapters","Chapitres","Capítulos","Kapitel","Capitoli","Capítulos"],全部章节:["All chapters","Tous les chapitres","Todos los capítulos","Alle Kapitel","Tutti i capitoli","Todos os capítulos"],重置此章:["Reset chapter","Réinitialiser le chapitre","Reiniciar capítulo","Kapitel zurücksetzen","Ricomincia capitolo","Reiniciar capítulo"],全屏:["Fullscreen","Plein écran","Pantalla completa","Vollbild","Schermo intero","Ecrã inteiro"],退出全屏:["Exit fullscreen","Quitter le plein écran","Salir de pantalla completa","Vollbild verlassen","Esci da schermo intero","Sair do ecrã inteiro"],打开章节目录:["Open chapter menu","Ouvrir le sommaire","Abrir el índice","Kapitelübersicht öffnen","Apri l'indice","Abrir o índice"],章节工具栏:["Chapter controls","Commandes du chapitre","Controles del capítulo","Kapitelsteuerung","Comandi del capitolo","Controlos do capítulo"],返回全国地图:["Return to map","Retour à la carte","Volver al mapa","Zurück zur Karte","Torna alla mappa","Voltar ao mapa"],"配乐：开":["Music: on","Musique : activée","Música: activada","Musik: an","Musica: attiva","Música: ligada"],"配乐：关":["Music: off","Musique : désactivée","Música: desactivada","Musik: aus","Musica: disattiva","Música: desligada"],播放背景音乐:["Play background music","Activer la musique de fond","Reproducir música de fondo","Hintergrundmusik abspielen","Riproduci musica di sottofondo","Reproduzir música de fundo"],配乐音量:["Music volume","Volume de la musique","Volumen de la música","Musiklautstärke","Volume della musica","Volume da música"],播放环境声:["Play ambience","Activer les sons d'ambiance","Reproducir sonido ambiente","Umgebungsgeräusche abspielen","Riproduci suoni ambientali","Reproduzir sons ambiente"],背景音乐设置:["Music settings","Réglages de la musique","Ajustes de música","Musikeinstellungen","Impostazioni musicali","Definições de música"],背景音乐音量:["Music volume","Volume de la musique","Volumen de la música","Musiklautstärke","Volume della musica","Volume da música"],地图背景音乐音量:["Map music volume","Volume de la musique de la carte","Volumen de la música del mapa","Lautstärke der Kartenmusik","Volume della musica della mappa","Volume da música do mapa"],"声音未能加载，点击重试":["Audio unavailable. Click to retry.","Son indisponible. Cliquez pour réessayer.","Audio no disponible. Pulsa para reintentar.","Audio nicht verfügbar. Zum Wiederholen klicken.","Audio non disponibile. Premi per riprovare.","Áudio indisponível. Clique para tentar novamente."],声音随画面暂停:["Audio paused with the scene","Son en pause avec la scène","Audio pausado junto con la escena","Audio mit der Szene pausiert","Audio in pausa insieme alla scena","Áudio em pausa com a cena"],已关闭背景音乐:["Background music is off","Musique de fond désactivée","Música de fondo desactivada","Hintergrundmusik ausgeschaltet","Musica di sottofondo disattivata","Música de fundo desligada"],音乐连续播放:["Music is playing","Musique en cours","Música en reproducción","Musik läuft","Musica in riproduzione","Música em reprodução"],点击页面后播放:["Click the page to start audio","Cliquez sur la page pour lancer le son","Pulsa en la página para iniciar el audio","Auf die Seite klicken, um Audio zu starten","Premi sulla pagina per avviare l'audio","Clique na página para iniciar o áudio"],地图资料:["Map information","Informations sur la carte","Información del mapa","Karteninformationen","Informazioni sulla mappa","Informações do mapa"],法国国家地形图:["Terrain map of France","Carte du relief de la France","Mapa del relieve de Francia","Geländekarte Frankreichs","Mappa del rilievo della Francia","Mapa do relevo de França"],可旋转的法国真实高程地图:["Rotatable elevation map of France","Carte du relief de la France orientable","Mapa de elevación de Francia giratorio","Drehbare Höhenkarte Frankreichs","Mappa altimetrica ruotabile della Francia","Mapa de altitude de França com rotação"],地图视角:["Map view","Vue de la carte","Vista del mapa","Kartenansicht","Vista della mappa","Vista do mapa"],复位视角:["Reset view","Réinitialiser la vue","Restablecer vista","Ansicht zurücksetzen","Ripristina vista","Repor vista"],放大:["Zoom in","Agrandir","Acercar","Vergrößern","Ingrandisci","Ampliar"],缩小:["Zoom out","Réduire","Alejar","Verkleinern","Riduci","Reduzir"],切换平移:["Toggle pan","Activer le déplacement","Activar desplazamiento","Verschieben umschalten","Attiva spostamento","Alternar deslocamento"],北向随地图旋转:["North follows map rotation","Le nord suit la rotation de la carte","El norte sigue la rotación del mapa","Norden folgt der Kartendrehung","Il nord segue la rotazione della mappa","O norte acompanha a rotação do mapa"],"山河之间，{0}":["A country in revolution · {0}","Entre monts et rivières · {0}","Entre montañas y ríos · {0}","Zwischen Bergen und Flüssen · {0}","Tra monti e fiumi · {0}","Entre montanhas e rios · {0}"],"八章与特别篇均提供中英文正文，进入章节后沿用当前语言。地图时间轴展示1789—1799，后续章节从本目录进入。":["All eight chapters and the special episodes use your selected language. The map timeline covers 1789–1799; later chapters are available here.","Les huit chapitres et les épisodes spéciaux utilisent la langue choisie. La carte couvre 1789–1799 ; les chapitres suivants sont accessibles ici.","Los ocho capítulos y los episodios especiales usan el idioma elegido. La cronología del mapa abarca 1789–1799; los capítulos posteriores se abren aquí.","Alle acht Kapitel und die Sonderfolgen verwenden die gewählte Sprache. Die Kartenzeitleiste umfasst 1789–1799; spätere Kapitel sind hier zugänglich.","Gli otto capitoli e gli episodi speciali usano la lingua scelta. La cronologia della mappa copre il periodo 1789–1799; i capitoli successivi sono accessibili qui.","Os oito capítulos e os episódios especiais usam o idioma escolhido. A cronologia do mapa abrange 1789–1799; os capítulos posteriores estão disponíveis aqui."],"回顾第{0}章{1}":["Review Chapter {0}{1}","Revoir le chapitre {0}{1}","Repasar el capítulo {0}{1}","Kapitel {0} wiederholen{1}","Ripassa il capitolo {0}{1}","Rever o capítulo {0}{1}"],"旧材料 · 第{0}章{1}":["Documents · Chapter {0}{1}","Documents · Chapitre {0}{1}","Documentos · Capítulo {0}{1}","Dokumente · Kapitel {0}{1}","Documenti · Capitolo {0}{1}","Documentos · Capítulo {0}{1}"],"记忆 · 第{0}章{1}":["Memory · Chapter {0}{1}","Souvenir · Chapitre {0}{1}","Recuerdo · Capítulo {0}{1}","Erinnerung · Kapitel {0}{1}","Ricordo · Capitolo {0}{1}","Memória · Capítulo {0}{1}"],"为什么会走到“{0}”？":["Why did this lead to “{0}”?","Pourquoi en est-on arrivé à « {0} » ?","¿Por qué se llegó a «{0}»?","Warum führte dies zu „{0}“?","Perché si è arrivati a «{0}»?","Porque se chegou a «{0}»?"],"从“{0}”出发，点击下一格，想一想它为什么发生。":["Start with “{0}”. Click the next scene and think about why it happened.","Partez de « {0} ». Cliquez sur la case suivante et réfléchissez à ses causes.","Empieza por «{0}». Pulsa en la siguiente casilla y piensa por qué ocurrió.","Beginne bei „{0}“. Klicke auf das nächste Feld und überlege, warum es dazu kam.","Parti da «{0}». Premi sulla casella successiva e rifletti sul perché è accaduto.","Comece por «{0}». Clique na casa seguinte e pense por que aconteceu."],"正文：支持七种语言":["Story: available in seven languages","Récit : disponible en sept langues","Texto: disponible en siete idiomas","Text: in sieben Sprachen verfügbar","Testo: disponibile in sette lingue","Texto: disponível em sete idiomas"]};yo["八章与特别篇均提供七种语言正文，进入章节后沿用当前语言。地图时间轴展示1789—1799，后续章节从本目录进入。"]=yo["八章与特别篇均提供中英文正文，进入章节后沿用当前语言。地图时间轴展示1789—1799，后续章节从本目录进入。"];function bh(n,e){const t=document.getElementById("language"),i=new WeakMap,r=new WeakMap;let s=g=>g,a="zh";const o=g=>g?.closest("script,style,code,pre,select#language,[data-i18n-ignore]"),l=new MutationObserver(c);function c(){l.disconnect();const g=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);for(;g.nextNode();){const v=g.currentNode;if(o(v.parentElement))continue;let m=i.get(v);(!m||v.data!==m.last)&&(m={source:v.data,last:v.data});const f=s(m.source);v.data!==f&&(v.data=f),m.last=f,i.set(v,m)}for(const v of Array.from(document.querySelectorAll("[aria-label],[title],[placeholder],[alt],[data-loading-text]"))){if(o(v))continue;let m=r.get(v);m||(m={},r.set(v,m));for(const f of["aria-label","title","placeholder","alt","data-loading-text"]){const E=v.getAttribute(f);if(E===null)continue;let _=m[f];(!_||_.last!==E)&&(_={source:E,last:E});const y=s(_.source);E!==y&&v.setAttribute(f,y),_.last=y,m[f]=_}}l.observe(document.body,{subtree:!0,childList:!0,characterData:!0,attributes:!0,attributeFilter:["aria-label","title","alt","placeholder","data-loading-text"]})}const u=new Map,d=Sh({initial:"zh",load:async g=>{if(g==="zh"||g==="en")return{};if(u.has(g))return u.get(g);const v=await fetch(`./delivery/20260912/locales/${g}/map-scoped.json`);if(!v.ok)throw Error("Translation catalog unavailable");const m=await v.json();if(!Object.keys(m).length||Object.values(m).some(f=>typeof f!="string"||!f.trim()))throw Error("Invalid translation catalog");return u.set(g,m),m},commit:(g,v)=>{s=m=>m,c(),l.disconnect(),a=g,n.settings.update({language:g}),e(),s=Mh(v,g),document.documentElement.lang=Pl(g),document.title=g==="en"?"French Revolution 1789":s("法国大革命1789"),t.value=g,t.setAttribute("aria-label",Ta(g).label),c()}});let h=0;async function p(g){const v=++h,m=Un(g);t.setAttribute("aria-busy","true");try{await d.select(m),v===h&&document.getElementById("map-locale-error")?.remove()}catch{if(v!==h)return;t.value=a;let f=document.getElementById("map-locale-error");f||(f=document.createElement("aside"),f.id="map-locale-error",f.dataset.i18nIgnore="",f.setAttribute("role","alert"),document.body.append(f)),f.replaceChildren(document.createTextNode(Ta(m).error+" "));const E=document.createElement("button");E.textContent=Ta(m).retry,E.onclick=()=>{p(m)},f.append(E)}finally{v===h&&t.removeAttribute("aria-busy")}}return t.addEventListener("change",()=>{p(t.value)}),window.addEventListener("fr1789:languagechange",()=>{const g=n.settings.read().language;g!==a&&p(g)}),p(n.settings.read().language),{apply:c,select:p}}/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const Ll="180",xn={ROTATE:0,DOLLY:1,PAN:2},Pn={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Eh=0,Ec=1,wh=2,ad=1,Th=2,Gn=3,fi=0,Kt=1,un=2,oi=0,fr=1,wc=2,Tc=3,Ac=4,Ah=5,wi=100,Rh=101,Ch=102,Ph=103,Lh=104,Ih=200,Dh=201,Uh=202,Nh=203,xo=204,Mo=205,Fh=206,Oh=207,Bh=208,zh=209,kh=210,Hh=211,Vh=212,Gh=213,Wh=214,So=0,bo=1,Eo=2,vr=3,wo=4,To=5,Ao=6,Ro=7,od=0,Xh=1,qh=2,li=0,Yh=1,$h=2,jh=3,Zh=4,Kh=5,Jh=6,Qh=7,ld=300,_r=301,yr=302,Co=303,Po=304,fa=306,Lo=1e3,ai=1001,Io=1002,En=1003,ef=1004,fs=1005,Wt=1006,Aa=1007,Ai=1008,Zn=1009,cd=1010,ud=1011,Yr=1012,Il=1013,Ii=1014,qn=1015,ss=1016,Dl=1017,Ul=1018,$r=1020,dd=35902,hd=35899,fd=1021,pd=1022,Sn=1023,jr=1026,Zr=1027,md=1028,Nl=1029,gd=1030,Fl=1031,Ol=1033,Ys=33776,$s=33777,js=33778,Zs=33779,Do=35840,Uo=35841,No=35842,Fo=35843,Oo=36196,Bo=37492,zo=37496,ko=37808,Ho=37809,Vo=37810,Go=37811,Wo=37812,Xo=37813,qo=37814,Yo=37815,$o=37816,jo=37817,Zo=37818,Ko=37819,Jo=37820,Qo=37821,el=36492,tl=36494,nl=36495,il=36283,rl=36284,sl=36285,al=36286,tf=3200,nf=3201,rf=0,sf=1,Xn="",jt="srgb",xr="srgb-linear",Qs="linear",st="srgb",Gi=7680,Rc=519,af=512,of=513,lf=514,vd=515,cf=516,uf=517,df=518,hf=519,ol=35044,ff=35048,Cc="300 es",Ln=2e3,ea=2001;class Bi{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const r=i[e];if(r!==void 0){const s=r.indexOf(t);s!==-1&&r.splice(s,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const r=i.slice(0);for(let s=0,a=r.length;s<a;s++)r[s].call(this,e);e.target=null}}}const Ft=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Pc=1234567;const Wr=Math.PI/180,Kr=180/Math.PI;function $n(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Ft[n&255]+Ft[n>>8&255]+Ft[n>>16&255]+Ft[n>>24&255]+"-"+Ft[e&255]+Ft[e>>8&255]+"-"+Ft[e>>16&15|64]+Ft[e>>24&255]+"-"+Ft[t&63|128]+Ft[t>>8&255]+"-"+Ft[t>>16&255]+Ft[t>>24&255]+Ft[i&255]+Ft[i>>8&255]+Ft[i>>16&255]+Ft[i>>24&255]).toLowerCase()}function We(n,e,t){return Math.max(e,Math.min(t,n))}function Bl(n,e){return(n%e+e)%e}function pf(n,e,t,i,r){return i+(n-e)*(r-i)/(t-e)}function mf(n,e,t){return n!==e?(t-n)/(e-n):0}function Xr(n,e,t){return(1-t)*n+t*e}function gf(n,e,t,i){return Xr(n,e,1-Math.exp(-t*i))}function vf(n,e=1){return e-Math.abs(Bl(n,e*2)-e)}function _f(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function yf(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function xf(n,e){return n+Math.floor(Math.random()*(e-n+1))}function Mf(n,e){return n+Math.random()*(e-n)}function Sf(n){return n*(.5-Math.random())}function bf(n){n!==void 0&&(Pc=n);let e=Pc+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Ef(n){return n*Wr}function wf(n){return n*Kr}function Tf(n){return(n&n-1)===0&&n!==0}function Af(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Rf(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Cf(n,e,t,i,r){const s=Math.cos,a=Math.sin,o=s(t/2),l=a(t/2),c=s((e+i)/2),u=a((e+i)/2),d=s((e-i)/2),h=a((e-i)/2),p=s((i-e)/2),g=a((i-e)/2);switch(r){case"XYX":n.set(o*u,l*d,l*h,o*c);break;case"YZY":n.set(l*h,o*u,l*d,o*c);break;case"ZXZ":n.set(l*d,l*h,o*u,o*c);break;case"XZX":n.set(o*u,l*g,l*p,o*c);break;case"YXY":n.set(l*p,o*u,l*g,o*c);break;case"ZYZ":n.set(l*g,l*p,o*u,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+r)}}function Mn(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function it(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const dr={DEG2RAD:Wr,RAD2DEG:Kr,generateUUID:$n,clamp:We,euclideanModulo:Bl,mapLinear:pf,inverseLerp:mf,lerp:Xr,damp:gf,pingpong:vf,smoothstep:_f,smootherstep:yf,randInt:xf,randFloat:Mf,randFloatSpread:Sf,seededRandom:bf,degToRad:Ef,radToDeg:wf,isPowerOfTwo:Tf,ceilPowerOfTwo:Af,floorPowerOfTwo:Rf,setQuaternionFromProperEuler:Cf,normalize:it,denormalize:Mn};class ze{constructor(e=0,t=0){ze.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6],this.y=r[1]*t+r[4]*i+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=We(this.x,e.x,t.x),this.y=We(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=We(this.x,e,t),this.y=We(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(We(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(We(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),r=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*i-a*r+e.x,this.y=s*r+a*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Di{constructor(e=0,t=0,i=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=r}static slerpFlat(e,t,i,r,s,a,o){let l=i[r+0],c=i[r+1],u=i[r+2],d=i[r+3];const h=s[a+0],p=s[a+1],g=s[a+2],v=s[a+3];if(o===0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=d;return}if(o===1){e[t+0]=h,e[t+1]=p,e[t+2]=g,e[t+3]=v;return}if(d!==v||l!==h||c!==p||u!==g){let m=1-o;const f=l*h+c*p+u*g+d*v,E=f>=0?1:-1,_=1-f*f;if(_>Number.EPSILON){const A=Math.sqrt(_),S=Math.atan2(A,f*E);m=Math.sin(m*S)/A,o=Math.sin(o*S)/A}const y=o*E;if(l=l*m+h*y,c=c*m+p*y,u=u*m+g*y,d=d*m+v*y,m===1-o){const A=1/Math.sqrt(l*l+c*c+u*u+d*d);l*=A,c*=A,u*=A,d*=A}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=d}static multiplyQuaternionsFlat(e,t,i,r,s,a){const o=i[r],l=i[r+1],c=i[r+2],u=i[r+3],d=s[a],h=s[a+1],p=s[a+2],g=s[a+3];return e[t]=o*g+u*d+l*p-c*h,e[t+1]=l*g+u*h+c*d-o*p,e[t+2]=c*g+u*p+o*h-l*d,e[t+3]=u*g-o*d-l*h-c*p,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,r){return this._x=e,this._y=t,this._z=i,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,r=e._y,s=e._z,a=e._order,o=Math.cos,l=Math.sin,c=o(i/2),u=o(r/2),d=o(s/2),h=l(i/2),p=l(r/2),g=l(s/2);switch(a){case"XYZ":this._x=h*u*d+c*p*g,this._y=c*p*d-h*u*g,this._z=c*u*g+h*p*d,this._w=c*u*d-h*p*g;break;case"YXZ":this._x=h*u*d+c*p*g,this._y=c*p*d-h*u*g,this._z=c*u*g-h*p*d,this._w=c*u*d+h*p*g;break;case"ZXY":this._x=h*u*d-c*p*g,this._y=c*p*d+h*u*g,this._z=c*u*g+h*p*d,this._w=c*u*d-h*p*g;break;case"ZYX":this._x=h*u*d-c*p*g,this._y=c*p*d+h*u*g,this._z=c*u*g-h*p*d,this._w=c*u*d+h*p*g;break;case"YZX":this._x=h*u*d+c*p*g,this._y=c*p*d+h*u*g,this._z=c*u*g-h*p*d,this._w=c*u*d-h*p*g;break;case"XZY":this._x=h*u*d-c*p*g,this._y=c*p*d-h*u*g,this._z=c*u*g+h*p*d,this._w=c*u*d+h*p*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,r=Math.sin(i);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],r=t[4],s=t[8],a=t[1],o=t[5],l=t[9],c=t[2],u=t[6],d=t[10],h=i+o+d;if(h>0){const p=.5/Math.sqrt(h+1);this._w=.25/p,this._x=(u-l)*p,this._y=(s-c)*p,this._z=(a-r)*p}else if(i>o&&i>d){const p=2*Math.sqrt(1+i-o-d);this._w=(u-l)/p,this._x=.25*p,this._y=(r+a)/p,this._z=(s+c)/p}else if(o>d){const p=2*Math.sqrt(1+o-i-d);this._w=(s-c)/p,this._x=(r+a)/p,this._y=.25*p,this._z=(l+u)/p}else{const p=2*Math.sqrt(1+d-i-o);this._w=(a-r)/p,this._x=(s+c)/p,this._y=(l+u)/p,this._z=.25*p}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(We(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const r=Math.min(1,t/i);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,r=e._y,s=e._z,a=e._w,o=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+a*o+r*c-s*l,this._y=r*u+a*l+s*o-i*c,this._z=s*u+a*c+i*l-r*o,this._w=a*u-i*o-r*l-s*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);const i=this._x,r=this._y,s=this._z,a=this._w;let o=a*e._w+i*e._x+r*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=i,this._y=r,this._z=s,this;const l=1-o*o;if(l<=Number.EPSILON){const p=1-t;return this._w=p*a+t*this._w,this._x=p*i+t*this._x,this._y=p*r+t*this._y,this._z=p*s+t*this._z,this.normalize(),this}const c=Math.sqrt(l),u=Math.atan2(c,o),d=Math.sin((1-t)*u)/c,h=Math.sin(t*u)/c;return this._w=a*d+this._w*h,this._x=i*d+this._x*h,this._y=r*d+this._y*h,this._z=s*d+this._z*h,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),r=Math.sqrt(1-i),s=Math.sqrt(i);return this.set(r*Math.sin(e),r*Math.cos(e),s*Math.sin(t),s*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class O{constructor(e=0,t=0,i=0){O.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Lc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Lc.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6]*r,this.y=s[1]*t+s[4]*i+s[7]*r,this.z=s[2]*t+s[5]*i+s[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=e.elements,a=1/(s[3]*t+s[7]*i+s[11]*r+s[15]);return this.x=(s[0]*t+s[4]*i+s[8]*r+s[12])*a,this.y=(s[1]*t+s[5]*i+s[9]*r+s[13])*a,this.z=(s[2]*t+s[6]*i+s[10]*r+s[14])*a,this}applyQuaternion(e){const t=this.x,i=this.y,r=this.z,s=e.x,a=e.y,o=e.z,l=e.w,c=2*(a*r-o*i),u=2*(o*t-s*r),d=2*(s*i-a*t);return this.x=t+l*c+a*d-o*u,this.y=i+l*u+o*c-s*d,this.z=r+l*d+s*u-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,r=this.z,s=e.elements;return this.x=s[0]*t+s[4]*i+s[8]*r,this.y=s[1]*t+s[5]*i+s[9]*r,this.z=s[2]*t+s[6]*i+s[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=We(this.x,e.x,t.x),this.y=We(this.y,e.y,t.y),this.z=We(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=We(this.x,e,t),this.y=We(this.y,e,t),this.z=We(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(We(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,r=e.y,s=e.z,a=t.x,o=t.y,l=t.z;return this.x=r*l-s*o,this.y=s*a-i*l,this.z=i*o-r*a,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Ra.copy(this).projectOnVector(e),this.sub(Ra)}reflect(e){return this.sub(Ra.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(We(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,r=this.z-e.z;return t*t+i*i+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const r=Math.sin(t)*e;return this.x=r*Math.sin(i),this.y=Math.cos(t)*e,this.z=r*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Ra=new O,Lc=new Di;class $e{constructor(e,t,i,r,s,a,o,l,c){$e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c)}set(e,t,i,r,s,a,o,l,c){const u=this.elements;return u[0]=e,u[1]=r,u[2]=o,u[3]=t,u[4]=s,u[5]=l,u[6]=i,u[7]=a,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[3],l=i[6],c=i[1],u=i[4],d=i[7],h=i[2],p=i[5],g=i[8],v=r[0],m=r[3],f=r[6],E=r[1],_=r[4],y=r[7],A=r[2],S=r[5],w=r[8];return s[0]=a*v+o*E+l*A,s[3]=a*m+o*_+l*S,s[6]=a*f+o*y+l*w,s[1]=c*v+u*E+d*A,s[4]=c*m+u*_+d*S,s[7]=c*f+u*y+d*w,s[2]=h*v+p*E+g*A,s[5]=h*m+p*_+g*S,s[8]=h*f+p*y+g*w,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8];return t*a*u-t*o*c-i*s*u+i*o*l+r*s*c-r*a*l}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=u*a-o*c,h=o*l-u*s,p=c*s-a*l,g=t*d+i*h+r*p;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const v=1/g;return e[0]=d*v,e[1]=(r*c-u*i)*v,e[2]=(o*i-r*a)*v,e[3]=h*v,e[4]=(u*t-r*l)*v,e[5]=(r*s-o*t)*v,e[6]=p*v,e[7]=(i*l-c*t)*v,e[8]=(a*t-i*s)*v,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,r,s,a,o){const l=Math.cos(s),c=Math.sin(s);return this.set(i*l,i*c,-i*(l*a+c*o)+a+e,-r*c,r*l,-r*(-c*a+l*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Ca.makeScale(e,t)),this}rotate(e){return this.premultiply(Ca.makeRotation(-e)),this}translate(e,t){return this.premultiply(Ca.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<9;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Ca=new $e;function _d(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function Jr(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function Pf(){const n=Jr("canvas");return n.style.display="block",n}const Ic={};function Qr(n){n in Ic||(Ic[n]=!0,console.warn(n))}function Lf(n,e,t){return new Promise(function(i,r){function s(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:r();break;case n.TIMEOUT_EXPIRED:setTimeout(s,t);break;default:i()}}setTimeout(s,t)})}const Dc=new $e().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Uc=new $e().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function If(){const n={enabled:!0,workingColorSpace:xr,spaces:{},convert:function(r,s,a){return this.enabled===!1||s===a||!s||!a||(this.spaces[s].transfer===st&&(r.r=jn(r.r),r.g=jn(r.g),r.b=jn(r.b)),this.spaces[s].primaries!==this.spaces[a].primaries&&(r.applyMatrix3(this.spaces[s].toXYZ),r.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===st&&(r.r=pr(r.r),r.g=pr(r.g),r.b=pr(r.b))),r},workingToColorSpace:function(r,s){return this.convert(r,this.workingColorSpace,s)},colorSpaceToWorking:function(r,s){return this.convert(r,s,this.workingColorSpace)},getPrimaries:function(r){return this.spaces[r].primaries},getTransfer:function(r){return r===Xn?Qs:this.spaces[r].transfer},getToneMappingMode:function(r){return this.spaces[r].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(r,s=this.workingColorSpace){return r.fromArray(this.spaces[s].luminanceCoefficients)},define:function(r){Object.assign(this.spaces,r)},_getMatrix:function(r,s,a){return r.copy(this.spaces[s].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(r){return this.spaces[r].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(r=this.workingColorSpace){return this.spaces[r].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(r,s){return Qr("THREE.ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(r,s)},toWorkingColorSpace:function(r,s){return Qr("THREE.ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(r,s)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[xr]:{primaries:e,whitePoint:i,transfer:Qs,toXYZ:Dc,fromXYZ:Uc,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:jt},outputColorSpaceConfig:{drawingBufferColorSpace:jt}},[jt]:{primaries:e,whitePoint:i,transfer:st,toXYZ:Dc,fromXYZ:Uc,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:jt}}}),n}const tt=If();function jn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function pr(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Wi;class Df{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{Wi===void 0&&(Wi=Jr("canvas")),Wi.width=e.width,Wi.height=e.height;const r=Wi.getContext("2d");e instanceof ImageData?r.putImageData(e,0,0):r.drawImage(e,0,0,e.width,e.height),i=Wi}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=Jr("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const r=i.getImageData(0,0,e.width,e.height),s=r.data;for(let a=0;a<s.length;a++)s[a]=jn(s[a]/255)*255;return i.putImageData(r,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(jn(t[i]/255)*255):t[i]=jn(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let Uf=0;class zl{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Uf++}),this.uuid=$n(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},r=this.data;if(r!==null){let s;if(Array.isArray(r)){s=[];for(let a=0,o=r.length;a<o;a++)r[a].isDataTexture?s.push(Pa(r[a].image)):s.push(Pa(r[a]))}else s=Pa(r);i.url=s}return t||(e.images[this.uuid]=i),i}}function Pa(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Df.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let Nf=0;const La=new O;class Bt extends Bi{constructor(e=Bt.DEFAULT_IMAGE,t=Bt.DEFAULT_MAPPING,i=ai,r=ai,s=Wt,a=Ai,o=Sn,l=Zn,c=Bt.DEFAULT_ANISOTROPY,u=Xn){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Nf++}),this.uuid=$n(),this.name="",this.source=new zl(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=r,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ze(0,0),this.repeat=new ze(1,1),this.center=new ze(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new $e,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(La).x}get height(){return this.source.getSize(La).y}get depth(){return this.source.getSize(La).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Texture.setValues(): property '${t}' does not exist.`);continue}r&&i&&r.isVector2&&i.isVector2||r&&i&&r.isVector3&&i.isVector3||r&&i&&r.isMatrix3&&i.isMatrix3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ld)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Lo:e.x=e.x-Math.floor(e.x);break;case ai:e.x=e.x<0?0:1;break;case Io:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Lo:e.y=e.y-Math.floor(e.y);break;case ai:e.y=e.y<0?0:1;break;case Io:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}Bt.DEFAULT_IMAGE=null;Bt.DEFAULT_MAPPING=ld;Bt.DEFAULT_ANISOTROPY=1;class dt{constructor(e=0,t=0,i=0,r=1){dt.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,r){return this.x=e,this.y=t,this.z=i,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,r=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*i+a[8]*r+a[12]*s,this.y=a[1]*t+a[5]*i+a[9]*r+a[13]*s,this.z=a[2]*t+a[6]*i+a[10]*r+a[14]*s,this.w=a[3]*t+a[7]*i+a[11]*r+a[15]*s,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,r,s;const l=e.elements,c=l[0],u=l[4],d=l[8],h=l[1],p=l[5],g=l[9],v=l[2],m=l[6],f=l[10];if(Math.abs(u-h)<.01&&Math.abs(d-v)<.01&&Math.abs(g-m)<.01){if(Math.abs(u+h)<.1&&Math.abs(d+v)<.1&&Math.abs(g+m)<.1&&Math.abs(c+p+f-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const _=(c+1)/2,y=(p+1)/2,A=(f+1)/2,S=(u+h)/4,w=(d+v)/4,R=(g+m)/4;return _>y&&_>A?_<.01?(i=0,r=.707106781,s=.707106781):(i=Math.sqrt(_),r=S/i,s=w/i):y>A?y<.01?(i=.707106781,r=0,s=.707106781):(r=Math.sqrt(y),i=S/r,s=R/r):A<.01?(i=.707106781,r=.707106781,s=0):(s=Math.sqrt(A),i=w/s,r=R/s),this.set(i,r,s,t),this}let E=Math.sqrt((m-g)*(m-g)+(d-v)*(d-v)+(h-u)*(h-u));return Math.abs(E)<.001&&(E=1),this.x=(m-g)/E,this.y=(d-v)/E,this.z=(h-u)/E,this.w=Math.acos((c+p+f-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=We(this.x,e.x,t.x),this.y=We(this.y,e.y,t.y),this.z=We(this.z,e.z,t.z),this.w=We(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=We(this.x,e,t),this.y=We(this.y,e,t),this.z=We(this.z,e,t),this.w=We(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(We(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Ff extends Bi{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Wt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new dt(0,0,e,t),this.scissorTest=!1,this.viewport=new dt(0,0,e,t);const r={width:e,height:t,depth:i.depth},s=new Bt(r);this.textures=[];const a=i.count;for(let o=0;o<a;o++)this.textures[o]=s.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:Wt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let r=0,s=this.textures.length;r<s;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=i,this.textures[r].isArrayTexture=this.textures[r].image.depth>1;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const r=Object.assign({},e.textures[t].image);this.textures[t].source=new zl(r)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class Ui extends Ff{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class yd extends Bt{constructor(e=null,t=1,i=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=En,this.minFilter=En,this.wrapR=ai,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Of extends Bt{constructor(e=null,t=1,i=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:r},this.magFilter=En,this.minFilter=En,this.wrapR=ai,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Jn{constructor(e=new O(1/0,1/0,1/0),t=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(gn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(gn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=gn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const s=i.getAttribute("position");if(t===!0&&s!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,gn):gn.fromBufferAttribute(s,a),gn.applyMatrix4(e.matrixWorld),this.expandByPoint(gn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ps.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),ps.copy(i.boundingBox)),ps.applyMatrix4(e.matrixWorld),this.union(ps)}const r=e.children;for(let s=0,a=r.length;s<a;s++)this.expandByObject(r[s],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,gn),gn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Dr),ms.subVectors(this.max,Dr),Xi.subVectors(e.a,Dr),qi.subVectors(e.b,Dr),Yi.subVectors(e.c,Dr),Qn.subVectors(qi,Xi),ei.subVectors(Yi,qi),_i.subVectors(Xi,Yi);let t=[0,-Qn.z,Qn.y,0,-ei.z,ei.y,0,-_i.z,_i.y,Qn.z,0,-Qn.x,ei.z,0,-ei.x,_i.z,0,-_i.x,-Qn.y,Qn.x,0,-ei.y,ei.x,0,-_i.y,_i.x,0];return!Ia(t,Xi,qi,Yi,ms)||(t=[1,0,0,0,1,0,0,0,1],!Ia(t,Xi,qi,Yi,ms))?!1:(gs.crossVectors(Qn,ei),t=[gs.x,gs.y,gs.z],Ia(t,Xi,qi,Yi,ms))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,gn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(gn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Bn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Bn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Bn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Bn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Bn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Bn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Bn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Bn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Bn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const Bn=[new O,new O,new O,new O,new O,new O,new O,new O],gn=new O,ps=new Jn,Xi=new O,qi=new O,Yi=new O,Qn=new O,ei=new O,_i=new O,Dr=new O,ms=new O,gs=new O,yi=new O;function Ia(n,e,t,i,r){for(let s=0,a=n.length-3;s<=a;s+=3){yi.fromArray(n,s);const o=r.x*Math.abs(yi.x)+r.y*Math.abs(yi.y)+r.z*Math.abs(yi.z),l=e.dot(yi),c=t.dot(yi),u=i.dot(yi);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>o)return!1}return!0}const Bf=new Jn,Ur=new O,Da=new O;class zi{constructor(e=new O,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Bf.setFromPoints(e).getCenter(i);let r=0;for(let s=0,a=e.length;s<a;s++)r=Math.max(r,i.distanceToSquared(e[s]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ur.subVectors(e,this.center);const t=Ur.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),r=(i-this.radius)*.5;this.center.addScaledVector(Ur,r/i),this.radius+=r}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Da.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ur.copy(e.center).add(Da)),this.expandByPoint(Ur.copy(e.center).sub(Da))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const zn=new O,Ua=new O,vs=new O,ti=new O,Na=new O,_s=new O,Fa=new O;class pa{constructor(e=new O,t=new O(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,zn)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=zn.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(zn.copy(this.origin).addScaledVector(this.direction,t),zn.distanceToSquared(e))}distanceSqToSegment(e,t,i,r){Ua.copy(e).add(t).multiplyScalar(.5),vs.copy(t).sub(e).normalize(),ti.copy(this.origin).sub(Ua);const s=e.distanceTo(t)*.5,a=-this.direction.dot(vs),o=ti.dot(this.direction),l=-ti.dot(vs),c=ti.lengthSq(),u=Math.abs(1-a*a);let d,h,p,g;if(u>0)if(d=a*l-o,h=a*o-l,g=s*u,d>=0)if(h>=-g)if(h<=g){const v=1/u;d*=v,h*=v,p=d*(d+a*h+2*o)+h*(a*d+h+2*l)+c}else h=s,d=Math.max(0,-(a*h+o)),p=-d*d+h*(h+2*l)+c;else h=-s,d=Math.max(0,-(a*h+o)),p=-d*d+h*(h+2*l)+c;else h<=-g?(d=Math.max(0,-(-a*s+o)),h=d>0?-s:Math.min(Math.max(-s,-l),s),p=-d*d+h*(h+2*l)+c):h<=g?(d=0,h=Math.min(Math.max(-s,-l),s),p=h*(h+2*l)+c):(d=Math.max(0,-(a*s+o)),h=d>0?s:Math.min(Math.max(-s,-l),s),p=-d*d+h*(h+2*l)+c);else h=a>0?-s:s,d=Math.max(0,-(a*h+o)),p=-d*d+h*(h+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),r&&r.copy(Ua).addScaledVector(vs,h),p}intersectSphere(e,t){zn.subVectors(e.center,this.origin);const i=zn.dot(this.direction),r=zn.dot(zn)-i*i,s=e.radius*e.radius;if(r>s)return null;const a=Math.sqrt(s-r),o=i-a,l=i+a;return l<0?null:o<0?this.at(l,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,r,s,a,o,l;const c=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,h=this.origin;return c>=0?(i=(e.min.x-h.x)*c,r=(e.max.x-h.x)*c):(i=(e.max.x-h.x)*c,r=(e.min.x-h.x)*c),u>=0?(s=(e.min.y-h.y)*u,a=(e.max.y-h.y)*u):(s=(e.max.y-h.y)*u,a=(e.min.y-h.y)*u),i>a||s>r||((s>i||isNaN(i))&&(i=s),(a<r||isNaN(r))&&(r=a),d>=0?(o=(e.min.z-h.z)*d,l=(e.max.z-h.z)*d):(o=(e.max.z-h.z)*d,l=(e.min.z-h.z)*d),i>l||o>r)||((o>i||i!==i)&&(i=o),(l<r||r!==r)&&(r=l),r<0)?null:this.at(i>=0?i:r,t)}intersectsBox(e){return this.intersectBox(e,zn)!==null}intersectTriangle(e,t,i,r,s){Na.subVectors(t,e),_s.subVectors(i,e),Fa.crossVectors(Na,_s);let a=this.direction.dot(Fa),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;ti.subVectors(this.origin,e);const l=o*this.direction.dot(_s.crossVectors(ti,_s));if(l<0)return null;const c=o*this.direction.dot(Na.cross(ti));if(c<0||l+c>a)return null;const u=-o*ti.dot(Fa);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ht{constructor(e,t,i,r,s,a,o,l,c,u,d,h,p,g,v,m){ht.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,r,s,a,o,l,c,u,d,h,p,g,v,m)}set(e,t,i,r,s,a,o,l,c,u,d,h,p,g,v,m){const f=this.elements;return f[0]=e,f[4]=t,f[8]=i,f[12]=r,f[1]=s,f[5]=a,f[9]=o,f[13]=l,f[2]=c,f[6]=u,f[10]=d,f[14]=h,f[3]=p,f[7]=g,f[11]=v,f[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ht().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,r=1/$i.setFromMatrixColumn(e,0).length(),s=1/$i.setFromMatrixColumn(e,1).length(),a=1/$i.setFromMatrixColumn(e,2).length();return t[0]=i[0]*r,t[1]=i[1]*r,t[2]=i[2]*r,t[3]=0,t[4]=i[4]*s,t[5]=i[5]*s,t[6]=i[6]*s,t[7]=0,t[8]=i[8]*a,t[9]=i[9]*a,t[10]=i[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,r=e.y,s=e.z,a=Math.cos(i),o=Math.sin(i),l=Math.cos(r),c=Math.sin(r),u=Math.cos(s),d=Math.sin(s);if(e.order==="XYZ"){const h=a*u,p=a*d,g=o*u,v=o*d;t[0]=l*u,t[4]=-l*d,t[8]=c,t[1]=p+g*c,t[5]=h-v*c,t[9]=-o*l,t[2]=v-h*c,t[6]=g+p*c,t[10]=a*l}else if(e.order==="YXZ"){const h=l*u,p=l*d,g=c*u,v=c*d;t[0]=h+v*o,t[4]=g*o-p,t[8]=a*c,t[1]=a*d,t[5]=a*u,t[9]=-o,t[2]=p*o-g,t[6]=v+h*o,t[10]=a*l}else if(e.order==="ZXY"){const h=l*u,p=l*d,g=c*u,v=c*d;t[0]=h-v*o,t[4]=-a*d,t[8]=g+p*o,t[1]=p+g*o,t[5]=a*u,t[9]=v-h*o,t[2]=-a*c,t[6]=o,t[10]=a*l}else if(e.order==="ZYX"){const h=a*u,p=a*d,g=o*u,v=o*d;t[0]=l*u,t[4]=g*c-p,t[8]=h*c+v,t[1]=l*d,t[5]=v*c+h,t[9]=p*c-g,t[2]=-c,t[6]=o*l,t[10]=a*l}else if(e.order==="YZX"){const h=a*l,p=a*c,g=o*l,v=o*c;t[0]=l*u,t[4]=v-h*d,t[8]=g*d+p,t[1]=d,t[5]=a*u,t[9]=-o*u,t[2]=-c*u,t[6]=p*d+g,t[10]=h-v*d}else if(e.order==="XZY"){const h=a*l,p=a*c,g=o*l,v=o*c;t[0]=l*u,t[4]=-d,t[8]=c*u,t[1]=h*d+v,t[5]=a*u,t[9]=p*d-g,t[2]=g*d-p,t[6]=o*u,t[10]=v*d+h}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(zf,e,kf)}lookAt(e,t,i){const r=this.elements;return en.subVectors(e,t),en.lengthSq()===0&&(en.z=1),en.normalize(),ni.crossVectors(i,en),ni.lengthSq()===0&&(Math.abs(i.z)===1?en.x+=1e-4:en.z+=1e-4,en.normalize(),ni.crossVectors(i,en)),ni.normalize(),ys.crossVectors(en,ni),r[0]=ni.x,r[4]=ys.x,r[8]=en.x,r[1]=ni.y,r[5]=ys.y,r[9]=en.y,r[2]=ni.z,r[6]=ys.z,r[10]=en.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,r=t.elements,s=this.elements,a=i[0],o=i[4],l=i[8],c=i[12],u=i[1],d=i[5],h=i[9],p=i[13],g=i[2],v=i[6],m=i[10],f=i[14],E=i[3],_=i[7],y=i[11],A=i[15],S=r[0],w=r[4],R=r[8],M=r[12],x=r[1],I=r[5],L=r[9],C=r[13],U=r[2],F=r[6],z=r[10],X=r[14],G=r[3],$=r[7],ne=r[11],se=r[15];return s[0]=a*S+o*x+l*U+c*G,s[4]=a*w+o*I+l*F+c*$,s[8]=a*R+o*L+l*z+c*ne,s[12]=a*M+o*C+l*X+c*se,s[1]=u*S+d*x+h*U+p*G,s[5]=u*w+d*I+h*F+p*$,s[9]=u*R+d*L+h*z+p*ne,s[13]=u*M+d*C+h*X+p*se,s[2]=g*S+v*x+m*U+f*G,s[6]=g*w+v*I+m*F+f*$,s[10]=g*R+v*L+m*z+f*ne,s[14]=g*M+v*C+m*X+f*se,s[3]=E*S+_*x+y*U+A*G,s[7]=E*w+_*I+y*F+A*$,s[11]=E*R+_*L+y*z+A*ne,s[15]=E*M+_*C+y*X+A*se,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],r=e[8],s=e[12],a=e[1],o=e[5],l=e[9],c=e[13],u=e[2],d=e[6],h=e[10],p=e[14],g=e[3],v=e[7],m=e[11],f=e[15];return g*(+s*l*d-r*c*d-s*o*h+i*c*h+r*o*p-i*l*p)+v*(+t*l*p-t*c*h+s*a*h-r*a*p+r*c*u-s*l*u)+m*(+t*c*d-t*o*p-s*a*d+i*a*p+s*o*u-i*c*u)+f*(-r*o*u-t*l*d+t*o*h+r*a*d-i*a*h+i*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],r=e[2],s=e[3],a=e[4],o=e[5],l=e[6],c=e[7],u=e[8],d=e[9],h=e[10],p=e[11],g=e[12],v=e[13],m=e[14],f=e[15],E=d*m*c-v*h*c+v*l*p-o*m*p-d*l*f+o*h*f,_=g*h*c-u*m*c-g*l*p+a*m*p+u*l*f-a*h*f,y=u*v*c-g*d*c+g*o*p-a*v*p-u*o*f+a*d*f,A=g*d*l-u*v*l-g*o*h+a*v*h+u*o*m-a*d*m,S=t*E+i*_+r*y+s*A;if(S===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const w=1/S;return e[0]=E*w,e[1]=(v*h*s-d*m*s-v*r*p+i*m*p+d*r*f-i*h*f)*w,e[2]=(o*m*s-v*l*s+v*r*c-i*m*c-o*r*f+i*l*f)*w,e[3]=(d*l*s-o*h*s-d*r*c+i*h*c+o*r*p-i*l*p)*w,e[4]=_*w,e[5]=(u*m*s-g*h*s+g*r*p-t*m*p-u*r*f+t*h*f)*w,e[6]=(g*l*s-a*m*s-g*r*c+t*m*c+a*r*f-t*l*f)*w,e[7]=(a*h*s-u*l*s+u*r*c-t*h*c-a*r*p+t*l*p)*w,e[8]=y*w,e[9]=(g*d*s-u*v*s-g*i*p+t*v*p+u*i*f-t*d*f)*w,e[10]=(a*v*s-g*o*s+g*i*c-t*v*c-a*i*f+t*o*f)*w,e[11]=(u*o*s-a*d*s-u*i*c+t*d*c+a*i*p-t*o*p)*w,e[12]=A*w,e[13]=(u*v*r-g*d*r+g*i*h-t*v*h-u*i*m+t*d*m)*w,e[14]=(g*o*r-a*v*r-g*i*l+t*v*l+a*i*m-t*o*m)*w,e[15]=(a*d*r-u*o*r+u*i*l-t*d*l-a*i*h+t*o*h)*w,this}scale(e){const t=this.elements,i=e.x,r=e.y,s=e.z;return t[0]*=i,t[4]*=r,t[8]*=s,t[1]*=i,t[5]*=r,t[9]*=s,t[2]*=i,t[6]*=r,t[10]*=s,t[3]*=i,t[7]*=r,t[11]*=s,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,r))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),r=Math.sin(t),s=1-i,a=e.x,o=e.y,l=e.z,c=s*a,u=s*o;return this.set(c*a+i,c*o-r*l,c*l+r*o,0,c*o+r*l,u*o+i,u*l-r*a,0,c*l-r*o,u*l+r*a,s*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,r,s,a){return this.set(1,i,s,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,i){const r=this.elements,s=t._x,a=t._y,o=t._z,l=t._w,c=s+s,u=a+a,d=o+o,h=s*c,p=s*u,g=s*d,v=a*u,m=a*d,f=o*d,E=l*c,_=l*u,y=l*d,A=i.x,S=i.y,w=i.z;return r[0]=(1-(v+f))*A,r[1]=(p+y)*A,r[2]=(g-_)*A,r[3]=0,r[4]=(p-y)*S,r[5]=(1-(h+f))*S,r[6]=(m+E)*S,r[7]=0,r[8]=(g+_)*w,r[9]=(m-E)*w,r[10]=(1-(h+v))*w,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,i){const r=this.elements;let s=$i.set(r[0],r[1],r[2]).length();const a=$i.set(r[4],r[5],r[6]).length(),o=$i.set(r[8],r[9],r[10]).length();this.determinant()<0&&(s=-s),e.x=r[12],e.y=r[13],e.z=r[14],vn.copy(this);const c=1/s,u=1/a,d=1/o;return vn.elements[0]*=c,vn.elements[1]*=c,vn.elements[2]*=c,vn.elements[4]*=u,vn.elements[5]*=u,vn.elements[6]*=u,vn.elements[8]*=d,vn.elements[9]*=d,vn.elements[10]*=d,t.setFromRotationMatrix(vn),i.x=s,i.y=a,i.z=o,this}makePerspective(e,t,i,r,s,a,o=Ln,l=!1){const c=this.elements,u=2*s/(t-e),d=2*s/(i-r),h=(t+e)/(t-e),p=(i+r)/(i-r);let g,v;if(l)g=s/(a-s),v=a*s/(a-s);else if(o===Ln)g=-(a+s)/(a-s),v=-2*a*s/(a-s);else if(o===ea)g=-a/(a-s),v=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=h,c[12]=0,c[1]=0,c[5]=d,c[9]=p,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,r,s,a,o=Ln,l=!1){const c=this.elements,u=2/(t-e),d=2/(i-r),h=-(t+e)/(t-e),p=-(i+r)/(i-r);let g,v;if(l)g=1/(a-s),v=a/(a-s);else if(o===Ln)g=-2/(a-s),v=-(a+s)/(a-s);else if(o===ea)g=-1/(a-s),v=-s/(a-s);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return c[0]=u,c[4]=0,c[8]=0,c[12]=h,c[1]=0,c[5]=d,c[9]=0,c[13]=p,c[2]=0,c[6]=0,c[10]=g,c[14]=v,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let r=0;r<16;r++)if(t[r]!==i[r])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const $i=new O,vn=new ht,zf=new O(0,0,0),kf=new O(1,1,1),ni=new O,ys=new O,en=new O,Nc=new ht,Fc=new Di;class Kn{constructor(e=0,t=0,i=0,r=Kn.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=r}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,r=this._order){return this._x=e,this._y=t,this._z=i,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const r=e.elements,s=r[0],a=r[4],o=r[8],l=r[1],c=r[5],u=r[9],d=r[2],h=r[6],p=r[10];switch(t){case"XYZ":this._y=Math.asin(We(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,p),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(h,c),this._z=0);break;case"YXZ":this._x=Math.asin(-We(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,p),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(We(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(-d,p),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-We(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(h,p),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(We(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,p));break;case"XZY":this._z=Math.asin(-We(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(h,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,p),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Nc.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Nc,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Fc.setFromEuler(this),this.setFromQuaternion(Fc,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}Kn.DEFAULT_ORDER="XYZ";class kl{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Hf=0;const Oc=new O,ji=new Di,kn=new ht,xs=new O,Nr=new O,Vf=new O,Gf=new Di,Bc=new O(1,0,0),zc=new O(0,1,0),kc=new O(0,0,1),Hc={type:"added"},Wf={type:"removed"},Zi={type:"childadded",child:null},Oa={type:"childremoved",child:null};class Xt extends Bi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Hf++}),this.uuid=$n(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Xt.DEFAULT_UP.clone();const e=new O,t=new Kn,i=new Di,r=new O(1,1,1);function s(){i.setFromEuler(t,!1)}function a(){t.setFromQuaternion(i,void 0,!1)}t._onChange(s),i._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:r},modelViewMatrix:{value:new ht},normalMatrix:{value:new $e}}),this.matrix=new ht,this.matrixWorld=new ht,this.matrixAutoUpdate=Xt.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Xt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new kl,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ji.setFromAxisAngle(e,t),this.quaternion.multiply(ji),this}rotateOnWorldAxis(e,t){return ji.setFromAxisAngle(e,t),this.quaternion.premultiply(ji),this}rotateX(e){return this.rotateOnAxis(Bc,e)}rotateY(e){return this.rotateOnAxis(zc,e)}rotateZ(e){return this.rotateOnAxis(kc,e)}translateOnAxis(e,t){return Oc.copy(e).applyQuaternion(this.quaternion),this.position.add(Oc.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Bc,e)}translateY(e){return this.translateOnAxis(zc,e)}translateZ(e){return this.translateOnAxis(kc,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(kn.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?xs.copy(e):xs.set(e,t,i);const r=this.parent;this.updateWorldMatrix(!0,!1),Nr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?kn.lookAt(Nr,xs,this.up):kn.lookAt(xs,Nr,this.up),this.quaternion.setFromRotationMatrix(kn),r&&(kn.extractRotation(r.matrixWorld),ji.setFromRotationMatrix(kn),this.quaternion.premultiply(ji.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Hc),Zi.child=e,this.dispatchEvent(Zi),Zi.child=null):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Wf),Oa.child=e,this.dispatchEvent(Oa),Oa.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),kn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),kn.multiply(e.parent.matrixWorld)),e.applyMatrix4(kn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Hc),Zi.child=e,this.dispatchEvent(Zi),Zi.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,r=this.children.length;i<r;i++){const a=this.children[i].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Nr,e,Vf),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Nr,Gf,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,r=t.length;i<r;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const r=this.children;for(let s=0,a=r.length;s<a;s++)r[s].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const r={};r.uuid=this.uuid,r.type=this.type,this.name!==""&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type="InstancedMesh",r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type="BatchedMesh",r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(o=>({...o})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=s(e.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const d=l[c];s(e.shapes,d)}else s(e.shapes,l)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(e.materials,this.material[l]));r.material=o}else r.material=s(e.materials,this.material);if(this.children.length>0){r.children=[];for(let o=0;o<this.children.length;o++)r.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];r.animations.push(s(e.animations,l))}}if(t){const o=a(e.geometries),l=a(e.materials),c=a(e.textures),u=a(e.images),d=a(e.shapes),h=a(e.skeletons),p=a(e.animations),g=a(e.nodes);o.length>0&&(i.geometries=o),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),d.length>0&&(i.shapes=d),h.length>0&&(i.skeletons=h),p.length>0&&(i.animations=p),g.length>0&&(i.nodes=g)}return i.object=r,i;function a(o){const l=[];for(const c in o){const u=o[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const r=e.children[i];this.add(r.clone())}return this}}Xt.DEFAULT_UP=new O(0,1,0);Xt.DEFAULT_MATRIX_AUTO_UPDATE=!0;Xt.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const _n=new O,Hn=new O,Ba=new O,Vn=new O,Ki=new O,Ji=new O,Vc=new O,za=new O,ka=new O,Ha=new O,Va=new dt,Ga=new dt,Wa=new dt;class dn{constructor(e=new O,t=new O,i=new O){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,r){r.subVectors(i,t),_n.subVectors(e,t),r.cross(_n);const s=r.lengthSq();return s>0?r.multiplyScalar(1/Math.sqrt(s)):r.set(0,0,0)}static getBarycoord(e,t,i,r,s){_n.subVectors(r,t),Hn.subVectors(i,t),Ba.subVectors(e,t);const a=_n.dot(_n),o=_n.dot(Hn),l=_n.dot(Ba),c=Hn.dot(Hn),u=Hn.dot(Ba),d=a*c-o*o;if(d===0)return s.set(0,0,0),null;const h=1/d,p=(c*l-o*u)*h,g=(a*u-o*l)*h;return s.set(1-p-g,g,p)}static containsPoint(e,t,i,r){return this.getBarycoord(e,t,i,r,Vn)===null?!1:Vn.x>=0&&Vn.y>=0&&Vn.x+Vn.y<=1}static getInterpolation(e,t,i,r,s,a,o,l){return this.getBarycoord(e,t,i,r,Vn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,Vn.x),l.addScaledVector(a,Vn.y),l.addScaledVector(o,Vn.z),l)}static getInterpolatedAttribute(e,t,i,r,s,a){return Va.setScalar(0),Ga.setScalar(0),Wa.setScalar(0),Va.fromBufferAttribute(e,t),Ga.fromBufferAttribute(e,i),Wa.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Va,s.x),a.addScaledVector(Ga,s.y),a.addScaledVector(Wa,s.z),a}static isFrontFacing(e,t,i,r){return _n.subVectors(i,t),Hn.subVectors(e,t),_n.cross(Hn).dot(r)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,r){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,i,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return _n.subVectors(this.c,this.b),Hn.subVectors(this.a,this.b),_n.cross(Hn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return dn.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return dn.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,r,s){return dn.getInterpolation(e,this.a,this.b,this.c,t,i,r,s)}containsPoint(e){return dn.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return dn.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,r=this.b,s=this.c;let a,o;Ki.subVectors(r,i),Ji.subVectors(s,i),za.subVectors(e,i);const l=Ki.dot(za),c=Ji.dot(za);if(l<=0&&c<=0)return t.copy(i);ka.subVectors(e,r);const u=Ki.dot(ka),d=Ji.dot(ka);if(u>=0&&d<=u)return t.copy(r);const h=l*d-u*c;if(h<=0&&l>=0&&u<=0)return a=l/(l-u),t.copy(i).addScaledVector(Ki,a);Ha.subVectors(e,s);const p=Ki.dot(Ha),g=Ji.dot(Ha);if(g>=0&&p<=g)return t.copy(s);const v=p*c-l*g;if(v<=0&&c>=0&&g<=0)return o=c/(c-g),t.copy(i).addScaledVector(Ji,o);const m=u*g-p*d;if(m<=0&&d-u>=0&&p-g>=0)return Vc.subVectors(s,r),o=(d-u)/(d-u+(p-g)),t.copy(r).addScaledVector(Vc,o);const f=1/(m+v+h);return a=v*f,o=h*f,t.copy(i).addScaledVector(Ki,a).addScaledVector(Ji,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const xd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},ii={h:0,s:0,l:0},Ms={h:0,s:0,l:0};function Xa(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class Qe{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const r=e;r&&r.isColor?this.copy(r):typeof r=="number"?this.setHex(r):typeof r=="string"&&this.setStyle(r)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=jt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,tt.colorSpaceToWorking(this,t),this}setRGB(e,t,i,r=tt.workingColorSpace){return this.r=e,this.g=t,this.b=i,tt.colorSpaceToWorking(this,r),this}setHSL(e,t,i,r=tt.workingColorSpace){if(e=Bl(e,1),t=We(t,0,1),i=We(i,0,1),t===0)this.r=this.g=this.b=i;else{const s=i<=.5?i*(1+t):i+t-i*t,a=2*i-s;this.r=Xa(a,s,e+1/3),this.g=Xa(a,s,e),this.b=Xa(a,s,e-1/3)}return tt.colorSpaceToWorking(this,r),this}setStyle(e,t=jt){function i(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let s;const a=r[1],o=r[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,t);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,t);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return i(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){const s=r[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(s,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=jt){const i=xd[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=jn(e.r),this.g=jn(e.g),this.b=jn(e.b),this}copyLinearToSRGB(e){return this.r=pr(e.r),this.g=pr(e.g),this.b=pr(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=jt){return tt.workingToColorSpace(Ot.copy(this),e),Math.round(We(Ot.r*255,0,255))*65536+Math.round(We(Ot.g*255,0,255))*256+Math.round(We(Ot.b*255,0,255))}getHexString(e=jt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=tt.workingColorSpace){tt.workingToColorSpace(Ot.copy(this),t);const i=Ot.r,r=Ot.g,s=Ot.b,a=Math.max(i,r,s),o=Math.min(i,r,s);let l,c;const u=(o+a)/2;if(o===a)l=0,c=0;else{const d=a-o;switch(c=u<=.5?d/(a+o):d/(2-a-o),a){case i:l=(r-s)/d+(r<s?6:0);break;case r:l=(s-i)/d+2;break;case s:l=(i-r)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=tt.workingColorSpace){return tt.workingToColorSpace(Ot.copy(this),t),e.r=Ot.r,e.g=Ot.g,e.b=Ot.b,e}getStyle(e=jt){tt.workingToColorSpace(Ot.copy(this),e);const t=Ot.r,i=Ot.g,r=Ot.b;return e!==jt?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${r.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(r*255)})`}offsetHSL(e,t,i){return this.getHSL(ii),this.setHSL(ii.h+e,ii.s+t,ii.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(ii),e.getHSL(Ms);const i=Xr(ii.h,Ms.h,t),r=Xr(ii.s,Ms.s,t),s=Xr(ii.l,Ms.l,t);return this.setHSL(i,r,s),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,r=this.b,s=e.elements;return this.r=s[0]*t+s[3]*i+s[6]*r,this.g=s[1]*t+s[4]*i+s[7]*r,this.b=s[2]*t+s[5]*i+s[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Ot=new Qe;Qe.NAMES=xd;let Xf=0;class Tr extends Bi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Xf++}),this.uuid=$n(),this.name="",this.type="Material",this.blending=fr,this.side=fi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=xo,this.blendDst=Mo,this.blendEquation=wi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Qe(0,0,0),this.blendAlpha=0,this.depthFunc=vr,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Rc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Gi,this.stencilZFail=Gi,this.stencilZPass=Gi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}const r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(i):r&&r.isVector3&&i&&i.isVector3?r.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==fr&&(i.blending=this.blending),this.side!==fi&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==xo&&(i.blendSrc=this.blendSrc),this.blendDst!==Mo&&(i.blendDst=this.blendDst),this.blendEquation!==wi&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==vr&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Rc&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Gi&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Gi&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Gi&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function r(s){const a=[];for(const o in s){const l=s[o];delete l.metadata,a.push(l)}return a}if(t){const s=r(e.textures),a=r(e.images);s.length>0&&(i.textures=s),a.length>0&&(i.images=a)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const r=t.length;i=new Array(r);for(let s=0;s!==r;++s)i[s]=t[s].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class ma extends Tr{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Qe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Kn,this.combine=od,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Et=new O,Ss=new ze;let qf=0;class sn{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:qf++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=ol,this.updateRanges=[],this.gpuType=qn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let r=0,s=this.itemSize;r<s;r++)this.array[e+r]=t.array[i+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Ss.fromBufferAttribute(this,t),Ss.applyMatrix3(e),this.setXY(t,Ss.x,Ss.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.applyMatrix3(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.applyMatrix4(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.applyNormalMatrix(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Et.fromBufferAttribute(this,t),Et.transformDirection(e),this.setXYZ(t,Et.x,Et.y,Et.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Mn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=it(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Mn(t,this.array)),t}setX(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Mn(t,this.array)),t}setY(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Mn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Mn(t,this.array)),t}setW(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=it(t,this.array),i=it(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,r){return e*=this.itemSize,this.normalized&&(t=it(t,this.array),i=it(i,this.array),r=it(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e*=this.itemSize,this.normalized&&(t=it(t,this.array),i=it(i,this.array),r=it(r,this.array),s=it(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=r,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==ol&&(e.usage=this.usage),e}}class Md extends sn{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Sd extends sn{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class bt extends sn{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Yf=0;const cn=new ht,qa=new Xt,Qi=new O,tn=new Jn,Fr=new Jn,Lt=new O;class zt extends Bi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Yf++}),this.uuid=$n(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(_d(e)?Sd:Md)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const s=new $e().getNormalMatrix(e);i.applyNormalMatrix(s),i.needsUpdate=!0}const r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return cn.makeRotationFromQuaternion(e),this.applyMatrix4(cn),this}rotateX(e){return cn.makeRotationX(e),this.applyMatrix4(cn),this}rotateY(e){return cn.makeRotationY(e),this.applyMatrix4(cn),this}rotateZ(e){return cn.makeRotationZ(e),this.applyMatrix4(cn),this}translate(e,t,i){return cn.makeTranslation(e,t,i),this.applyMatrix4(cn),this}scale(e,t,i){return cn.makeScale(e,t,i),this.applyMatrix4(cn),this}lookAt(e){return qa.lookAt(e),qa.updateMatrix(),this.applyMatrix4(qa.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Qi).negate(),this.translate(Qi.x,Qi.y,Qi.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let r=0,s=e.length;r<s;r++){const a=e[r];i.push(a.x,a.y,a.z||0)}this.setAttribute("position",new bt(i,3))}else{const i=Math.min(e.length,t.count);for(let r=0;r<i;r++){const s=e[r];t.setXYZ(r,s.x,s.y,s.z||0)}e.length>t.count&&console.warn("THREE.BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Jn);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,r=t.length;i<r;i++){const s=t[i];tn.setFromBufferAttribute(s),this.morphTargetsRelative?(Lt.addVectors(this.boundingBox.min,tn.min),this.boundingBox.expandByPoint(Lt),Lt.addVectors(this.boundingBox.max,tn.max),this.boundingBox.expandByPoint(Lt)):(this.boundingBox.expandByPoint(tn.min),this.boundingBox.expandByPoint(tn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new zi);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error("THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(e){const i=this.boundingSphere.center;if(tn.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){const o=t[s];Fr.setFromBufferAttribute(o),this.morphTargetsRelative?(Lt.addVectors(tn.min,Fr.min),tn.expandByPoint(Lt),Lt.addVectors(tn.max,Fr.max),tn.expandByPoint(Lt)):(tn.expandByPoint(Fr.min),tn.expandByPoint(Fr.max))}tn.getCenter(i);let r=0;for(let s=0,a=e.count;s<a;s++)Lt.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(Lt));if(t)for(let s=0,a=t.length;s<a;s++){const o=t[s],l=this.morphTargetsRelative;for(let c=0,u=o.count;c<u;c++)Lt.fromBufferAttribute(o,c),l&&(Qi.fromBufferAttribute(e,c),Lt.add(Qi)),r=Math.max(r,i.distanceToSquared(Lt))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,r=t.normal,s=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new sn(new Float32Array(4*i.count),4));const a=this.getAttribute("tangent"),o=[],l=[];for(let R=0;R<i.count;R++)o[R]=new O,l[R]=new O;const c=new O,u=new O,d=new O,h=new ze,p=new ze,g=new ze,v=new O,m=new O;function f(R,M,x){c.fromBufferAttribute(i,R),u.fromBufferAttribute(i,M),d.fromBufferAttribute(i,x),h.fromBufferAttribute(s,R),p.fromBufferAttribute(s,M),g.fromBufferAttribute(s,x),u.sub(c),d.sub(c),p.sub(h),g.sub(h);const I=1/(p.x*g.y-g.x*p.y);isFinite(I)&&(v.copy(u).multiplyScalar(g.y).addScaledVector(d,-p.y).multiplyScalar(I),m.copy(d).multiplyScalar(p.x).addScaledVector(u,-g.x).multiplyScalar(I),o[R].add(v),o[M].add(v),o[x].add(v),l[R].add(m),l[M].add(m),l[x].add(m))}let E=this.groups;E.length===0&&(E=[{start:0,count:e.count}]);for(let R=0,M=E.length;R<M;++R){const x=E[R],I=x.start,L=x.count;for(let C=I,U=I+L;C<U;C+=3)f(e.getX(C+0),e.getX(C+1),e.getX(C+2))}const _=new O,y=new O,A=new O,S=new O;function w(R){A.fromBufferAttribute(r,R),S.copy(A);const M=o[R];_.copy(M),_.sub(A.multiplyScalar(A.dot(M))).normalize(),y.crossVectors(S,M);const I=y.dot(l[R])<0?-1:1;a.setXYZW(R,_.x,_.y,_.z,I)}for(let R=0,M=E.length;R<M;++R){const x=E[R],I=x.start,L=x.count;for(let C=I,U=I+L;C<U;C+=3)w(e.getX(C+0)),w(e.getX(C+1)),w(e.getX(C+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new sn(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let h=0,p=i.count;h<p;h++)i.setXYZ(h,0,0,0);const r=new O,s=new O,a=new O,o=new O,l=new O,c=new O,u=new O,d=new O;if(e)for(let h=0,p=e.count;h<p;h+=3){const g=e.getX(h+0),v=e.getX(h+1),m=e.getX(h+2);r.fromBufferAttribute(t,g),s.fromBufferAttribute(t,v),a.fromBufferAttribute(t,m),u.subVectors(a,s),d.subVectors(r,s),u.cross(d),o.fromBufferAttribute(i,g),l.fromBufferAttribute(i,v),c.fromBufferAttribute(i,m),o.add(u),l.add(u),c.add(u),i.setXYZ(g,o.x,o.y,o.z),i.setXYZ(v,l.x,l.y,l.z),i.setXYZ(m,c.x,c.y,c.z)}else for(let h=0,p=t.count;h<p;h+=3)r.fromBufferAttribute(t,h+0),s.fromBufferAttribute(t,h+1),a.fromBufferAttribute(t,h+2),u.subVectors(a,s),d.subVectors(r,s),u.cross(d),i.setXYZ(h+0,u.x,u.y,u.z),i.setXYZ(h+1,u.x,u.y,u.z),i.setXYZ(h+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Lt.fromBufferAttribute(e,t),Lt.normalize(),e.setXYZ(t,Lt.x,Lt.y,Lt.z)}toNonIndexed(){function e(o,l){const c=o.array,u=o.itemSize,d=o.normalized,h=new c.constructor(l.length*u);let p=0,g=0;for(let v=0,m=l.length;v<m;v++){o.isInterleavedBufferAttribute?p=l[v]*o.data.stride+o.offset:p=l[v]*u;for(let f=0;f<u;f++)h[g++]=c[p++]}return new sn(h,u,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new zt,i=this.index.array,r=this.attributes;for(const o in r){const l=r[o],c=e(l,i);t.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let u=0,d=c.length;u<d;u++){const h=c[u],p=e(h,i);l.push(p)}t.morphAttributes[o]=l}t.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const r={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let d=0,h=c.length;d<h;d++){const p=c[d];u.push(p.toJSON(e.data))}u.length>0&&(r[l]=u,s=!0)}s&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const r=e.attributes;for(const c in r){const u=r[c];this.setAttribute(c,u.clone(t))}const s=e.morphAttributes;for(const c in s){const u=[],d=s[c];for(let h=0,p=d.length;h<p;h++)u.push(d[h].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const a=e.groups;for(let c=0,u=a.length;c<u;c++){const d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}const o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Gc=new ht,xi=new pa,bs=new zi,Wc=new O,Es=new O,ws=new O,Ts=new O,Ya=new O,As=new O,Xc=new O,Rs=new O;class It extends Xt{constructor(e=new zt,t=new ma){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(e,t){const i=this.geometry,r=i.attributes.position,s=i.morphAttributes.position,a=i.morphTargetsRelative;t.fromBufferAttribute(r,e);const o=this.morphTargetInfluences;if(s&&o){As.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const u=o[l],d=s[l];u!==0&&(Ya.fromBufferAttribute(d,e),a?As.addScaledVector(Ya,u):As.addScaledVector(Ya.sub(t),u))}t.add(As)}return t}raycast(e,t){const i=this.geometry,r=this.material,s=this.matrixWorld;r!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),bs.copy(i.boundingSphere),bs.applyMatrix4(s),xi.copy(e.ray).recast(e.near),!(bs.containsPoint(xi.origin)===!1&&(xi.intersectSphere(bs,Wc)===null||xi.origin.distanceToSquared(Wc)>(e.far-e.near)**2))&&(Gc.copy(s).invert(),xi.copy(e.ray).applyMatrix4(Gc),!(i.boundingBox!==null&&xi.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,xi)))}_computeIntersections(e,t,i){let r;const s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,u=s.attributes.uv1,d=s.attributes.normal,h=s.groups,p=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,v=h.length;g<v;g++){const m=h[g],f=a[m.materialIndex],E=Math.max(m.start,p.start),_=Math.min(o.count,Math.min(m.start+m.count,p.start+p.count));for(let y=E,A=_;y<A;y+=3){const S=o.getX(y),w=o.getX(y+1),R=o.getX(y+2);r=Cs(this,f,e,i,c,u,d,S,w,R),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,p.start),v=Math.min(o.count,p.start+p.count);for(let m=g,f=v;m<f;m+=3){const E=o.getX(m),_=o.getX(m+1),y=o.getX(m+2);r=Cs(this,a,e,i,c,u,d,E,_,y),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,v=h.length;g<v;g++){const m=h[g],f=a[m.materialIndex],E=Math.max(m.start,p.start),_=Math.min(l.count,Math.min(m.start+m.count,p.start+p.count));for(let y=E,A=_;y<A;y+=3){const S=y,w=y+1,R=y+2;r=Cs(this,f,e,i,c,u,d,S,w,R),r&&(r.faceIndex=Math.floor(y/3),r.face.materialIndex=m.materialIndex,t.push(r))}}else{const g=Math.max(0,p.start),v=Math.min(l.count,p.start+p.count);for(let m=g,f=v;m<f;m+=3){const E=m,_=m+1,y=m+2;r=Cs(this,a,e,i,c,u,d,E,_,y),r&&(r.faceIndex=Math.floor(m/3),t.push(r))}}}}function $f(n,e,t,i,r,s,a,o){let l;if(e.side===Kt?l=i.intersectTriangle(a,s,r,!0,o):l=i.intersectTriangle(r,s,a,e.side===fi,o),l===null)return null;Rs.copy(o),Rs.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(Rs);return c<t.near||c>t.far?null:{distance:c,point:Rs.clone(),object:n}}function Cs(n,e,t,i,r,s,a,o,l,c){n.getVertexPosition(o,Es),n.getVertexPosition(l,ws),n.getVertexPosition(c,Ts);const u=$f(n,e,t,i,Es,ws,Ts,Xc);if(u){const d=new O;dn.getBarycoord(Xc,Es,ws,Ts,d),r&&(u.uv=dn.getInterpolatedAttribute(r,o,l,c,d,new ze)),s&&(u.uv1=dn.getInterpolatedAttribute(s,o,l,c,d,new ze)),a&&(u.normal=dn.getInterpolatedAttribute(a,o,l,c,d,new O),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const h={a:o,b:l,c,normal:new O,materialIndex:0};dn.getNormal(Es,ws,Ts,h.normal),u.face=h,u.barycoord=d}return u}class as extends zt{constructor(e=1,t=1,i=1,r=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:r,heightSegments:s,depthSegments:a};const o=this;r=Math.floor(r),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],u=[],d=[];let h=0,p=0;g("z","y","x",-1,-1,i,t,e,a,s,0),g("z","y","x",1,-1,i,t,-e,a,s,1),g("x","z","y",1,1,e,i,t,r,a,2),g("x","z","y",1,-1,e,i,-t,r,a,3),g("x","y","z",1,-1,e,t,i,r,s,4),g("x","y","z",-1,-1,e,t,-i,r,s,5),this.setIndex(l),this.setAttribute("position",new bt(c,3)),this.setAttribute("normal",new bt(u,3)),this.setAttribute("uv",new bt(d,2));function g(v,m,f,E,_,y,A,S,w,R,M){const x=y/w,I=A/R,L=y/2,C=A/2,U=S/2,F=w+1,z=R+1;let X=0,G=0;const $=new O;for(let ne=0;ne<z;ne++){const se=ne*I-C;for(let Ee=0;Ee<F;Ee++){const Ne=Ee*x-L;$[v]=Ne*E,$[m]=se*_,$[f]=U,c.push($.x,$.y,$.z),$[v]=0,$[m]=0,$[f]=S>0?1:-1,u.push($.x,$.y,$.z),d.push(Ee/w),d.push(1-ne/R),X+=1}}for(let ne=0;ne<R;ne++)for(let se=0;se<w;se++){const Ee=h+se+F*ne,Ne=h+se+F*(ne+1),ve=h+(se+1)+F*(ne+1),Re=h+(se+1)+F*ne;l.push(Ee,Ne,Re),l.push(Ne,ve,Re),G+=6}o.addGroup(p,G,M),p+=G,h+=X}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new as(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function Mr(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const r=n[t][i];r&&(r.isColor||r.isMatrix3||r.isMatrix4||r.isVector2||r.isVector3||r.isVector4||r.isTexture||r.isQuaternion)?r.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=r.clone():Array.isArray(r)?e[t][i]=r.slice():e[t][i]=r}}return e}function Gt(n){const e={};for(let t=0;t<n.length;t++){const i=Mr(n[t]);for(const r in i)e[r]=i[r]}return e}function jf(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function bd(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:tt.workingColorSpace}const Hl={clone:Mr,merge:Gt};var Zf=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Kf=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class an extends Tr{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Zf,this.fragmentShader=Kf,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Mr(e.uniforms),this.uniformsGroups=jf(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const r in this.uniforms){const a=this.uniforms[r].value;a&&a.isTexture?t.uniforms[r]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[r]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[r]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[r]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[r]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[r]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[r]={type:"m4",value:a.toArray()}:t.uniforms[r]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const r in this.extensions)this.extensions[r]===!0&&(i[r]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Ed extends Xt{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ht,this.projectionMatrix=new ht,this.projectionMatrixInverse=new ht,this.coordinateSystem=Ln,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const ri=new O,qc=new ze,Yc=new ze;class yn extends Ed{constructor(e=50,t=1,i=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=Kr*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(Wr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Kr*2*Math.atan(Math.tan(Wr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){ri.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(ri.x,ri.y).multiplyScalar(-e/ri.z),ri.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(ri.x,ri.y).multiplyScalar(-e/ri.z)}getViewSize(e,t){return this.getViewBounds(e,qc,Yc),t.subVectors(Yc,qc)}setViewOffset(e,t,i,r,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(Wr*.5*this.fov)/this.zoom,i=2*t,r=this.aspect*i,s=-.5*r;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*r/l,t-=a.offsetY*i/c,r*=a.width/l,i*=a.height/c}const o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+r,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const er=-90,tr=1;class Jf extends Xt{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const r=new yn(er,tr,e,t);r.layers=this.layers,this.add(r);const s=new yn(er,tr,e,t);s.layers=this.layers,this.add(s);const a=new yn(er,tr,e,t);a.layers=this.layers,this.add(a);const o=new yn(er,tr,e,t);o.layers=this.layers,this.add(o);const l=new yn(er,tr,e,t);l.layers=this.layers,this.add(l);const c=new yn(er,tr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,r,s,a,o,l]=t;for(const c of t)this.remove(c);if(e===Ln)i.up.set(0,1,0),i.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===ea)i.up.set(0,-1,0),i.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,l,c,u]=this.children,d=e.getRenderTarget(),h=e.getActiveCubeFace(),p=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const v=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,r),e.render(t,s),e.setRenderTarget(i,1,r),e.render(t,a),e.setRenderTarget(i,2,r),e.render(t,o),e.setRenderTarget(i,3,r),e.render(t,l),e.setRenderTarget(i,4,r),e.render(t,c),i.texture.generateMipmaps=v,e.setRenderTarget(i,5,r),e.render(t,u),e.setRenderTarget(d,h,p),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class wd extends Bt{constructor(e=[],t=_r,i,r,s,a,o,l,c,u){super(e,t,i,r,s,a,o,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class Qf extends Ui{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},r=[i,i,i,i,i,i];this.texture=new wd(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new as(5,5,5),s=new an({name:"CubemapFromEquirect",uniforms:Mr(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Kt,blending:oi});s.uniforms.tEquirect.value=t;const a=new It(r,s),o=t.minFilter;return t.minFilter===Ai&&(t.minFilter=Wt),new Jf(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,i=!0,r=!0){const s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,i,r);e.setRenderTarget(s)}}class bn extends Xt{constructor(){super(),this.isGroup=!0,this.type="Group"}}const ep={type:"move"};class $a{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new bn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new bn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new bn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let r=null,s=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){a=!0;for(const v of e.hand.values()){const m=t.getJointPose(v,i),f=this._getHandJoint(c,v);m!==null&&(f.matrix.fromArray(m.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=m.radius),f.visible=m!==null}const u=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],h=u.position.distanceTo(d.position),p=.02,g=.005;c.inputState.pinching&&h>p+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&h<=p-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,i),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,i),r===null&&s!==null&&(r=s),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(ep)))}return o!==null&&(o.visible=r!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new bn;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}class tp extends Xt{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Kn,this.environmentIntensity=1,this.environmentRotation=new Kn,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}class Td{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=ol,this.updateRanges=[],this.version=0,this.uuid=$n()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let r=0,s=this.stride;r<s;r++)this.array[e+r]=t.array[i+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=$n()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);const t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=$n()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}const Ht=new O;class In{constructor(e,t,i,r=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)Ht.fromBufferAttribute(this,t),Ht.applyMatrix4(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ht.fromBufferAttribute(this,t),Ht.applyNormalMatrix(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ht.fromBufferAttribute(this,t),Ht.transformDirection(e),this.setXYZ(t,Ht.x,Ht.y,Ht.z);return this}getComponent(e,t){let i=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(i=Mn(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=it(i,this.array)),this.data.array[e*this.data.stride+this.offset+t]=i,this}setX(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Mn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Mn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Mn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Mn(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=it(t,this.array),i=it(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=it(t,this.array),i=it(i,this.array),r=it(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=r,this}setXYZW(e,t,i,r,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=it(t,this.array),i=it(i,this.array),r=it(r,this.array),s=it(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=r,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return new sn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new In(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");const t=[];for(let i=0;i<this.count;i++){const r=i*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[r+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}class Ad extends Tr{constructor(e){super(),this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new Qe(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}}let nr;const Or=new O,ir=new O,rr=new O,sr=new ze,Br=new ze,Rd=new ht,Ps=new O,zr=new O,Ls=new O,$c=new ze,ja=new ze,jc=new ze;class np extends Xt{constructor(e=new Ad){if(super(),this.isSprite=!0,this.type="Sprite",nr===void 0){nr=new zt;const t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),i=new Td(t,5);nr.setIndex([0,1,2,0,2,3]),nr.setAttribute("position",new In(i,3,0,!1)),nr.setAttribute("uv",new In(i,2,3,!1))}this.geometry=nr,this.material=e,this.center=new ze(.5,.5),this.count=1}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),ir.setFromMatrixScale(this.matrixWorld),Rd.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),rr.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&ir.multiplyScalar(-rr.z);const i=this.material.rotation;let r,s;i!==0&&(s=Math.cos(i),r=Math.sin(i));const a=this.center;Is(Ps.set(-.5,-.5,0),rr,a,ir,r,s),Is(zr.set(.5,-.5,0),rr,a,ir,r,s),Is(Ls.set(.5,.5,0),rr,a,ir,r,s),$c.set(0,0),ja.set(1,0),jc.set(1,1);let o=e.ray.intersectTriangle(Ps,zr,Ls,!1,Or);if(o===null&&(Is(zr.set(-.5,.5,0),rr,a,ir,r,s),ja.set(0,1),o=e.ray.intersectTriangle(Ps,Ls,zr,!1,Or),o===null))return;const l=e.ray.origin.distanceTo(Or);l<e.near||l>e.far||t.push({distance:l,point:Or.clone(),uv:dn.getInterpolation(Or,Ps,zr,Ls,$c,ja,jc,new ze),face:null,object:this})}copy(e,t){return super.copy(e,t),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}}function Is(n,e,t,i,r,s){sr.subVectors(n,t).addScalar(.5).multiply(i),r!==void 0?(Br.x=s*sr.x-r*sr.y,Br.y=r*sr.x+s*sr.y):Br.copy(sr),n.copy(e),n.x+=Br.x,n.y+=Br.y,n.applyMatrix4(Rd)}const Za=new O,ip=new O,rp=new $e;class si{constructor(e=new O(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,r){return this.normal.set(e,t,i),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const r=Za.subVectors(i,t).cross(ip.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(Za),r=this.normal.dot(i);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const s=-(e.start.dot(this.normal)+this.constant)/r;return s<0||s>1?null:t.copy(e.start).addScaledVector(i,s)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||rp.getNormalMatrix(e),r=this.coplanarPoint(Za).applyMatrix4(e),s=this.normal.applyMatrix3(i).normalize();return this.constant=-r.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Mi=new zi,sp=new ze(.5,.5),Ds=new O;class Cd{constructor(e=new si,t=new si,i=new si,r=new si,s=new si,a=new si){this.planes=[e,t,i,r,s,a]}set(e,t,i,r,s,a){const o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(i),o[3].copy(r),o[4].copy(s),o[5].copy(a),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=Ln,i=!1){const r=this.planes,s=e.elements,a=s[0],o=s[1],l=s[2],c=s[3],u=s[4],d=s[5],h=s[6],p=s[7],g=s[8],v=s[9],m=s[10],f=s[11],E=s[12],_=s[13],y=s[14],A=s[15];if(r[0].setComponents(c-a,p-u,f-g,A-E).normalize(),r[1].setComponents(c+a,p+u,f+g,A+E).normalize(),r[2].setComponents(c+o,p+d,f+v,A+_).normalize(),r[3].setComponents(c-o,p-d,f-v,A-_).normalize(),i)r[4].setComponents(l,h,m,y).normalize(),r[5].setComponents(c-l,p-h,f-m,A-y).normalize();else if(r[4].setComponents(c-l,p-h,f-m,A-y).normalize(),t===Ln)r[5].setComponents(c+l,p+h,f+m,A+y).normalize();else if(t===ea)r[5].setComponents(l,h,m,y).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Mi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Mi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Mi)}intersectsSprite(e){Mi.center.set(0,0,0);const t=sp.distanceTo(e.center);return Mi.radius=.7071067811865476+t,Mi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Mi)}intersectsSphere(e){const t=this.planes,i=e.center,r=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(i)<r)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const r=t[i];if(Ds.x=r.normal.x>0?e.max.x:e.min.x,Ds.y=r.normal.y>0?e.max.y:e.min.y,Ds.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Ds)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Pd extends Tr{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Qe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const ta=new O,na=new O,Zc=new ht,kr=new pa,Us=new zi,Ka=new O,Kc=new O;class ap extends Xt{constructor(e=new zt,t=new Pd){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let r=1,s=t.count;r<s;r++)ta.fromBufferAttribute(t,r-1),na.fromBufferAttribute(t,r),i[r]=i[r-1],i[r]+=ta.distanceTo(na);e.setAttribute("lineDistance",new bt(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,r=this.matrixWorld,s=e.params.Line.threshold,a=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Us.copy(i.boundingSphere),Us.applyMatrix4(r),Us.radius+=s,e.ray.intersectsSphere(Us)===!1)return;Zc.copy(r).invert(),kr.copy(e.ray).applyMatrix4(Zc);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=this.isLineSegments?2:1,u=i.index,h=i.attributes.position;if(u!==null){const p=Math.max(0,a.start),g=Math.min(u.count,a.start+a.count);for(let v=p,m=g-1;v<m;v+=c){const f=u.getX(v),E=u.getX(v+1),_=Ns(this,e,kr,l,f,E,v);_&&t.push(_)}if(this.isLineLoop){const v=u.getX(g-1),m=u.getX(p),f=Ns(this,e,kr,l,v,m,g-1);f&&t.push(f)}}else{const p=Math.max(0,a.start),g=Math.min(h.count,a.start+a.count);for(let v=p,m=g-1;v<m;v+=c){const f=Ns(this,e,kr,l,v,v+1,v);f&&t.push(f)}if(this.isLineLoop){const v=Ns(this,e,kr,l,g-1,p,g-1);v&&t.push(v)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const r=t[i[0]];if(r!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=r.length;s<a;s++){const o=r[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function Ns(n,e,t,i,r,s,a){const o=n.geometry.attributes.position;if(ta.fromBufferAttribute(o,r),na.fromBufferAttribute(o,s),t.distanceSqToSegment(ta,na,Ka,Kc)>i)return;Ka.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(Ka);if(!(c<e.near||c>e.far))return{distance:c,point:Kc.clone().applyMatrix4(n.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:n}}class Ky extends Bt{constructor(e,t,i,r,s=Wt,a=Wt,o,l,c){super(e,t,i,r,s,a,o,l,c),this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;const u=this;function d(){u.needsUpdate=!0,u._requestVideoFrameCallbackId=e.requestVideoFrameCallback(d)}"requestVideoFrameCallback"in e&&(this._requestVideoFrameCallbackId=e.requestVideoFrameCallback(d))}clone(){return new this.constructor(this.image).copy(this)}update(){const e=this.image;"requestVideoFrameCallback"in e===!1&&e.readyState>=e.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}dispose(){this._requestVideoFrameCallbackId!==0&&this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),super.dispose()}}class Ld extends Bt{constructor(e,t,i=Ii,r,s,a,o=En,l=En,c,u=jr,d=1){if(u!==jr&&u!==Zr)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const h={width:e,height:t,depth:d};super(h,r,s,a,o,l,u,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new zl(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Id extends Bt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class ga extends zt{constructor(e=1,t=1,i=1,r=32,s=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:r,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:l};const c=this;r=Math.floor(r),s=Math.floor(s);const u=[],d=[],h=[],p=[];let g=0;const v=[],m=i/2;let f=0;E(),a===!1&&(e>0&&_(!0),t>0&&_(!1)),this.setIndex(u),this.setAttribute("position",new bt(d,3)),this.setAttribute("normal",new bt(h,3)),this.setAttribute("uv",new bt(p,2));function E(){const y=new O,A=new O;let S=0;const w=(t-e)/i;for(let R=0;R<=s;R++){const M=[],x=R/s,I=x*(t-e)+e;for(let L=0;L<=r;L++){const C=L/r,U=C*l+o,F=Math.sin(U),z=Math.cos(U);A.x=I*F,A.y=-x*i+m,A.z=I*z,d.push(A.x,A.y,A.z),y.set(F,w,z).normalize(),h.push(y.x,y.y,y.z),p.push(C,1-x),M.push(g++)}v.push(M)}for(let R=0;R<r;R++)for(let M=0;M<s;M++){const x=v[M][R],I=v[M+1][R],L=v[M+1][R+1],C=v[M][R+1];(e>0||M!==0)&&(u.push(x,I,C),S+=3),(t>0||M!==s-1)&&(u.push(I,L,C),S+=3)}c.addGroup(f,S,0),f+=S}function _(y){const A=g,S=new ze,w=new O;let R=0;const M=y===!0?e:t,x=y===!0?1:-1;for(let L=1;L<=r;L++)d.push(0,m*x,0),h.push(0,x,0),p.push(.5,.5),g++;const I=g;for(let L=0;L<=r;L++){const U=L/r*l+o,F=Math.cos(U),z=Math.sin(U);w.x=M*z,w.y=m*x,w.z=M*F,d.push(w.x,w.y,w.z),h.push(0,x,0),S.x=F*.5+.5,S.y=z*.5*x+.5,p.push(S.x,S.y),g++}for(let L=0;L<r;L++){const C=A+L,U=I+L;y===!0?u.push(U,U+1,C):u.push(U+1,U,C),R+=3}c.addGroup(f,R,y===!0?1:2),f+=R}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ga(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}}class op{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){console.warn("THREE.Curve: .getPoint() not implemented.")}getPointAt(e,t){const i=this.getUtoTmapping(e);return this.getPoint(i,t)}getPoints(e=5){const t=[];for(let i=0;i<=e;i++)t.push(this.getPoint(i/e));return t}getSpacedPoints(e=5){const t=[];for(let i=0;i<=e;i++)t.push(this.getPointAt(i/e));return t}getLength(){const e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const t=[];let i,r=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)i=this.getPoint(a/e),s+=i.distanceTo(r),t.push(s),r=i;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){const i=this.getLengths();let r=0;const s=i.length;let a;t?a=t:a=e*i[s-1];let o=0,l=s-1,c;for(;o<=l;)if(r=Math.floor(o+(l-o)/2),c=i[r]-a,c<0)o=r+1;else if(c>0)l=r-1;else{l=r;break}if(r=l,i[r]===a)return r/(s-1);const u=i[r],h=i[r+1]-u,p=(a-u)/h;return(r+p)/(s-1)}getTangent(e,t){let r=e-1e-4,s=e+1e-4;r<0&&(r=0),s>1&&(s=1);const a=this.getPoint(r),o=this.getPoint(s),l=t||(a.isVector2?new ze:new O);return l.copy(o).sub(a).normalize(),l}getTangentAt(e,t){const i=this.getUtoTmapping(e);return this.getTangent(i,t)}computeFrenetFrames(e,t=!1){const i=new O,r=[],s=[],a=[],o=new O,l=new ht;for(let p=0;p<=e;p++){const g=p/e;r[p]=this.getTangentAt(g,new O)}s[0]=new O,a[0]=new O;let c=Number.MAX_VALUE;const u=Math.abs(r[0].x),d=Math.abs(r[0].y),h=Math.abs(r[0].z);u<=c&&(c=u,i.set(1,0,0)),d<=c&&(c=d,i.set(0,1,0)),h<=c&&i.set(0,0,1),o.crossVectors(r[0],i).normalize(),s[0].crossVectors(r[0],o),a[0].crossVectors(r[0],s[0]);for(let p=1;p<=e;p++){if(s[p]=s[p-1].clone(),a[p]=a[p-1].clone(),o.crossVectors(r[p-1],r[p]),o.length()>Number.EPSILON){o.normalize();const g=Math.acos(We(r[p-1].dot(r[p]),-1,1));s[p].applyMatrix4(l.makeRotationAxis(o,g))}a[p].crossVectors(r[p],s[p])}if(t===!0){let p=Math.acos(We(s[0].dot(s[e]),-1,1));p/=e,r[0].dot(o.crossVectors(s[0],s[e]))>0&&(p=-p);for(let g=1;g<=e;g++)s[g].applyMatrix4(l.makeRotationAxis(r[g],p*g)),a[g].crossVectors(r[g],s[g])}return{tangents:r,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){const e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}}function Vl(){let n=0,e=0,t=0,i=0;function r(s,a,o,l){n=s,e=o,t=-3*s+3*a-2*o-l,i=2*s-2*a+o+l}return{initCatmullRom:function(s,a,o,l,c){r(a,o,c*(o-s),c*(l-a))},initNonuniformCatmullRom:function(s,a,o,l,c,u,d){let h=(a-s)/c-(o-s)/(c+u)+(o-a)/u,p=(o-a)/u-(l-a)/(u+d)+(l-o)/d;h*=u,p*=u,r(a,o,h,p)},calc:function(s){const a=s*s,o=a*s;return n+e*s+t*a+i*o}}}const Fs=new O,Ja=new Vl,Qa=new Vl,eo=new Vl;class lp extends op{constructor(e=[],t=!1,i="centripetal",r=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=i,this.tension=r}getPoint(e,t=new O){const i=t,r=this.points,s=r.length,a=(s-(this.closed?0:1))*e;let o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,u;this.closed||o>0?c=r[(o-1)%s]:(Fs.subVectors(r[0],r[1]).add(r[0]),c=Fs);const d=r[o%s],h=r[(o+1)%s];if(this.closed||o+2<s?u=r[(o+2)%s]:(Fs.subVectors(r[s-1],r[s-2]).add(r[s-1]),u=Fs),this.curveType==="centripetal"||this.curveType==="chordal"){const p=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(d),p),v=Math.pow(d.distanceToSquared(h),p),m=Math.pow(h.distanceToSquared(u),p);v<1e-4&&(v=1),g<1e-4&&(g=v),m<1e-4&&(m=v),Ja.initNonuniformCatmullRom(c.x,d.x,h.x,u.x,g,v,m),Qa.initNonuniformCatmullRom(c.y,d.y,h.y,u.y,g,v,m),eo.initNonuniformCatmullRom(c.z,d.z,h.z,u.z,g,v,m)}else this.curveType==="catmullrom"&&(Ja.initCatmullRom(c.x,d.x,h.x,u.x,this.tension),Qa.initCatmullRom(c.y,d.y,h.y,u.y,this.tension),eo.initCatmullRom(c.z,d.z,h.z,u.z,this.tension));return i.set(Ja.calc(l),Qa.calc(l),eo.calc(l)),i}copy(e){super.copy(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const r=e.points[t];this.points.push(r.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){const e=super.toJSON();e.points=[];for(let t=0,i=this.points.length;t<i;t++){const r=this.points[t];e.points.push(r.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,i=e.points.length;t<i;t++){const r=e.points[t];this.points.push(new O().fromArray(r))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}}function cp(n,e,t=2){const i=e&&e.length,r=i?e[0]*t:n.length;let s=Dd(n,0,r,t,!0);const a=[];if(!s||s.next===s.prev)return a;let o,l,c;if(i&&(s=pp(n,e,s,t)),n.length>80*t){o=1/0,l=1/0;let u=-1/0,d=-1/0;for(let h=t;h<r;h+=t){const p=n[h],g=n[h+1];p<o&&(o=p),g<l&&(l=g),p>u&&(u=p),g>d&&(d=g)}c=Math.max(u-o,d-l),c=c!==0?32767/c:0}return es(s,a,t,o,l,c,0),a}function Dd(n,e,t,i,r){let s;if(r===wp(n,e,t,i)>0)for(let a=e;a<t;a+=i)s=Jc(a/i|0,n[a],n[a+1],s);else for(let a=t-i;a>=e;a-=i)s=Jc(a/i|0,n[a],n[a+1],s);return s&&Sr(s,s.next)&&(ns(s),s=s.next),s}function Ni(n,e){if(!n)return n;e||(e=n);let t=n,i;do if(i=!1,!t.steiner&&(Sr(t,t.next)||_t(t.prev,t,t.next)===0)){if(ns(t),t=e=t.prev,t===t.next)break;i=!0}else t=t.next;while(i||t!==e);return e}function es(n,e,t,i,r,s,a){if(!n)return;!a&&s&&yp(n,i,r,s);let o=n;for(;n.prev!==n.next;){const l=n.prev,c=n.next;if(s?dp(n,i,r,s):up(n)){e.push(l.i,n.i,c.i),ns(n),n=c.next,o=c.next;continue}if(n=c,n===o){a?a===1?(n=hp(Ni(n),e),es(n,e,t,i,r,s,2)):a===2&&fp(n,e,t,i,r,s):es(Ni(n),e,t,i,r,s,1);break}}}function up(n){const e=n.prev,t=n,i=n.next;if(_t(e,t,i)>=0)return!1;const r=e.x,s=t.x,a=i.x,o=e.y,l=t.y,c=i.y,u=Math.min(r,s,a),d=Math.min(o,l,c),h=Math.max(r,s,a),p=Math.max(o,l,c);let g=i.next;for(;g!==e;){if(g.x>=u&&g.x<=h&&g.y>=d&&g.y<=p&&Vr(r,o,s,l,a,c,g.x,g.y)&&_t(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function dp(n,e,t,i){const r=n.prev,s=n,a=n.next;if(_t(r,s,a)>=0)return!1;const o=r.x,l=s.x,c=a.x,u=r.y,d=s.y,h=a.y,p=Math.min(o,l,c),g=Math.min(u,d,h),v=Math.max(o,l,c),m=Math.max(u,d,h),f=ll(p,g,e,t,i),E=ll(v,m,e,t,i);let _=n.prevZ,y=n.nextZ;for(;_&&_.z>=f&&y&&y.z<=E;){if(_.x>=p&&_.x<=v&&_.y>=g&&_.y<=m&&_!==r&&_!==a&&Vr(o,u,l,d,c,h,_.x,_.y)&&_t(_.prev,_,_.next)>=0||(_=_.prevZ,y.x>=p&&y.x<=v&&y.y>=g&&y.y<=m&&y!==r&&y!==a&&Vr(o,u,l,d,c,h,y.x,y.y)&&_t(y.prev,y,y.next)>=0))return!1;y=y.nextZ}for(;_&&_.z>=f;){if(_.x>=p&&_.x<=v&&_.y>=g&&_.y<=m&&_!==r&&_!==a&&Vr(o,u,l,d,c,h,_.x,_.y)&&_t(_.prev,_,_.next)>=0)return!1;_=_.prevZ}for(;y&&y.z<=E;){if(y.x>=p&&y.x<=v&&y.y>=g&&y.y<=m&&y!==r&&y!==a&&Vr(o,u,l,d,c,h,y.x,y.y)&&_t(y.prev,y,y.next)>=0)return!1;y=y.nextZ}return!0}function hp(n,e){let t=n;do{const i=t.prev,r=t.next.next;!Sr(i,r)&&Nd(i,t,t.next,r)&&ts(i,r)&&ts(r,i)&&(e.push(i.i,t.i,r.i),ns(t),ns(t.next),t=n=r),t=t.next}while(t!==n);return Ni(t)}function fp(n,e,t,i,r,s){let a=n;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&Sp(a,o)){let l=Fd(a,o);a=Ni(a,a.next),l=Ni(l,l.next),es(a,e,t,i,r,s,0),es(l,e,t,i,r,s,0);return}o=o.next}a=a.next}while(a!==n)}function pp(n,e,t,i){const r=[];for(let s=0,a=e.length;s<a;s++){const o=e[s]*i,l=s<a-1?e[s+1]*i:n.length,c=Dd(n,o,l,i,!1);c===c.next&&(c.steiner=!0),r.push(Mp(c))}r.sort(mp);for(let s=0;s<r.length;s++)t=gp(r[s],t);return t}function mp(n,e){let t=n.x-e.x;if(t===0&&(t=n.y-e.y,t===0)){const i=(n.next.y-n.y)/(n.next.x-n.x),r=(e.next.y-e.y)/(e.next.x-e.x);t=i-r}return t}function gp(n,e){const t=vp(n,e);if(!t)return e;const i=Fd(t,n);return Ni(i,i.next),Ni(t,t.next)}function vp(n,e){let t=e;const i=n.x,r=n.y;let s=-1/0,a;if(Sr(n,t))return t;do{if(Sr(n,t.next))return t.next;if(r<=t.y&&r>=t.next.y&&t.next.y!==t.y){const d=t.x+(r-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=i&&d>s&&(s=d,a=t.x<t.next.x?t:t.next,d===i))return a}t=t.next}while(t!==e);if(!a)return null;const o=a,l=a.x,c=a.y;let u=1/0;t=a;do{if(i>=t.x&&t.x>=l&&i!==t.x&&Ud(r<c?i:s,r,l,c,r<c?s:i,r,t.x,t.y)){const d=Math.abs(r-t.y)/(i-t.x);ts(t,n)&&(d<u||d===u&&(t.x>a.x||t.x===a.x&&_p(a,t)))&&(a=t,u=d)}t=t.next}while(t!==o);return a}function _p(n,e){return _t(n.prev,n,e.prev)<0&&_t(e.next,n,n.next)<0}function yp(n,e,t,i){let r=n;do r.z===0&&(r.z=ll(r.x,r.y,e,t,i)),r.prevZ=r.prev,r.nextZ=r.next,r=r.next;while(r!==n);r.prevZ.nextZ=null,r.prevZ=null,xp(r)}function xp(n){let e,t=1;do{let i=n,r;n=null;let s=null;for(e=0;i;){e++;let a=i,o=0;for(let c=0;c<t&&(o++,a=a.nextZ,!!a);c++);let l=t;for(;o>0||l>0&&a;)o!==0&&(l===0||!a||i.z<=a.z)?(r=i,i=i.nextZ,o--):(r=a,a=a.nextZ,l--),s?s.nextZ=r:n=r,r.prevZ=s,s=r;i=a}s.nextZ=null,t*=2}while(e>1);return n}function ll(n,e,t,i,r){return n=(n-t)*r|0,e=(e-i)*r|0,n=(n|n<<8)&16711935,n=(n|n<<4)&252645135,n=(n|n<<2)&858993459,n=(n|n<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,n|e<<1}function Mp(n){let e=n,t=n;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==n);return t}function Ud(n,e,t,i,r,s,a,o){return(r-a)*(e-o)>=(n-a)*(s-o)&&(n-a)*(i-o)>=(t-a)*(e-o)&&(t-a)*(s-o)>=(r-a)*(i-o)}function Vr(n,e,t,i,r,s,a,o){return!(n===a&&e===o)&&Ud(n,e,t,i,r,s,a,o)}function Sp(n,e){return n.next.i!==e.i&&n.prev.i!==e.i&&!bp(n,e)&&(ts(n,e)&&ts(e,n)&&Ep(n,e)&&(_t(n.prev,n,e.prev)||_t(n,e.prev,e))||Sr(n,e)&&_t(n.prev,n,n.next)>0&&_t(e.prev,e,e.next)>0)}function _t(n,e,t){return(e.y-n.y)*(t.x-e.x)-(e.x-n.x)*(t.y-e.y)}function Sr(n,e){return n.x===e.x&&n.y===e.y}function Nd(n,e,t,i){const r=Bs(_t(n,e,t)),s=Bs(_t(n,e,i)),a=Bs(_t(t,i,n)),o=Bs(_t(t,i,e));return!!(r!==s&&a!==o||r===0&&Os(n,t,e)||s===0&&Os(n,i,e)||a===0&&Os(t,n,i)||o===0&&Os(t,e,i))}function Os(n,e,t){return e.x<=Math.max(n.x,t.x)&&e.x>=Math.min(n.x,t.x)&&e.y<=Math.max(n.y,t.y)&&e.y>=Math.min(n.y,t.y)}function Bs(n){return n>0?1:n<0?-1:0}function bp(n,e){let t=n;do{if(t.i!==n.i&&t.next.i!==n.i&&t.i!==e.i&&t.next.i!==e.i&&Nd(t,t.next,n,e))return!0;t=t.next}while(t!==n);return!1}function ts(n,e){return _t(n.prev,n,n.next)<0?_t(n,e,n.next)>=0&&_t(n,n.prev,e)>=0:_t(n,e,n.prev)<0||_t(n,n.next,e)<0}function Ep(n,e){let t=n,i=!1;const r=(n.x+e.x)/2,s=(n.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&r<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(i=!i),t=t.next;while(t!==n);return i}function Fd(n,e){const t=cl(n.i,n.x,n.y),i=cl(e.i,e.x,e.y),r=n.next,s=e.prev;return n.next=e,e.prev=n,t.next=r,r.prev=t,i.next=t,t.prev=i,s.next=i,i.prev=s,i}function Jc(n,e,t,i){const r=cl(n,e,t);return i?(r.next=i.next,r.prev=i,i.next.prev=r,i.next=r):(r.prev=r,r.next=r),r}function ns(n){n.next.prev=n.prev,n.prev.next=n.next,n.prevZ&&(n.prevZ.nextZ=n.nextZ),n.nextZ&&(n.nextZ.prevZ=n.prevZ)}function cl(n,e,t){return{i:n,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function wp(n,e,t,i){let r=0;for(let s=e,a=t-i;s<t;s+=i)r+=(n[a]-n[s])*(n[s+1]+n[a+1]),a=s;return r}class Tp{static triangulate(e,t,i=2){return cp(e,t,i)}}class va{static area(e){const t=e.length;let i=0;for(let r=t-1,s=0;s<t;r=s++)i+=e[r].x*e[s].y-e[s].x*e[r].y;return i*.5}static isClockWise(e){return va.area(e)<0}static triangulateShape(e,t){const i=[],r=[],s=[];Qc(e),eu(i,e);let a=e.length;t.forEach(Qc);for(let l=0;l<t.length;l++)r.push(a),a+=t[l].length,eu(i,t[l]);const o=Tp.triangulate(i,r);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}}function Qc(n){const e=n.length;e>2&&n[e-1].equals(n[0])&&n.pop()}function eu(n,e){for(let t=0;t<e.length;t++)n.push(e[t].x),n.push(e[t].y)}class os extends zt{constructor(e=1,t=1,i=1,r=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:r};const s=e/2,a=t/2,o=Math.floor(i),l=Math.floor(r),c=o+1,u=l+1,d=e/o,h=t/l,p=[],g=[],v=[],m=[];for(let f=0;f<u;f++){const E=f*h-a;for(let _=0;_<c;_++){const y=_*d-s;g.push(y,-E,0),v.push(0,0,1),m.push(_/o),m.push(1-f/l)}}for(let f=0;f<l;f++)for(let E=0;E<o;E++){const _=E+c*f,y=E+c*(f+1),A=E+1+c*(f+1),S=E+1+c*f;p.push(_,y,S),p.push(y,A,S)}this.setIndex(p),this.setAttribute("position",new bt(g,3)),this.setAttribute("normal",new bt(v,3)),this.setAttribute("uv",new bt(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new os(e.width,e.height,e.widthSegments,e.heightSegments)}}class Ap extends zt{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){const t=[],i=new Set,r=new O,s=new O;if(e.index!==null){const a=e.attributes.position,o=e.index;let l=e.groups;l.length===0&&(l=[{start:0,count:o.count,materialIndex:0}]);for(let c=0,u=l.length;c<u;++c){const d=l[c],h=d.start,p=d.count;for(let g=h,v=h+p;g<v;g+=3)for(let m=0;m<3;m++){const f=o.getX(g+m),E=o.getX(g+(m+1)%3);r.fromBufferAttribute(a,f),s.fromBufferAttribute(a,E),tu(r,s,i)===!0&&(t.push(r.x,r.y,r.z),t.push(s.x,s.y,s.z))}}}else{const a=e.attributes.position;for(let o=0,l=a.count/3;o<l;o++)for(let c=0;c<3;c++){const u=3*o+c,d=3*o+(c+1)%3;r.fromBufferAttribute(a,u),s.fromBufferAttribute(a,d),tu(r,s,i)===!0&&(t.push(r.x,r.y,r.z),t.push(s.x,s.y,s.z))}}this.setAttribute("position",new bt(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}}function tu(n,e,t){const i=`${n.x},${n.y},${n.z}-${e.x},${e.y},${e.z}`,r=`${e.x},${e.y},${e.z}-${n.x},${n.y},${n.z}`;return t.has(i)===!0||t.has(r)===!0?!1:(t.add(i),t.add(r),!0)}class Rp extends Tr{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=tf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class Cp extends Tr{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}const to={enabled:!1,files:{},add:function(n,e){this.enabled!==!1&&(this.files[n]=e)},get:function(n){if(this.enabled!==!1)return this.files[n]},remove:function(n){delete this.files[n]},clear:function(){this.files={}}};class Pp{constructor(e,t,i){const r=this;let s=!1,a=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this.abortController=new AbortController,this.itemStart=function(u){o++,s===!1&&r.onStart!==void 0&&r.onStart(u,a,o),s=!0},this.itemEnd=function(u){a++,r.onProgress!==void 0&&r.onProgress(u,a,o),a===o&&(s=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(u){r.onError!==void 0&&r.onError(u)},this.resolveURL=function(u){return l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,d){return c.push(u,d),this},this.removeHandler=function(u){const d=c.indexOf(u);return d!==-1&&c.splice(d,2),this},this.getHandler=function(u){for(let d=0,h=c.length;d<h;d+=2){const p=c[d],g=c[d+1];if(p.global&&(p.lastIndex=0),p.test(u))return g}return null},this.abort=function(){return this.abortController.abort(),this.abortController=new AbortController,this}}}const Lp=new Pp;class Gl{constructor(e){this.manager=e!==void 0?e:Lp,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){const i=this;return new Promise(function(r,s){i.load(e,r,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}}Gl.DEFAULT_MATERIAL_NAME="__DEFAULT";const ar=new WeakMap;class Ip extends Gl{constructor(e){super(e)}load(e,t,i,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);const s=this,a=to.get(`image:${e}`);if(a!==void 0){if(a.complete===!0)s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0);else{let d=ar.get(a);d===void 0&&(d=[],ar.set(a,d)),d.push({onLoad:t,onError:r})}return a}const o=Jr("img");function l(){u(),t&&t(this);const d=ar.get(this)||[];for(let h=0;h<d.length;h++){const p=d[h];p.onLoad&&p.onLoad(this)}ar.delete(this),s.manager.itemEnd(e)}function c(d){u(),r&&r(d),to.remove(`image:${e}`);const h=ar.get(this)||[];for(let p=0;p<h.length;p++){const g=h[p];g.onError&&g.onError(d)}ar.delete(this),s.manager.itemError(e),s.manager.itemEnd(e)}function u(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),to.add(`image:${e}`,o),s.manager.itemStart(e),o.src=e,o}}class Od extends Gl{constructor(e){super(e)}load(e,t,i,r){const s=new Bt,a=new Ip(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o,s.needsUpdate=!0,t!==void 0&&t(s)},i,r),s}}class Bd extends Ed{constructor(e=-1,t=1,i=1,r=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=r,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,r,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=r,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,r=(this.top+this.bottom)/2;let s=i-e,a=i+e,o=r+t,l=r-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=u*this.view.offsetY,l=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class Dp extends zt{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){const e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}}class Up extends yn{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class ul extends Td{constructor(e,t,i=1){super(e,t),this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=i}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(e){const t=super.clone(e);return t.meshPerAttribute=this.meshPerAttribute,t}toJSON(e){const t=super.toJSON(e);return t.isInstancedInterleavedBuffer=!0,t.meshPerAttribute=this.meshPerAttribute,t}}const nu=new ht;class Jy{constructor(e,t,i=0,r=1/0){this.ray=new pa(e,t),this.near=i,this.far=r,this.camera=null,this.layers=new kl,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error("THREE.Raycaster: Unsupported camera type: "+t.type)}setFromXRController(e){return nu.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(nu),this}intersectObject(e,t=!0,i=[]){return dl(e,this,i,t),i.sort(iu),i}intersectObjects(e,t=!0,i=[]){for(let r=0,s=e.length;r<s;r++)dl(e[r],this,i,t);return i.sort(iu),i}}function iu(n,e){return n.distance-e.distance}function dl(n,e,t,i){let r=!0;if(n.layers.test(e.layers)&&n.raycast(e,t)===!1&&(r=!1),r===!0&&i===!0){const s=n.children;for(let a=0,o=s.length;a<o;a++)dl(s[a],e,t,!0)}}class ru{constructor(e=1,t=0,i=0){this.radius=e,this.phi=t,this.theta=i}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=We(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(We(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const su=new O,zs=new O,or=new O,lr=new O,no=new O,Np=new O,Fp=new O;class Op{constructor(e=new O,t=new O){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){su.subVectors(e,this.start),zs.subVectors(this.end,this.start);const i=zs.dot(zs);let s=zs.dot(su)/i;return t&&(s=We(s,0,1)),s}closestPointToPoint(e,t,i){const r=this.closestPointToPointParameter(e,t);return this.delta(i).multiplyScalar(r).add(this.start)}distanceSqToLine3(e,t=Np,i=Fp){const r=10000000000000001e-32;let s,a;const o=this.start,l=e.start,c=this.end,u=e.end;or.subVectors(c,o),lr.subVectors(u,l),no.subVectors(o,l);const d=or.dot(or),h=lr.dot(lr),p=lr.dot(no);if(d<=r&&h<=r)return t.copy(o),i.copy(l),t.sub(i),t.dot(t);if(d<=r)s=0,a=p/h,a=We(a,0,1);else{const g=or.dot(no);if(h<=r)a=0,s=We(-g/d,0,1);else{const v=or.dot(lr),m=d*h-v*v;m!==0?s=We((v*p-g*h)/m,0,1):s=0,a=(v*s+p)/h,a<0?(a=0,s=We(-g/d,0,1)):a>1&&(a=1,s=We((v-g)/d,0,1))}}return t.copy(o).add(or.multiplyScalar(s)),i.copy(l).add(lr.multiplyScalar(a)),t.sub(i),t.dot(t)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}}class Bp extends Bi{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){console.warn("THREE.Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function au(n,e,t,i){const r=zp(i);switch(t){case fd:return n*e;case md:return n*e/r.components*r.byteLength;case Nl:return n*e/r.components*r.byteLength;case gd:return n*e*2/r.components*r.byteLength;case Fl:return n*e*2/r.components*r.byteLength;case pd:return n*e*3/r.components*r.byteLength;case Sn:return n*e*4/r.components*r.byteLength;case Ol:return n*e*4/r.components*r.byteLength;case Ys:case $s:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case js:case Zs:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Uo:case Fo:return Math.max(n,16)*Math.max(e,8)/4;case Do:case No:return Math.max(n,8)*Math.max(e,8)/2;case Oo:case Bo:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case zo:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case ko:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Ho:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case Vo:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case Go:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case Wo:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case Xo:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case qo:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case Yo:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case $o:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case jo:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case Zo:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case Ko:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case Jo:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case Qo:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case el:case tl:case nl:return Math.ceil(n/4)*Math.ceil(e/4)*16;case il:case rl:return Math.ceil(n/4)*Math.ceil(e/4)*8;case sl:case al:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function zp(n){switch(n){case Zn:case cd:return{byteLength:1,components:1};case Yr:case ud:case ss:return{byteLength:2,components:1};case Dl:case Ul:return{byteLength:2,components:4};case Ii:case Il:case qn:return{byteLength:4,components:1};case dd:case hd:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ll}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ll);/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */function zd(){let n=null,e=!1,t=null,i=null;function r(s,a){t(s,a),i=n.requestAnimationFrame(r)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(r),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){n=s}}}function kp(n){const e=new WeakMap;function t(o,l){const c=o.array,u=o.usage,d=c.byteLength,h=n.createBuffer();n.bindBuffer(l,h),n.bufferData(l,c,u),o.onUploadCallback();let p;if(c instanceof Float32Array)p=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)p=n.HALF_FLOAT;else if(c instanceof Uint16Array)o.isFloat16BufferAttribute?p=n.HALF_FLOAT:p=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)p=n.SHORT;else if(c instanceof Uint32Array)p=n.UNSIGNED_INT;else if(c instanceof Int32Array)p=n.INT;else if(c instanceof Int8Array)p=n.BYTE;else if(c instanceof Uint8Array)p=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)p=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:h,type:p,bytesPerElement:c.BYTES_PER_ELEMENT,version:o.version,size:d}}function i(o,l,c){const u=l.array,d=l.updateRanges;if(n.bindBuffer(c,o),d.length===0)n.bufferSubData(c,0,u);else{d.sort((p,g)=>p.start-g.start);let h=0;for(let p=1;p<d.length;p++){const g=d[h],v=d[p];v.start<=g.start+g.count+1?g.count=Math.max(g.count,v.start+v.count-g.start):(++h,d[h]=v)}d.length=h+1;for(let p=0,g=d.length;p<g;p++){const v=d[p];n.bufferSubData(c,v.start*u.BYTES_PER_ELEMENT,u,v.start,v.count)}l.clearUpdateRanges()}l.onUploadCallback()}function r(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function s(o){o.isInterleavedBufferAttribute&&(o=o.data);const l=e.get(o);l&&(n.deleteBuffer(l.buffer),e.delete(o))}function a(o,l){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){const u=e.get(o);(!u||u.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}const c=e.get(o);if(c===void 0)e.set(o,t(o,l));else if(c.version<o.version){if(c.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,o,l),c.version=o.version}}return{get:r,remove:s,update:a}}var Hp=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Vp=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Gp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Wp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Xp=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,qp=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Yp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,$p=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,jp=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Zp=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Kp=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Jp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Qp=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,em=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,tm=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,nm=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,im=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,rm=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,sm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,am=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,om=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,lm=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,cm=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,um=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,dm=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,hm=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,fm=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,pm=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,mm=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,gm=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,vm="gl_FragColor = linearToOutputTexel( gl_FragColor );",_m=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ym=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,xm=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Mm=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Sm=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,bm=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Em=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,wm=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Tm=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Am=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Rm=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Cm=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Pm=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Lm=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Im=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Dm=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Um=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Nm=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Fm=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Om=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Bm=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,zm=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,km=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Hm=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Vm=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Gm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Wm=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Xm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,qm=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Ym=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,$m=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,jm=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Zm=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Km=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Jm=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Qm=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,eg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,tg=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,ng=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,ig=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,rg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,sg=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,ag=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,og=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,lg=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,cg=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,ug=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,dg=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,hg=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,fg=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,pg=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,mg=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,gg=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,vg=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,_g=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,yg=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,xg=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Mg=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Sg=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,bg=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Eg=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,wg=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Tg=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Ag=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Rg=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Cg=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Pg=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Lg=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Ig=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Dg=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Ug=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Ng=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Fg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Og=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Bg=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,zg=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const kg=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Hg=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Vg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Gg=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Xg=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,qg=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Yg=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,$g=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,jg=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Zg=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Kg=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Jg=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Qg=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ev=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,tv=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,nv=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,iv=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,rv=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,sv=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,av=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,ov=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,lv=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,cv=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,uv=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,dv=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hv=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,fv=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,pv=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,mv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,gv=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,vv=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,_v=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,yv=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,je={alphahash_fragment:Hp,alphahash_pars_fragment:Vp,alphamap_fragment:Gp,alphamap_pars_fragment:Wp,alphatest_fragment:Xp,alphatest_pars_fragment:qp,aomap_fragment:Yp,aomap_pars_fragment:$p,batching_pars_vertex:jp,batching_vertex:Zp,begin_vertex:Kp,beginnormal_vertex:Jp,bsdfs:Qp,iridescence_fragment:em,bumpmap_pars_fragment:tm,clipping_planes_fragment:nm,clipping_planes_pars_fragment:im,clipping_planes_pars_vertex:rm,clipping_planes_vertex:sm,color_fragment:am,color_pars_fragment:om,color_pars_vertex:lm,color_vertex:cm,common:um,cube_uv_reflection_fragment:dm,defaultnormal_vertex:hm,displacementmap_pars_vertex:fm,displacementmap_vertex:pm,emissivemap_fragment:mm,emissivemap_pars_fragment:gm,colorspace_fragment:vm,colorspace_pars_fragment:_m,envmap_fragment:ym,envmap_common_pars_fragment:xm,envmap_pars_fragment:Mm,envmap_pars_vertex:Sm,envmap_physical_pars_fragment:Dm,envmap_vertex:bm,fog_vertex:Em,fog_pars_vertex:wm,fog_fragment:Tm,fog_pars_fragment:Am,gradientmap_pars_fragment:Rm,lightmap_pars_fragment:Cm,lights_lambert_fragment:Pm,lights_lambert_pars_fragment:Lm,lights_pars_begin:Im,lights_toon_fragment:Um,lights_toon_pars_fragment:Nm,lights_phong_fragment:Fm,lights_phong_pars_fragment:Om,lights_physical_fragment:Bm,lights_physical_pars_fragment:zm,lights_fragment_begin:km,lights_fragment_maps:Hm,lights_fragment_end:Vm,logdepthbuf_fragment:Gm,logdepthbuf_pars_fragment:Wm,logdepthbuf_pars_vertex:Xm,logdepthbuf_vertex:qm,map_fragment:Ym,map_pars_fragment:$m,map_particle_fragment:jm,map_particle_pars_fragment:Zm,metalnessmap_fragment:Km,metalnessmap_pars_fragment:Jm,morphinstance_vertex:Qm,morphcolor_vertex:eg,morphnormal_vertex:tg,morphtarget_pars_vertex:ng,morphtarget_vertex:ig,normal_fragment_begin:rg,normal_fragment_maps:sg,normal_pars_fragment:ag,normal_pars_vertex:og,normal_vertex:lg,normalmap_pars_fragment:cg,clearcoat_normal_fragment_begin:ug,clearcoat_normal_fragment_maps:dg,clearcoat_pars_fragment:hg,iridescence_pars_fragment:fg,opaque_fragment:pg,packing:mg,premultiplied_alpha_fragment:gg,project_vertex:vg,dithering_fragment:_g,dithering_pars_fragment:yg,roughnessmap_fragment:xg,roughnessmap_pars_fragment:Mg,shadowmap_pars_fragment:Sg,shadowmap_pars_vertex:bg,shadowmap_vertex:Eg,shadowmask_pars_fragment:wg,skinbase_vertex:Tg,skinning_pars_vertex:Ag,skinning_vertex:Rg,skinnormal_vertex:Cg,specularmap_fragment:Pg,specularmap_pars_fragment:Lg,tonemapping_fragment:Ig,tonemapping_pars_fragment:Dg,transmission_fragment:Ug,transmission_pars_fragment:Ng,uv_pars_fragment:Fg,uv_pars_vertex:Og,uv_vertex:Bg,worldpos_vertex:zg,background_vert:kg,background_frag:Hg,backgroundCube_vert:Vg,backgroundCube_frag:Gg,cube_vert:Wg,cube_frag:Xg,depth_vert:qg,depth_frag:Yg,distanceRGBA_vert:$g,distanceRGBA_frag:jg,equirect_vert:Zg,equirect_frag:Kg,linedashed_vert:Jg,linedashed_frag:Qg,meshbasic_vert:ev,meshbasic_frag:tv,meshlambert_vert:nv,meshlambert_frag:iv,meshmatcap_vert:rv,meshmatcap_frag:sv,meshnormal_vert:av,meshnormal_frag:ov,meshphong_vert:lv,meshphong_frag:cv,meshphysical_vert:uv,meshphysical_frag:dv,meshtoon_vert:hv,meshtoon_frag:fv,points_vert:pv,points_frag:mv,shadow_vert:gv,shadow_frag:vv,sprite_vert:_v,sprite_frag:yv},pe={common:{diffuse:{value:new Qe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new $e}},envmap:{envMap:{value:null},envMapRotation:{value:new $e},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new $e}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new $e}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new $e},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new $e},normalScale:{value:new ze(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new $e},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new $e}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new $e}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new $e}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Qe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Qe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0},uvTransform:{value:new $e}},sprite:{diffuse:{value:new Qe(16777215)},opacity:{value:1},center:{value:new ze(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new $e},alphaMap:{value:null},alphaMapTransform:{value:new $e},alphaTest:{value:0}}},Zt={basic:{uniforms:Gt([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.fog]),vertexShader:je.meshbasic_vert,fragmentShader:je.meshbasic_frag},lambert:{uniforms:Gt([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,pe.lights,{emissive:{value:new Qe(0)}}]),vertexShader:je.meshlambert_vert,fragmentShader:je.meshlambert_frag},phong:{uniforms:Gt([pe.common,pe.specularmap,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,pe.lights,{emissive:{value:new Qe(0)},specular:{value:new Qe(1118481)},shininess:{value:30}}]),vertexShader:je.meshphong_vert,fragmentShader:je.meshphong_frag},standard:{uniforms:Gt([pe.common,pe.envmap,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.roughnessmap,pe.metalnessmap,pe.fog,pe.lights,{emissive:{value:new Qe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag},toon:{uniforms:Gt([pe.common,pe.aomap,pe.lightmap,pe.emissivemap,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.gradientmap,pe.fog,pe.lights,{emissive:{value:new Qe(0)}}]),vertexShader:je.meshtoon_vert,fragmentShader:je.meshtoon_frag},matcap:{uniforms:Gt([pe.common,pe.bumpmap,pe.normalmap,pe.displacementmap,pe.fog,{matcap:{value:null}}]),vertexShader:je.meshmatcap_vert,fragmentShader:je.meshmatcap_frag},points:{uniforms:Gt([pe.points,pe.fog]),vertexShader:je.points_vert,fragmentShader:je.points_frag},dashed:{uniforms:Gt([pe.common,pe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:je.linedashed_vert,fragmentShader:je.linedashed_frag},depth:{uniforms:Gt([pe.common,pe.displacementmap]),vertexShader:je.depth_vert,fragmentShader:je.depth_frag},normal:{uniforms:Gt([pe.common,pe.bumpmap,pe.normalmap,pe.displacementmap,{opacity:{value:1}}]),vertexShader:je.meshnormal_vert,fragmentShader:je.meshnormal_frag},sprite:{uniforms:Gt([pe.sprite,pe.fog]),vertexShader:je.sprite_vert,fragmentShader:je.sprite_frag},background:{uniforms:{uvTransform:{value:new $e},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:je.background_vert,fragmentShader:je.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new $e}},vertexShader:je.backgroundCube_vert,fragmentShader:je.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:je.cube_vert,fragmentShader:je.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:je.equirect_vert,fragmentShader:je.equirect_frag},distanceRGBA:{uniforms:Gt([pe.common,pe.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:je.distanceRGBA_vert,fragmentShader:je.distanceRGBA_frag},shadow:{uniforms:Gt([pe.lights,pe.fog,{color:{value:new Qe(0)},opacity:{value:1}}]),vertexShader:je.shadow_vert,fragmentShader:je.shadow_frag}};Zt.physical={uniforms:Gt([Zt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new $e},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new $e},clearcoatNormalScale:{value:new ze(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new $e},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new $e},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new $e},sheen:{value:0},sheenColor:{value:new Qe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new $e},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new $e},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new $e},transmissionSamplerSize:{value:new ze},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new $e},attenuationDistance:{value:0},attenuationColor:{value:new Qe(0)},specularColor:{value:new Qe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new $e},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new $e},anisotropyVector:{value:new ze},anisotropyMap:{value:null},anisotropyMapTransform:{value:new $e}}]),vertexShader:je.meshphysical_vert,fragmentShader:je.meshphysical_frag};const ks={r:0,b:0,g:0},Si=new Kn,xv=new ht;function Mv(n,e,t,i,r,s,a){const o=new Qe(0);let l=s===!0?0:1,c,u,d=null,h=0,p=null;function g(_){let y=_.isScene===!0?_.background:null;return y&&y.isTexture&&(y=(_.backgroundBlurriness>0?t:e).get(y)),y}function v(_){let y=!1;const A=g(_);A===null?f(o,l):A&&A.isColor&&(f(A,1),y=!0);const S=n.xr.getEnvironmentBlendMode();S==="additive"?i.buffers.color.setClear(0,0,0,1,a):S==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,a),(n.autoClear||y)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function m(_,y){const A=g(y);A&&(A.isCubeTexture||A.mapping===fa)?(u===void 0&&(u=new It(new as(1,1,1),new an({name:"BackgroundCubeMaterial",uniforms:Mr(Zt.backgroundCube.uniforms),vertexShader:Zt.backgroundCube.vertexShader,fragmentShader:Zt.backgroundCube.fragmentShader,side:Kt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(S,w,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(u)),Si.copy(y.backgroundRotation),Si.x*=-1,Si.y*=-1,Si.z*=-1,A.isCubeTexture&&A.isRenderTargetTexture===!1&&(Si.y*=-1,Si.z*=-1),u.material.uniforms.envMap.value=A,u.material.uniforms.flipEnvMap.value=A.isCubeTexture&&A.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=y.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(xv.makeRotationFromEuler(Si)),u.material.toneMapped=tt.getTransfer(A.colorSpace)!==st,(d!==A||h!==A.version||p!==n.toneMapping)&&(u.material.needsUpdate=!0,d=A,h=A.version,p=n.toneMapping),u.layers.enableAll(),_.unshift(u,u.geometry,u.material,0,0,null)):A&&A.isTexture&&(c===void 0&&(c=new It(new os(2,2),new an({name:"BackgroundMaterial",uniforms:Mr(Zt.background.uniforms),vertexShader:Zt.background.vertexShader,fragmentShader:Zt.background.fragmentShader,side:fi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=A,c.material.uniforms.backgroundIntensity.value=y.backgroundIntensity,c.material.toneMapped=tt.getTransfer(A.colorSpace)!==st,A.matrixAutoUpdate===!0&&A.updateMatrix(),c.material.uniforms.uvTransform.value.copy(A.matrix),(d!==A||h!==A.version||p!==n.toneMapping)&&(c.material.needsUpdate=!0,d=A,h=A.version,p=n.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function f(_,y){_.getRGB(ks,bd(n)),i.buffers.color.setClear(ks.r,ks.g,ks.b,y,a)}function E(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(_,y=1){o.set(_),l=y,f(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,f(o,l)},render:v,addToRenderList:m,dispose:E}}function Sv(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},r=h(null);let s=r,a=!1;function o(x,I,L,C,U){let F=!1;const z=d(C,L,I);s!==z&&(s=z,c(s.object)),F=p(x,C,L,U),F&&g(x,C,L,U),U!==null&&e.update(U,n.ELEMENT_ARRAY_BUFFER),(F||a)&&(a=!1,y(x,I,L,C),U!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(U).buffer))}function l(){return n.createVertexArray()}function c(x){return n.bindVertexArray(x)}function u(x){return n.deleteVertexArray(x)}function d(x,I,L){const C=L.wireframe===!0;let U=i[x.id];U===void 0&&(U={},i[x.id]=U);let F=U[I.id];F===void 0&&(F={},U[I.id]=F);let z=F[C];return z===void 0&&(z=h(l()),F[C]=z),z}function h(x){const I=[],L=[],C=[];for(let U=0;U<t;U++)I[U]=0,L[U]=0,C[U]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:I,enabledAttributes:L,attributeDivisors:C,object:x,attributes:{},index:null}}function p(x,I,L,C){const U=s.attributes,F=I.attributes;let z=0;const X=L.getAttributes();for(const G in X)if(X[G].location>=0){const ne=U[G];let se=F[G];if(se===void 0&&(G==="instanceMatrix"&&x.instanceMatrix&&(se=x.instanceMatrix),G==="instanceColor"&&x.instanceColor&&(se=x.instanceColor)),ne===void 0||ne.attribute!==se||se&&ne.data!==se.data)return!0;z++}return s.attributesNum!==z||s.index!==C}function g(x,I,L,C){const U={},F=I.attributes;let z=0;const X=L.getAttributes();for(const G in X)if(X[G].location>=0){let ne=F[G];ne===void 0&&(G==="instanceMatrix"&&x.instanceMatrix&&(ne=x.instanceMatrix),G==="instanceColor"&&x.instanceColor&&(ne=x.instanceColor));const se={};se.attribute=ne,ne&&ne.data&&(se.data=ne.data),U[G]=se,z++}s.attributes=U,s.attributesNum=z,s.index=C}function v(){const x=s.newAttributes;for(let I=0,L=x.length;I<L;I++)x[I]=0}function m(x){f(x,0)}function f(x,I){const L=s.newAttributes,C=s.enabledAttributes,U=s.attributeDivisors;L[x]=1,C[x]===0&&(n.enableVertexAttribArray(x),C[x]=1),U[x]!==I&&(n.vertexAttribDivisor(x,I),U[x]=I)}function E(){const x=s.newAttributes,I=s.enabledAttributes;for(let L=0,C=I.length;L<C;L++)I[L]!==x[L]&&(n.disableVertexAttribArray(L),I[L]=0)}function _(x,I,L,C,U,F,z){z===!0?n.vertexAttribIPointer(x,I,L,U,F):n.vertexAttribPointer(x,I,L,C,U,F)}function y(x,I,L,C){v();const U=C.attributes,F=L.getAttributes(),z=I.defaultAttributeValues;for(const X in F){const G=F[X];if(G.location>=0){let $=U[X];if($===void 0&&(X==="instanceMatrix"&&x.instanceMatrix&&($=x.instanceMatrix),X==="instanceColor"&&x.instanceColor&&($=x.instanceColor)),$!==void 0){const ne=$.normalized,se=$.itemSize,Ee=e.get($);if(Ee===void 0)continue;const Ne=Ee.buffer,ve=Ee.type,Re=Ee.bytesPerElement,j=ve===n.INT||ve===n.UNSIGNED_INT||$.gpuType===Il;if($.isInterleavedBufferAttribute){const Q=$.data,_e=Q.stride,de=$.offset;if(Q.isInstancedInterleavedBuffer){for(let k=0;k<G.locationSize;k++)f(G.location+k,Q.meshPerAttribute);x.isInstancedMesh!==!0&&C._maxInstanceCount===void 0&&(C._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let k=0;k<G.locationSize;k++)m(G.location+k);n.bindBuffer(n.ARRAY_BUFFER,Ne);for(let k=0;k<G.locationSize;k++)_(G.location+k,se/G.locationSize,ve,ne,_e*Re,(de+se/G.locationSize*k)*Re,j)}else{if($.isInstancedBufferAttribute){for(let Q=0;Q<G.locationSize;Q++)f(G.location+Q,$.meshPerAttribute);x.isInstancedMesh!==!0&&C._maxInstanceCount===void 0&&(C._maxInstanceCount=$.meshPerAttribute*$.count)}else for(let Q=0;Q<G.locationSize;Q++)m(G.location+Q);n.bindBuffer(n.ARRAY_BUFFER,Ne);for(let Q=0;Q<G.locationSize;Q++)_(G.location+Q,se/G.locationSize,ve,ne,se*Re,se/G.locationSize*Q*Re,j)}}else if(z!==void 0){const ne=z[X];if(ne!==void 0)switch(ne.length){case 2:n.vertexAttrib2fv(G.location,ne);break;case 3:n.vertexAttrib3fv(G.location,ne);break;case 4:n.vertexAttrib4fv(G.location,ne);break;default:n.vertexAttrib1fv(G.location,ne)}}}}E()}function A(){R();for(const x in i){const I=i[x];for(const L in I){const C=I[L];for(const U in C)u(C[U].object),delete C[U];delete I[L]}delete i[x]}}function S(x){if(i[x.id]===void 0)return;const I=i[x.id];for(const L in I){const C=I[L];for(const U in C)u(C[U].object),delete C[U];delete I[L]}delete i[x.id]}function w(x){for(const I in i){const L=i[I];if(L[x.id]===void 0)continue;const C=L[x.id];for(const U in C)u(C[U].object),delete C[U];delete L[x.id]}}function R(){M(),a=!0,s!==r&&(s=r,c(s.object))}function M(){r.geometry=null,r.program=null,r.wireframe=!1}return{setup:o,reset:R,resetDefaultState:M,dispose:A,releaseStatesOfGeometry:S,releaseStatesOfProgram:w,initAttributes:v,enableAttribute:m,disableUnusedAttributes:E}}function bv(n,e,t){let i;function r(c){i=c}function s(c,u){n.drawArrays(i,c,u),t.update(u,i,1)}function a(c,u,d){d!==0&&(n.drawArraysInstanced(i,c,u,d),t.update(u,i,d))}function o(c,u,d){if(d===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,u,0,d);let p=0;for(let g=0;g<d;g++)p+=u[g];t.update(p,i,1)}function l(c,u,d,h){if(d===0)return;const p=e.get("WEBGL_multi_draw");if(p===null)for(let g=0;g<c.length;g++)a(c[g],u[g],h[g]);else{p.multiDrawArraysInstancedWEBGL(i,c,0,u,0,h,0,d);let g=0;for(let v=0;v<d;v++)g+=u[v]*h[v];t.update(g,i,1)}}this.setMode=r,this.render=s,this.renderInstances=a,this.renderMultiDraw=o,this.renderMultiDrawInstances=l}function Ev(n,e,t,i){let r;function s(){if(r!==void 0)return r;if(e.has("EXT_texture_filter_anisotropic")===!0){const w=e.get("EXT_texture_filter_anisotropic");r=n.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(w){return!(w!==Sn&&i.convert(w)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(w){const R=w===ss&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(w!==Zn&&i.convert(w)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==qn&&!R)}function l(w){if(w==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(console.warn("THREE.WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const d=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),p=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),v=n.getParameter(n.MAX_TEXTURE_SIZE),m=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),f=n.getParameter(n.MAX_VERTEX_ATTRIBS),E=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),_=n.getParameter(n.MAX_VARYING_VECTORS),y=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),A=g>0,S=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:s,getMaxPrecision:l,textureFormatReadable:a,textureTypeReadable:o,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:h,maxTextures:p,maxVertexTextures:g,maxTextureSize:v,maxCubemapSize:m,maxAttributes:f,maxVertexUniforms:E,maxVaryings:_,maxFragmentUniforms:y,vertexTextures:A,maxSamples:S}}function wv(n){const e=this;let t=null,i=0,r=!1,s=!1;const a=new si,o=new $e,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,h){const p=d.length!==0||h||i!==0||r;return r=h,i=d.length,p},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,h){t=u(d,h,0)},this.setState=function(d,h,p){const g=d.clippingPlanes,v=d.clipIntersection,m=d.clipShadows,f=n.get(d);if(!r||g===null||g.length===0||s&&!m)s?u(null):c();else{const E=s?0:i,_=E*4;let y=f.clippingState||null;l.value=y,y=u(g,h,_,p);for(let A=0;A!==_;++A)y[A]=t[A];f.clippingState=y,this.numIntersection=v?this.numPlanes:0,this.numPlanes+=E}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(d,h,p,g){const v=d!==null?d.length:0;let m=null;if(v!==0){if(m=l.value,g!==!0||m===null){const f=p+v*4,E=h.matrixWorldInverse;o.getNormalMatrix(E),(m===null||m.length<f)&&(m=new Float32Array(f));for(let _=0,y=p;_!==v;++_,y+=4)a.copy(d[_]).applyMatrix4(E,o),a.normal.toArray(m,y),m[y+3]=a.constant}l.value=m,l.needsUpdate=!0}return e.numPlanes=v,e.numIntersection=0,m}}function Tv(n){let e=new WeakMap;function t(a,o){return o===Co?a.mapping=_r:o===Po&&(a.mapping=yr),a}function i(a){if(a&&a.isTexture){const o=a.mapping;if(o===Co||o===Po)if(e.has(a)){const l=e.get(a).texture;return t(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new Qf(l.height);return c.fromEquirectangularTexture(n,a),e.set(a,c),a.addEventListener("dispose",r),t(c.texture,a.mapping)}else return null}}return a}function r(a){const o=a.target;o.removeEventListener("dispose",r);const l=e.get(o);l!==void 0&&(e.delete(o),l.dispose())}function s(){e=new WeakMap}return{get:i,dispose:s}}const hr=4,ou=[.125,.215,.35,.446,.526,.582],Ti=20,io=new Bd,lu=new Qe;let ro=null,so=0,ao=0,oo=!1;const Ei=(1+Math.sqrt(5))/2,cr=1/Ei,cu=[new O(-Ei,cr,0),new O(Ei,cr,0),new O(-cr,0,Ei),new O(cr,0,Ei),new O(0,Ei,-cr),new O(0,Ei,cr),new O(-1,1,-1),new O(1,1,-1),new O(-1,1,1),new O(1,1,1)],Av=new O;class uu{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,r=100,s={}){const{size:a=256,position:o=Av}=s;ro=this._renderer.getRenderTarget(),so=this._renderer.getActiveCubeFace(),ao=this._renderer.getActiveMipmapLevel(),oo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,r,l,o),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=fu(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=hu(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(ro,so,ao),this._renderer.xr.enabled=oo,e.scissorTest=!1,Hs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===_r||e.mapping===yr?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),ro=this._renderer.getRenderTarget(),so=this._renderer.getActiveCubeFace(),ao=this._renderer.getActiveMipmapLevel(),oo=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Wt,minFilter:Wt,generateMipmaps:!1,type:ss,format:Sn,colorSpace:xr,depthBuffer:!1},r=du(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=du(e,t,i);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Rv(s)),this._blurMaterial=Cv(s,e,t)}return r}_compileMaterial(e){const t=new It(this._lodPlanes[0],e);this._renderer.compile(t,io)}_sceneToCubeUV(e,t,i,r,s){const l=new yn(90,1,t,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,h=d.autoClear,p=d.toneMapping;d.getClearColor(lu),d.toneMapping=li,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(r),d.clearDepth(),d.setRenderTarget(null));const v=new ma({name:"PMREM.Background",side:Kt,depthWrite:!1,depthTest:!1}),m=new It(new as,v);let f=!1;const E=e.background;E?E.isColor&&(v.color.copy(E),e.background=null,f=!0):(v.color.copy(lu),f=!0);for(let _=0;_<6;_++){const y=_%3;y===0?(l.up.set(0,c[_],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x+u[_],s.y,s.z)):y===1?(l.up.set(0,0,c[_]),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y+u[_],s.z)):(l.up.set(0,c[_],0),l.position.set(s.x,s.y,s.z),l.lookAt(s.x,s.y,s.z+u[_]));const A=this._cubeSize;Hs(r,y*A,_>2?A:0,A,A),d.setRenderTarget(r),f&&d.render(m,l),d.render(e,l)}m.geometry.dispose(),m.material.dispose(),d.toneMapping=p,d.autoClear=h,e.background=E}_textureToCubeUV(e,t){const i=this._renderer,r=e.mapping===_r||e.mapping===yr;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=fu()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=hu());const s=r?this._cubemapMaterial:this._equirectMaterial,a=new It(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=e;const l=this._cubeSize;Hs(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(a,io)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const r=this._lodPlanes.length;for(let s=1;s<r;s++){const a=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=cu[(r-s-1)%cu.length];this._blur(e,s-1,s,a,o)}t.autoClear=i}_blur(e,t,i,r,s){const a=this._pingPongRenderTarget;this._halfBlur(e,a,t,i,r,"latitudinal",s),this._halfBlur(a,e,i,i,r,"longitudinal",s)}_halfBlur(e,t,i,r,s,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const u=3,d=new It(this._lodPlanes[r],c),h=c.uniforms,p=this._sizeLods[i]-1,g=isFinite(s)?Math.PI/(2*p):2*Math.PI/(2*Ti-1),v=s/g,m=isFinite(s)?1+Math.floor(u*v):Ti;m>Ti&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Ti}`);const f=[];let E=0;for(let w=0;w<Ti;++w){const R=w/v,M=Math.exp(-R*R/2);f.push(M),w===0?E+=M:w<m&&(E+=2*M)}for(let w=0;w<f.length;w++)f[w]=f[w]/E;h.envMap.value=e.texture,h.samples.value=m,h.weights.value=f,h.latitudinal.value=a==="latitudinal",o&&(h.poleAxis.value=o);const{_lodMax:_}=this;h.dTheta.value=g,h.mipInt.value=_-i;const y=this._sizeLods[r],A=3*y*(r>_-hr?r-_+hr:0),S=4*(this._cubeSize-y);Hs(t,A,S,3*y,2*y),l.setRenderTarget(t),l.render(d,io)}}function Rv(n){const e=[],t=[],i=[];let r=n;const s=n-hr+1+ou.length;for(let a=0;a<s;a++){const o=Math.pow(2,r);t.push(o);let l=1/o;a>n-hr?l=ou[a-n+hr-1]:a===0&&(l=0),i.push(l);const c=1/(o-2),u=-c,d=1+c,h=[u,u,d,u,d,d,u,u,d,d,u,d],p=6,g=6,v=3,m=2,f=1,E=new Float32Array(v*g*p),_=new Float32Array(m*g*p),y=new Float32Array(f*g*p);for(let S=0;S<p;S++){const w=S%3*2/3-1,R=S>2?0:-1,M=[w,R,0,w+2/3,R,0,w+2/3,R+1,0,w,R,0,w+2/3,R+1,0,w,R+1,0];E.set(M,v*g*S),_.set(h,m*g*S);const x=[S,S,S,S,S,S];y.set(x,f*g*S)}const A=new zt;A.setAttribute("position",new sn(E,v)),A.setAttribute("uv",new sn(_,m)),A.setAttribute("faceIndex",new sn(y,f)),e.push(A),r>hr&&r--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function du(n,e,t){const i=new Ui(n,e,t);return i.texture.mapping=fa,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Hs(n,e,t,i,r){n.viewport.set(e,t,i,r),n.scissor.set(e,t,i,r)}function Cv(n,e,t){const i=new Float32Array(Ti),r=new O(0,1,0);return new an({name:"SphericalGaussianBlur",defines:{n:Ti,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:r}},vertexShader:Wl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:oi,depthTest:!1,depthWrite:!1})}function hu(){return new an({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Wl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:oi,depthTest:!1,depthWrite:!1})}function fu(){return new an({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Wl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:oi,depthTest:!1,depthWrite:!1})}function Wl(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Pv(n){let e=new WeakMap,t=null;function i(o){if(o&&o.isTexture){const l=o.mapping,c=l===Co||l===Po,u=l===_r||l===yr;if(c||u){let d=e.get(o);const h=d!==void 0?d.texture.pmremVersion:0;if(o.isRenderTargetTexture&&o.pmremVersion!==h)return t===null&&(t=new uu(n)),d=c?t.fromEquirectangular(o,d):t.fromCubemap(o,d),d.texture.pmremVersion=o.pmremVersion,e.set(o,d),d.texture;if(d!==void 0)return d.texture;{const p=o.image;return c&&p&&p.height>0||u&&p&&r(p)?(t===null&&(t=new uu(n)),d=c?t.fromEquirectangular(o):t.fromCubemap(o),d.texture.pmremVersion=o.pmremVersion,e.set(o,d),o.addEventListener("dispose",s),d.texture):null}}}return o}function r(o){let l=0;const c=6;for(let u=0;u<c;u++)o[u]!==void 0&&l++;return l===c}function s(o){const l=o.target;l.removeEventListener("dispose",s);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function a(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:a}}function Lv(n){const e={};function t(i){if(e[i]!==void 0)return e[i];let r;switch(i){case"WEBGL_depth_texture":r=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":r=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":r=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":r=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:r=n.getExtension(i)}return e[i]=r,r}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const r=t(i);return r===null&&Qr("THREE.WebGLRenderer: "+i+" extension not supported."),r}}}function Iv(n,e,t,i){const r={},s=new WeakMap;function a(d){const h=d.target;h.index!==null&&e.remove(h.index);for(const g in h.attributes)e.remove(h.attributes[g]);h.removeEventListener("dispose",a),delete r[h.id];const p=s.get(h);p&&(e.remove(p),s.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function o(d,h){return r[h.id]===!0||(h.addEventListener("dispose",a),r[h.id]=!0,t.memory.geometries++),h}function l(d){const h=d.attributes;for(const p in h)e.update(h[p],n.ARRAY_BUFFER)}function c(d){const h=[],p=d.index,g=d.attributes.position;let v=0;if(p!==null){const E=p.array;v=p.version;for(let _=0,y=E.length;_<y;_+=3){const A=E[_+0],S=E[_+1],w=E[_+2];h.push(A,S,S,w,w,A)}}else if(g!==void 0){const E=g.array;v=g.version;for(let _=0,y=E.length/3-1;_<y;_+=3){const A=_+0,S=_+1,w=_+2;h.push(A,S,S,w,w,A)}}else return;const m=new(_d(h)?Sd:Md)(h,1);m.version=v;const f=s.get(d);f&&e.remove(f),s.set(d,m)}function u(d){const h=s.get(d);if(h){const p=d.index;p!==null&&h.version<p.version&&c(d)}else c(d);return s.get(d)}return{get:o,update:l,getWireframeAttribute:u}}function Dv(n,e,t){let i;function r(h){i=h}let s,a;function o(h){s=h.type,a=h.bytesPerElement}function l(h,p){n.drawElements(i,p,s,h*a),t.update(p,i,1)}function c(h,p,g){g!==0&&(n.drawElementsInstanced(i,p,s,h*a,g),t.update(p,i,g))}function u(h,p,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,p,0,s,h,0,g);let m=0;for(let f=0;f<g;f++)m+=p[f];t.update(m,i,1)}function d(h,p,g,v){if(g===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let f=0;f<h.length;f++)c(h[f]/a,p[f],v[f]);else{m.multiDrawElementsInstancedWEBGL(i,p,0,s,h,0,v,0,g);let f=0;for(let E=0;E<g;E++)f+=p[E]*v[E];t.update(f,i,1)}}this.setMode=r,this.setIndex=o,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=d}function Uv(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(s,a,o){switch(t.calls++,a){case n.TRIANGLES:t.triangles+=o*(s/3);break;case n.LINES:t.lines+=o*(s/2);break;case n.LINE_STRIP:t.lines+=o*(s-1);break;case n.LINE_LOOP:t.lines+=o*s;break;case n.POINTS:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function r(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:r,update:i}}function Nv(n,e,t){const i=new WeakMap,r=new dt;function s(a,o,l){const c=a.morphTargetInfluences,u=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=u!==void 0?u.length:0;let h=i.get(o);if(h===void 0||h.count!==d){let M=function(){w.dispose(),i.delete(o),o.removeEventListener("dispose",M)};h!==void 0&&h.texture.dispose();const p=o.morphAttributes.position!==void 0,g=o.morphAttributes.normal!==void 0,v=o.morphAttributes.color!==void 0,m=o.morphAttributes.position||[],f=o.morphAttributes.normal||[],E=o.morphAttributes.color||[];let _=0;p===!0&&(_=1),g===!0&&(_=2),v===!0&&(_=3);let y=o.attributes.position.count*_,A=1;y>e.maxTextureSize&&(A=Math.ceil(y/e.maxTextureSize),y=e.maxTextureSize);const S=new Float32Array(y*A*4*d),w=new yd(S,y,A,d);w.type=qn,w.needsUpdate=!0;const R=_*4;for(let x=0;x<d;x++){const I=m[x],L=f[x],C=E[x],U=y*A*4*x;for(let F=0;F<I.count;F++){const z=F*R;p===!0&&(r.fromBufferAttribute(I,F),S[U+z+0]=r.x,S[U+z+1]=r.y,S[U+z+2]=r.z,S[U+z+3]=0),g===!0&&(r.fromBufferAttribute(L,F),S[U+z+4]=r.x,S[U+z+5]=r.y,S[U+z+6]=r.z,S[U+z+7]=0),v===!0&&(r.fromBufferAttribute(C,F),S[U+z+8]=r.x,S[U+z+9]=r.y,S[U+z+10]=r.z,S[U+z+11]=C.itemSize===4?r.w:1)}}h={count:d,texture:w,size:new ze(y,A)},i.set(o,h),o.addEventListener("dispose",M)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",a.morphTexture,t);else{let p=0;for(let v=0;v<c.length;v++)p+=c[v];const g=o.morphTargetsRelative?1:1-p;l.getUniforms().setValue(n,"morphTargetBaseInfluence",g),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",h.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",h.size)}return{update:s}}function Fv(n,e,t,i){let r=new WeakMap;function s(l){const c=i.render.frame,u=l.geometry,d=e.get(l,u);if(r.get(d)!==c&&(e.update(d),r.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),r.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),r.set(l,c))),l.isSkinnedMesh){const h=l.skeleton;r.get(h)!==c&&(h.update(),r.set(h,c))}return d}function a(){r=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:s,dispose:a}}const kd=new Bt,pu=new Ld(1,1),Hd=new yd,Vd=new Of,Gd=new wd,mu=[],gu=[],vu=new Float32Array(16),_u=new Float32Array(9),yu=new Float32Array(4);function Ar(n,e,t){const i=n[0];if(i<=0||i>0)return n;const r=e*t;let s=mu[r];if(s===void 0&&(s=new Float32Array(r),mu[r]=s),e!==0){i.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,n[a].toArray(s,o)}return s}function Rt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Ct(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function _a(n,e){let t=gu[e];t===void 0&&(t=new Int32Array(e),gu[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function Ov(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Bv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;n.uniform2fv(this.addr,e),Ct(t,e)}}function zv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Rt(t,e))return;n.uniform3fv(this.addr,e),Ct(t,e)}}function kv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;n.uniform4fv(this.addr,e),Ct(t,e)}}function Hv(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Rt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Ct(t,e)}else{if(Rt(t,i))return;yu.set(i),n.uniformMatrix2fv(this.addr,!1,yu),Ct(t,i)}}function Vv(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Rt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Ct(t,e)}else{if(Rt(t,i))return;_u.set(i),n.uniformMatrix3fv(this.addr,!1,_u),Ct(t,i)}}function Gv(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(Rt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Ct(t,e)}else{if(Rt(t,i))return;vu.set(i),n.uniformMatrix4fv(this.addr,!1,vu),Ct(t,i)}}function Wv(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function Xv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;n.uniform2iv(this.addr,e),Ct(t,e)}}function qv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;n.uniform3iv(this.addr,e),Ct(t,e)}}function Yv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;n.uniform4iv(this.addr,e),Ct(t,e)}}function $v(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function jv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Rt(t,e))return;n.uniform2uiv(this.addr,e),Ct(t,e)}}function Zv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Rt(t,e))return;n.uniform3uiv(this.addr,e),Ct(t,e)}}function Kv(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Rt(t,e))return;n.uniform4uiv(this.addr,e),Ct(t,e)}}function Jv(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r);let s;this.type===n.SAMPLER_2D_SHADOW?(pu.compareFunction=vd,s=pu):s=kd,t.setTexture2D(e||s,r)}function Qv(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture3D(e||Vd,r)}function e_(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTextureCube(e||Gd,r)}function t_(n,e,t){const i=this.cache,r=t.allocateTextureUnit();i[0]!==r&&(n.uniform1i(this.addr,r),i[0]=r),t.setTexture2DArray(e||Hd,r)}function n_(n){switch(n){case 5126:return Ov;case 35664:return Bv;case 35665:return zv;case 35666:return kv;case 35674:return Hv;case 35675:return Vv;case 35676:return Gv;case 5124:case 35670:return Wv;case 35667:case 35671:return Xv;case 35668:case 35672:return qv;case 35669:case 35673:return Yv;case 5125:return $v;case 36294:return jv;case 36295:return Zv;case 36296:return Kv;case 35678:case 36198:case 36298:case 36306:case 35682:return Jv;case 35679:case 36299:case 36307:return Qv;case 35680:case 36300:case 36308:case 36293:return e_;case 36289:case 36303:case 36311:case 36292:return t_}}function i_(n,e){n.uniform1fv(this.addr,e)}function r_(n,e){const t=Ar(e,this.size,2);n.uniform2fv(this.addr,t)}function s_(n,e){const t=Ar(e,this.size,3);n.uniform3fv(this.addr,t)}function a_(n,e){const t=Ar(e,this.size,4);n.uniform4fv(this.addr,t)}function o_(n,e){const t=Ar(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function l_(n,e){const t=Ar(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function c_(n,e){const t=Ar(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function u_(n,e){n.uniform1iv(this.addr,e)}function d_(n,e){n.uniform2iv(this.addr,e)}function h_(n,e){n.uniform3iv(this.addr,e)}function f_(n,e){n.uniform4iv(this.addr,e)}function p_(n,e){n.uniform1uiv(this.addr,e)}function m_(n,e){n.uniform2uiv(this.addr,e)}function g_(n,e){n.uniform3uiv(this.addr,e)}function v_(n,e){n.uniform4uiv(this.addr,e)}function __(n,e,t){const i=this.cache,r=e.length,s=_a(t,r);Rt(i,s)||(n.uniform1iv(this.addr,s),Ct(i,s));for(let a=0;a!==r;++a)t.setTexture2D(e[a]||kd,s[a])}function y_(n,e,t){const i=this.cache,r=e.length,s=_a(t,r);Rt(i,s)||(n.uniform1iv(this.addr,s),Ct(i,s));for(let a=0;a!==r;++a)t.setTexture3D(e[a]||Vd,s[a])}function x_(n,e,t){const i=this.cache,r=e.length,s=_a(t,r);Rt(i,s)||(n.uniform1iv(this.addr,s),Ct(i,s));for(let a=0;a!==r;++a)t.setTextureCube(e[a]||Gd,s[a])}function M_(n,e,t){const i=this.cache,r=e.length,s=_a(t,r);Rt(i,s)||(n.uniform1iv(this.addr,s),Ct(i,s));for(let a=0;a!==r;++a)t.setTexture2DArray(e[a]||Hd,s[a])}function S_(n){switch(n){case 5126:return i_;case 35664:return r_;case 35665:return s_;case 35666:return a_;case 35674:return o_;case 35675:return l_;case 35676:return c_;case 5124:case 35670:return u_;case 35667:case 35671:return d_;case 35668:case 35672:return h_;case 35669:case 35673:return f_;case 5125:return p_;case 36294:return m_;case 36295:return g_;case 36296:return v_;case 35678:case 36198:case 36298:case 36306:case 35682:return __;case 35679:case 36299:case 36307:return y_;case 35680:case 36300:case 36308:case 36293:return x_;case 36289:case 36303:case 36311:case 36292:return M_}}class b_{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=n_(t.type)}}class E_{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=S_(t.type)}}class w_{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const r=this.seq;for(let s=0,a=r.length;s!==a;++s){const o=r[s];o.setValue(e,t[o.id],i)}}}const lo=/(\w+)(\])?(\[|\.)?/g;function xu(n,e){n.seq.push(e),n.map[e.id]=e}function T_(n,e,t){const i=n.name,r=i.length;for(lo.lastIndex=0;;){const s=lo.exec(i),a=lo.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===r){xu(t,c===void 0?new b_(o,n,e):new E_(o,n,e));break}else{let d=t.map[o];d===void 0&&(d=new w_(o),xu(t,d)),t=d}}}class Ks{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<i;++r){const s=e.getActiveUniform(t,r),a=e.getUniformLocation(t,s.name);T_(s,a,this)}}setValue(e,t,i,r){const s=this.map[t];s!==void 0&&s.setValue(e,i,r)}setOptional(e,t,i){const r=t[i];r!==void 0&&this.setValue(e,i,r)}static upload(e,t,i,r){for(let s=0,a=t.length;s!==a;++s){const o=t[s],l=i[o.id];l.needsUpdate!==!1&&o.setValue(e,l.value,r)}}static seqWithValue(e,t){const i=[];for(let r=0,s=e.length;r!==s;++r){const a=e[r];a.id in t&&i.push(a)}return i}}function Mu(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const A_=37297;let R_=0;function C_(n,e){const t=n.split(`
`),i=[],r=Math.max(e-6,0),s=Math.min(e+6,t.length);for(let a=r;a<s;a++){const o=a+1;i.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return i.join(`
`)}const Su=new $e;function P_(n){tt._getMatrix(Su,tt.workingColorSpace,n);const e=`mat3( ${Su.elements.map(t=>t.toFixed(4))} )`;switch(tt.getTransfer(n)){case Qs:return[e,"LinearTransferOETF"];case st:return[e,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function bu(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),s=(n.getShaderInfoLog(e)||"").trim();if(i&&s==="")return"";const a=/ERROR: 0:(\d+)/.exec(s);if(a){const o=parseInt(a[1]);return t.toUpperCase()+`

`+s+`

`+C_(n.getShaderSource(e),o)}else return s}function L_(n,e){const t=P_(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function I_(n,e){let t;switch(e){case Yh:t="Linear";break;case $h:t="Reinhard";break;case jh:t="Cineon";break;case Zh:t="ACESFilmic";break;case Jh:t="AgX";break;case Qh:t="Neutral";break;case Kh:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Vs=new O;function D_(){tt.getLuminanceCoefficients(Vs);const n=Vs.x.toFixed(4),e=Vs.y.toFixed(4),t=Vs.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function U_(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Gr).join(`
`)}function N_(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function F_(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let r=0;r<i;r++){const s=n.getActiveAttrib(e,r),a=s.name;let o=1;s.type===n.FLOAT_MAT2&&(o=2),s.type===n.FLOAT_MAT3&&(o=3),s.type===n.FLOAT_MAT4&&(o=4),t[a]={type:s.type,location:n.getAttribLocation(e,a),locationSize:o}}return t}function Gr(n){return n!==""}function Eu(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function wu(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const O_=/^[ \t]*#include +<([\w\d./]+)>/gm;function hl(n){return n.replace(O_,z_)}const B_=new Map;function z_(n,e){let t=je[e];if(t===void 0){const i=B_.get(e);if(i!==void 0)t=je[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return hl(t)}const k_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Tu(n){return n.replace(k_,H_)}function H_(n,e,t,i){let r="";for(let s=parseInt(e);s<parseInt(t);s++)r+=i.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return r}function Au(n){let e=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function V_(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===ad?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===Th?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===Gn&&(e="SHADOWMAP_TYPE_VSM"),e}function G_(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case _r:case yr:e="ENVMAP_TYPE_CUBE";break;case fa:e="ENVMAP_TYPE_CUBE_UV";break}return e}function W_(n){let e="ENVMAP_MODE_REFLECTION";if(n.envMap)switch(n.envMapMode){case yr:e="ENVMAP_MODE_REFRACTION";break}return e}function X_(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case od:e="ENVMAP_BLENDING_MULTIPLY";break;case Xh:e="ENVMAP_BLENDING_MIX";break;case qh:e="ENVMAP_BLENDING_ADD";break}return e}function q_(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function Y_(n,e,t,i){const r=n.getContext(),s=t.defines;let a=t.vertexShader,o=t.fragmentShader;const l=V_(t),c=G_(t),u=W_(t),d=X_(t),h=q_(t),p=U_(t),g=N_(s),v=r.createProgram();let m,f,E=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(m=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Gr).join(`
`),m.length>0&&(m+=`
`),f=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Gr).join(`
`),f.length>0&&(f+=`
`)):(m=[Au(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Gr).join(`
`),f=[Au(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+d:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==li?"#define TONE_MAPPING":"",t.toneMapping!==li?je.tonemapping_pars_fragment:"",t.toneMapping!==li?I_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",je.colorspace_pars_fragment,L_("linearToOutputTexel",t.outputColorSpace),D_(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Gr).join(`
`)),a=hl(a),a=Eu(a,t),a=wu(a,t),o=hl(o),o=Eu(o,t),o=wu(o,t),a=Tu(a),o=Tu(o),t.isRawShaderMaterial!==!0&&(E=`#version 300 es
`,m=[p,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+m,f=["#define varying in",t.glslVersion===Cc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Cc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);const _=E+m+a,y=E+f+o,A=Mu(r,r.VERTEX_SHADER,_),S=Mu(r,r.FRAGMENT_SHADER,y);r.attachShader(v,A),r.attachShader(v,S),t.index0AttributeName!==void 0?r.bindAttribLocation(v,0,t.index0AttributeName):t.morphTargets===!0&&r.bindAttribLocation(v,0,"position"),r.linkProgram(v);function w(I){if(n.debug.checkShaderErrors){const L=r.getProgramInfoLog(v)||"",C=r.getShaderInfoLog(A)||"",U=r.getShaderInfoLog(S)||"",F=L.trim(),z=C.trim(),X=U.trim();let G=!0,$=!0;if(r.getProgramParameter(v,r.LINK_STATUS)===!1)if(G=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(r,v,A,S);else{const ne=bu(r,A,"vertex"),se=bu(r,S,"fragment");console.error("THREE.WebGLProgram: Shader Error "+r.getError()+" - VALIDATE_STATUS "+r.getProgramParameter(v,r.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+F+`
`+ne+`
`+se)}else F!==""?console.warn("THREE.WebGLProgram: Program Info Log:",F):(z===""||X==="")&&($=!1);$&&(I.diagnostics={runnable:G,programLog:F,vertexShader:{log:z,prefix:m},fragmentShader:{log:X,prefix:f}})}r.deleteShader(A),r.deleteShader(S),R=new Ks(r,v),M=F_(r,v)}let R;this.getUniforms=function(){return R===void 0&&w(this),R};let M;this.getAttributes=function(){return M===void 0&&w(this),M};let x=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return x===!1&&(x=r.getProgramParameter(v,A_)),x},this.destroy=function(){i.releaseStatesOfProgram(this),r.deleteProgram(v),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=R_++,this.cacheKey=e,this.usedTimes=1,this.program=v,this.vertexShader=A,this.fragmentShader=S,this}let $_=0;class j_{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,r=this._getShaderStage(t),s=this._getShaderStage(i),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new Z_(e),t.set(e,i)),i}}class Z_{constructor(e){this.id=$_++,this.code=e,this.usedTimes=0}}function K_(n,e,t,i,r,s,a){const o=new kl,l=new j_,c=new Set,u=[],d=r.logarithmicDepthBuffer,h=r.vertexTextures;let p=r.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function v(M){return c.add(M),M===0?"uv":`uv${M}`}function m(M,x,I,L,C){const U=L.fog,F=C.geometry,z=M.isMeshStandardMaterial?L.environment:null,X=(M.isMeshStandardMaterial?t:e).get(M.envMap||z),G=X&&X.mapping===fa?X.image.height:null,$=g[M.type];M.precision!==null&&(p=r.getMaxPrecision(M.precision),p!==M.precision&&console.warn("THREE.WebGLProgram.getParameters:",M.precision,"not supported, using",p,"instead."));const ne=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,se=ne!==void 0?ne.length:0;let Ee=0;F.morphAttributes.position!==void 0&&(Ee=1),F.morphAttributes.normal!==void 0&&(Ee=2),F.morphAttributes.color!==void 0&&(Ee=3);let Ne,ve,Re,j;if($){const nt=Zt[$];Ne=nt.vertexShader,ve=nt.fragmentShader}else Ne=M.vertexShader,ve=M.fragmentShader,l.update(M),Re=l.getVertexShaderID(M),j=l.getFragmentShaderID(M);const Q=n.getRenderTarget(),_e=n.state.buffers.depth.getReversed(),de=C.isInstancedMesh===!0,k=C.isBatchedMesh===!0,ie=!!M.map,we=!!M.matcap,D=!!X,Ve=!!M.aoMap,ae=!!M.lightMap,be=!!M.bumpMap,me=!!M.normalMap,qe=!!M.displacementMap,Se=!!M.emissiveMap,Ce=!!M.metalnessMap,Je=!!M.roughnessMap,ct=M.anisotropy>0,P=M.clearcoat>0,b=M.dispersion>0,W=M.iridescence>0,K=M.sheen>0,re=M.transmission>0,Z=ct&&!!M.anisotropyMap,Ue=P&&!!M.clearcoatMap,he=P&&!!M.clearcoatNormalMap,Pe=P&&!!M.clearcoatRoughnessMap,Ie=W&&!!M.iridescenceMap,le=W&&!!M.iridescenceThicknessMap,ye=K&&!!M.sheenColorMap,He=K&&!!M.sheenRoughnessMap,Fe=!!M.specularMap,xe=!!M.specularColorMap,Ye=!!M.specularIntensityMap,B=re&&!!M.transmissionMap,ue=re&&!!M.thicknessMap,fe=!!M.gradientMap,Ae=!!M.alphaMap,oe=M.alphaTest>0,ee=!!M.alphaHash,De=!!M.extensions;let Xe=li;M.toneMapped&&(Q===null||Q.isXRRenderTarget===!0)&&(Xe=n.toneMapping);const ut={shaderID:$,shaderType:M.type,shaderName:M.name,vertexShader:Ne,fragmentShader:ve,defines:M.defines,customVertexShaderID:Re,customFragmentShaderID:j,isRawShaderMaterial:M.isRawShaderMaterial===!0,glslVersion:M.glslVersion,precision:p,batching:k,batchingColor:k&&C._colorsTexture!==null,instancing:de,instancingColor:de&&C.instanceColor!==null,instancingMorph:de&&C.morphTexture!==null,supportsVertexTextures:h,outputColorSpace:Q===null?n.outputColorSpace:Q.isXRRenderTarget===!0?Q.texture.colorSpace:xr,alphaToCoverage:!!M.alphaToCoverage,map:ie,matcap:we,envMap:D,envMapMode:D&&X.mapping,envMapCubeUVHeight:G,aoMap:Ve,lightMap:ae,bumpMap:be,normalMap:me,displacementMap:h&&qe,emissiveMap:Se,normalMapObjectSpace:me&&M.normalMapType===sf,normalMapTangentSpace:me&&M.normalMapType===rf,metalnessMap:Ce,roughnessMap:Je,anisotropy:ct,anisotropyMap:Z,clearcoat:P,clearcoatMap:Ue,clearcoatNormalMap:he,clearcoatRoughnessMap:Pe,dispersion:b,iridescence:W,iridescenceMap:Ie,iridescenceThicknessMap:le,sheen:K,sheenColorMap:ye,sheenRoughnessMap:He,specularMap:Fe,specularColorMap:xe,specularIntensityMap:Ye,transmission:re,transmissionMap:B,thicknessMap:ue,gradientMap:fe,opaque:M.transparent===!1&&M.blending===fr&&M.alphaToCoverage===!1,alphaMap:Ae,alphaTest:oe,alphaHash:ee,combine:M.combine,mapUv:ie&&v(M.map.channel),aoMapUv:Ve&&v(M.aoMap.channel),lightMapUv:ae&&v(M.lightMap.channel),bumpMapUv:be&&v(M.bumpMap.channel),normalMapUv:me&&v(M.normalMap.channel),displacementMapUv:qe&&v(M.displacementMap.channel),emissiveMapUv:Se&&v(M.emissiveMap.channel),metalnessMapUv:Ce&&v(M.metalnessMap.channel),roughnessMapUv:Je&&v(M.roughnessMap.channel),anisotropyMapUv:Z&&v(M.anisotropyMap.channel),clearcoatMapUv:Ue&&v(M.clearcoatMap.channel),clearcoatNormalMapUv:he&&v(M.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Pe&&v(M.clearcoatRoughnessMap.channel),iridescenceMapUv:Ie&&v(M.iridescenceMap.channel),iridescenceThicknessMapUv:le&&v(M.iridescenceThicknessMap.channel),sheenColorMapUv:ye&&v(M.sheenColorMap.channel),sheenRoughnessMapUv:He&&v(M.sheenRoughnessMap.channel),specularMapUv:Fe&&v(M.specularMap.channel),specularColorMapUv:xe&&v(M.specularColorMap.channel),specularIntensityMapUv:Ye&&v(M.specularIntensityMap.channel),transmissionMapUv:B&&v(M.transmissionMap.channel),thicknessMapUv:ue&&v(M.thicknessMap.channel),alphaMapUv:Ae&&v(M.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(me||ct),vertexColors:M.vertexColors,vertexAlphas:M.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:C.isPoints===!0&&!!F.attributes.uv&&(ie||Ae),fog:!!U,useFog:M.fog===!0,fogExp2:!!U&&U.isFogExp2,flatShading:M.flatShading===!0&&M.wireframe===!1,sizeAttenuation:M.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:_e,skinning:C.isSkinnedMesh===!0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:se,morphTextureStride:Ee,numDirLights:x.directional.length,numPointLights:x.point.length,numSpotLights:x.spot.length,numSpotLightMaps:x.spotLightMap.length,numRectAreaLights:x.rectArea.length,numHemiLights:x.hemi.length,numDirLightShadows:x.directionalShadowMap.length,numPointLightShadows:x.pointShadowMap.length,numSpotLightShadows:x.spotShadowMap.length,numSpotLightShadowsWithMaps:x.numSpotLightShadowsWithMaps,numLightProbes:x.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:M.dithering,shadowMapEnabled:n.shadowMap.enabled&&I.length>0,shadowMapType:n.shadowMap.type,toneMapping:Xe,decodeVideoTexture:ie&&M.map.isVideoTexture===!0&&tt.getTransfer(M.map.colorSpace)===st,decodeVideoTextureEmissive:Se&&M.emissiveMap.isVideoTexture===!0&&tt.getTransfer(M.emissiveMap.colorSpace)===st,premultipliedAlpha:M.premultipliedAlpha,doubleSided:M.side===un,flipSided:M.side===Kt,useDepthPacking:M.depthPacking>=0,depthPacking:M.depthPacking||0,index0AttributeName:M.index0AttributeName,extensionClipCullDistance:De&&M.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(De&&M.extensions.multiDraw===!0||k)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:M.customProgramCacheKey()};return ut.vertexUv1s=c.has(1),ut.vertexUv2s=c.has(2),ut.vertexUv3s=c.has(3),c.clear(),ut}function f(M){const x=[];if(M.shaderID?x.push(M.shaderID):(x.push(M.customVertexShaderID),x.push(M.customFragmentShaderID)),M.defines!==void 0)for(const I in M.defines)x.push(I),x.push(M.defines[I]);return M.isRawShaderMaterial===!1&&(E(x,M),_(x,M),x.push(n.outputColorSpace)),x.push(M.customProgramCacheKey),x.join()}function E(M,x){M.push(x.precision),M.push(x.outputColorSpace),M.push(x.envMapMode),M.push(x.envMapCubeUVHeight),M.push(x.mapUv),M.push(x.alphaMapUv),M.push(x.lightMapUv),M.push(x.aoMapUv),M.push(x.bumpMapUv),M.push(x.normalMapUv),M.push(x.displacementMapUv),M.push(x.emissiveMapUv),M.push(x.metalnessMapUv),M.push(x.roughnessMapUv),M.push(x.anisotropyMapUv),M.push(x.clearcoatMapUv),M.push(x.clearcoatNormalMapUv),M.push(x.clearcoatRoughnessMapUv),M.push(x.iridescenceMapUv),M.push(x.iridescenceThicknessMapUv),M.push(x.sheenColorMapUv),M.push(x.sheenRoughnessMapUv),M.push(x.specularMapUv),M.push(x.specularColorMapUv),M.push(x.specularIntensityMapUv),M.push(x.transmissionMapUv),M.push(x.thicknessMapUv),M.push(x.combine),M.push(x.fogExp2),M.push(x.sizeAttenuation),M.push(x.morphTargetsCount),M.push(x.morphAttributeCount),M.push(x.numDirLights),M.push(x.numPointLights),M.push(x.numSpotLights),M.push(x.numSpotLightMaps),M.push(x.numHemiLights),M.push(x.numRectAreaLights),M.push(x.numDirLightShadows),M.push(x.numPointLightShadows),M.push(x.numSpotLightShadows),M.push(x.numSpotLightShadowsWithMaps),M.push(x.numLightProbes),M.push(x.shadowMapType),M.push(x.toneMapping),M.push(x.numClippingPlanes),M.push(x.numClipIntersection),M.push(x.depthPacking)}function _(M,x){o.disableAll(),x.supportsVertexTextures&&o.enable(0),x.instancing&&o.enable(1),x.instancingColor&&o.enable(2),x.instancingMorph&&o.enable(3),x.matcap&&o.enable(4),x.envMap&&o.enable(5),x.normalMapObjectSpace&&o.enable(6),x.normalMapTangentSpace&&o.enable(7),x.clearcoat&&o.enable(8),x.iridescence&&o.enable(9),x.alphaTest&&o.enable(10),x.vertexColors&&o.enable(11),x.vertexAlphas&&o.enable(12),x.vertexUv1s&&o.enable(13),x.vertexUv2s&&o.enable(14),x.vertexUv3s&&o.enable(15),x.vertexTangents&&o.enable(16),x.anisotropy&&o.enable(17),x.alphaHash&&o.enable(18),x.batching&&o.enable(19),x.dispersion&&o.enable(20),x.batchingColor&&o.enable(21),x.gradientMap&&o.enable(22),M.push(o.mask),o.disableAll(),x.fog&&o.enable(0),x.useFog&&o.enable(1),x.flatShading&&o.enable(2),x.logarithmicDepthBuffer&&o.enable(3),x.reversedDepthBuffer&&o.enable(4),x.skinning&&o.enable(5),x.morphTargets&&o.enable(6),x.morphNormals&&o.enable(7),x.morphColors&&o.enable(8),x.premultipliedAlpha&&o.enable(9),x.shadowMapEnabled&&o.enable(10),x.doubleSided&&o.enable(11),x.flipSided&&o.enable(12),x.useDepthPacking&&o.enable(13),x.dithering&&o.enable(14),x.transmission&&o.enable(15),x.sheen&&o.enable(16),x.opaque&&o.enable(17),x.pointsUvs&&o.enable(18),x.decodeVideoTexture&&o.enable(19),x.decodeVideoTextureEmissive&&o.enable(20),x.alphaToCoverage&&o.enable(21),M.push(o.mask)}function y(M){const x=g[M.type];let I;if(x){const L=Zt[x];I=Hl.clone(L.uniforms)}else I=M.uniforms;return I}function A(M,x){let I;for(let L=0,C=u.length;L<C;L++){const U=u[L];if(U.cacheKey===x){I=U,++I.usedTimes;break}}return I===void 0&&(I=new Y_(n,x,M,s),u.push(I)),I}function S(M){if(--M.usedTimes===0){const x=u.indexOf(M);u[x]=u[u.length-1],u.pop(),M.destroy()}}function w(M){l.remove(M)}function R(){l.dispose()}return{getParameters:m,getProgramCacheKey:f,getUniforms:y,acquireProgram:A,releaseProgram:S,releaseShaderCache:w,programs:u,dispose:R}}function J_(){let n=new WeakMap;function e(a){return n.has(a)}function t(a){let o=n.get(a);return o===void 0&&(o={},n.set(a,o)),o}function i(a){n.delete(a)}function r(a,o,l){n.get(a)[o]=l}function s(){n=new WeakMap}return{has:e,get:t,remove:i,update:r,dispose:s}}function Q_(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function Ru(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Cu(){const n=[];let e=0;const t=[],i=[],r=[];function s(){e=0,t.length=0,i.length=0,r.length=0}function a(d,h,p,g,v,m){let f=n[e];return f===void 0?(f={id:d.id,object:d,geometry:h,material:p,groupOrder:g,renderOrder:d.renderOrder,z:v,group:m},n[e]=f):(f.id=d.id,f.object=d,f.geometry=h,f.material=p,f.groupOrder=g,f.renderOrder=d.renderOrder,f.z=v,f.group=m),e++,f}function o(d,h,p,g,v,m){const f=a(d,h,p,g,v,m);p.transmission>0?i.push(f):p.transparent===!0?r.push(f):t.push(f)}function l(d,h,p,g,v,m){const f=a(d,h,p,g,v,m);p.transmission>0?i.unshift(f):p.transparent===!0?r.unshift(f):t.unshift(f)}function c(d,h){t.length>1&&t.sort(d||Q_),i.length>1&&i.sort(h||Ru),r.length>1&&r.sort(h||Ru)}function u(){for(let d=e,h=n.length;d<h;d++){const p=n[d];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:i,transparent:r,init:s,push:o,unshift:l,finish:u,sort:c}}function e0(){let n=new WeakMap;function e(i,r){const s=n.get(i);let a;return s===void 0?(a=new Cu,n.set(i,[a])):r>=s.length?(a=new Cu,s.push(a)):a=s[r],a}function t(){n=new WeakMap}return{get:e,dispose:t}}function t0(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new O,color:new Qe};break;case"SpotLight":t={position:new O,direction:new O,color:new Qe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new O,color:new Qe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new O,skyColor:new Qe,groundColor:new Qe};break;case"RectAreaLight":t={color:new Qe,position:new O,halfWidth:new O,halfHeight:new O};break}return n[e.id]=t,t}}}function n0(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ze};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ze};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ze,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let i0=0;function r0(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function s0(n){const e=new t0,t=n0(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new O);const r=new O,s=new ht,a=new ht;function o(c){let u=0,d=0,h=0;for(let M=0;M<9;M++)i.probe[M].set(0,0,0);let p=0,g=0,v=0,m=0,f=0,E=0,_=0,y=0,A=0,S=0,w=0;c.sort(r0);for(let M=0,x=c.length;M<x;M++){const I=c[M],L=I.color,C=I.intensity,U=I.distance,F=I.shadow&&I.shadow.map?I.shadow.map.texture:null;if(I.isAmbientLight)u+=L.r*C,d+=L.g*C,h+=L.b*C;else if(I.isLightProbe){for(let z=0;z<9;z++)i.probe[z].addScaledVector(I.sh.coefficients[z],C);w++}else if(I.isDirectionalLight){const z=e.get(I);if(z.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){const X=I.shadow,G=t.get(I);G.shadowIntensity=X.intensity,G.shadowBias=X.bias,G.shadowNormalBias=X.normalBias,G.shadowRadius=X.radius,G.shadowMapSize=X.mapSize,i.directionalShadow[p]=G,i.directionalShadowMap[p]=F,i.directionalShadowMatrix[p]=I.shadow.matrix,E++}i.directional[p]=z,p++}else if(I.isSpotLight){const z=e.get(I);z.position.setFromMatrixPosition(I.matrixWorld),z.color.copy(L).multiplyScalar(C),z.distance=U,z.coneCos=Math.cos(I.angle),z.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),z.decay=I.decay,i.spot[v]=z;const X=I.shadow;if(I.map&&(i.spotLightMap[A]=I.map,A++,X.updateMatrices(I),I.castShadow&&S++),i.spotLightMatrix[v]=X.matrix,I.castShadow){const G=t.get(I);G.shadowIntensity=X.intensity,G.shadowBias=X.bias,G.shadowNormalBias=X.normalBias,G.shadowRadius=X.radius,G.shadowMapSize=X.mapSize,i.spotShadow[v]=G,i.spotShadowMap[v]=F,y++}v++}else if(I.isRectAreaLight){const z=e.get(I);z.color.copy(L).multiplyScalar(C),z.halfWidth.set(I.width*.5,0,0),z.halfHeight.set(0,I.height*.5,0),i.rectArea[m]=z,m++}else if(I.isPointLight){const z=e.get(I);if(z.color.copy(I.color).multiplyScalar(I.intensity),z.distance=I.distance,z.decay=I.decay,I.castShadow){const X=I.shadow,G=t.get(I);G.shadowIntensity=X.intensity,G.shadowBias=X.bias,G.shadowNormalBias=X.normalBias,G.shadowRadius=X.radius,G.shadowMapSize=X.mapSize,G.shadowCameraNear=X.camera.near,G.shadowCameraFar=X.camera.far,i.pointShadow[g]=G,i.pointShadowMap[g]=F,i.pointShadowMatrix[g]=I.shadow.matrix,_++}i.point[g]=z,g++}else if(I.isHemisphereLight){const z=e.get(I);z.skyColor.copy(I.color).multiplyScalar(C),z.groundColor.copy(I.groundColor).multiplyScalar(C),i.hemi[f]=z,f++}}m>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=pe.LTC_FLOAT_1,i.rectAreaLTC2=pe.LTC_FLOAT_2):(i.rectAreaLTC1=pe.LTC_HALF_1,i.rectAreaLTC2=pe.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=d,i.ambient[2]=h;const R=i.hash;(R.directionalLength!==p||R.pointLength!==g||R.spotLength!==v||R.rectAreaLength!==m||R.hemiLength!==f||R.numDirectionalShadows!==E||R.numPointShadows!==_||R.numSpotShadows!==y||R.numSpotMaps!==A||R.numLightProbes!==w)&&(i.directional.length=p,i.spot.length=v,i.rectArea.length=m,i.point.length=g,i.hemi.length=f,i.directionalShadow.length=E,i.directionalShadowMap.length=E,i.pointShadow.length=_,i.pointShadowMap.length=_,i.spotShadow.length=y,i.spotShadowMap.length=y,i.directionalShadowMatrix.length=E,i.pointShadowMatrix.length=_,i.spotLightMatrix.length=y+A-S,i.spotLightMap.length=A,i.numSpotLightShadowsWithMaps=S,i.numLightProbes=w,R.directionalLength=p,R.pointLength=g,R.spotLength=v,R.rectAreaLength=m,R.hemiLength=f,R.numDirectionalShadows=E,R.numPointShadows=_,R.numSpotShadows=y,R.numSpotMaps=A,R.numLightProbes=w,i.version=i0++)}function l(c,u){let d=0,h=0,p=0,g=0,v=0;const m=u.matrixWorldInverse;for(let f=0,E=c.length;f<E;f++){const _=c[f];if(_.isDirectionalLight){const y=i.directional[d];y.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),y.direction.sub(r),y.direction.transformDirection(m),d++}else if(_.isSpotLight){const y=i.spot[p];y.position.setFromMatrixPosition(_.matrixWorld),y.position.applyMatrix4(m),y.direction.setFromMatrixPosition(_.matrixWorld),r.setFromMatrixPosition(_.target.matrixWorld),y.direction.sub(r),y.direction.transformDirection(m),p++}else if(_.isRectAreaLight){const y=i.rectArea[g];y.position.setFromMatrixPosition(_.matrixWorld),y.position.applyMatrix4(m),a.identity(),s.copy(_.matrixWorld),s.premultiply(m),a.extractRotation(s),y.halfWidth.set(_.width*.5,0,0),y.halfHeight.set(0,_.height*.5,0),y.halfWidth.applyMatrix4(a),y.halfHeight.applyMatrix4(a),g++}else if(_.isPointLight){const y=i.point[h];y.position.setFromMatrixPosition(_.matrixWorld),y.position.applyMatrix4(m),h++}else if(_.isHemisphereLight){const y=i.hemi[v];y.direction.setFromMatrixPosition(_.matrixWorld),y.direction.transformDirection(m),v++}}}return{setup:o,setupView:l,state:i}}function Pu(n){const e=new s0(n),t=[],i=[];function r(u){c.camera=u,t.length=0,i.length=0}function s(u){t.push(u)}function a(u){i.push(u)}function o(){e.setup(t)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:r,state:c,setupLights:o,setupLightsView:l,pushLight:s,pushShadow:a}}function a0(n){let e=new WeakMap;function t(r,s=0){const a=e.get(r);let o;return a===void 0?(o=new Pu(n),e.set(r,[o])):s>=a.length?(o=new Pu(n),a.push(o)):o=a[s],o}function i(){e=new WeakMap}return{get:t,dispose:i}}const o0=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,l0=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function c0(n,e,t){let i=new Cd;const r=new ze,s=new ze,a=new dt,o=new Rp({depthPacking:nf}),l=new Cp,c={},u=t.maxTextureSize,d={[fi]:Kt,[Kt]:fi,[un]:un},h=new an({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ze},radius:{value:4}},vertexShader:o0,fragmentShader:l0}),p=h.clone();p.defines.HORIZONTAL_PASS=1;const g=new zt;g.setAttribute("position",new sn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const v=new It(g,h),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=ad;let f=this.type;this.render=function(S,w,R){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||S.length===0)return;const M=n.getRenderTarget(),x=n.getActiveCubeFace(),I=n.getActiveMipmapLevel(),L=n.state;L.setBlending(oi),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);const C=f!==Gn&&this.type===Gn,U=f===Gn&&this.type!==Gn;for(let F=0,z=S.length;F<z;F++){const X=S[F],G=X.shadow;if(G===void 0){console.warn("THREE.WebGLShadowMap:",X,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;r.copy(G.mapSize);const $=G.getFrameExtents();if(r.multiply($),s.copy(G.mapSize),(r.x>u||r.y>u)&&(r.x>u&&(s.x=Math.floor(u/$.x),r.x=s.x*$.x,G.mapSize.x=s.x),r.y>u&&(s.y=Math.floor(u/$.y),r.y=s.y*$.y,G.mapSize.y=s.y)),G.map===null||C===!0||U===!0){const se=this.type!==Gn?{minFilter:En,magFilter:En}:{};G.map!==null&&G.map.dispose(),G.map=new Ui(r.x,r.y,se),G.map.texture.name=X.name+".shadowMap",G.camera.updateProjectionMatrix()}n.setRenderTarget(G.map),n.clear();const ne=G.getViewportCount();for(let se=0;se<ne;se++){const Ee=G.getViewport(se);a.set(s.x*Ee.x,s.y*Ee.y,s.x*Ee.z,s.y*Ee.w),L.viewport(a),G.updateMatrices(X,se),i=G.getFrustum(),y(w,R,G.camera,X,this.type)}G.isPointLightShadow!==!0&&this.type===Gn&&E(G,R),G.needsUpdate=!1}f=this.type,m.needsUpdate=!1,n.setRenderTarget(M,x,I)};function E(S,w){const R=e.update(v);h.defines.VSM_SAMPLES!==S.blurSamples&&(h.defines.VSM_SAMPLES=S.blurSamples,p.defines.VSM_SAMPLES=S.blurSamples,h.needsUpdate=!0,p.needsUpdate=!0),S.mapPass===null&&(S.mapPass=new Ui(r.x,r.y)),h.uniforms.shadow_pass.value=S.map.texture,h.uniforms.resolution.value=S.mapSize,h.uniforms.radius.value=S.radius,n.setRenderTarget(S.mapPass),n.clear(),n.renderBufferDirect(w,null,R,h,v,null),p.uniforms.shadow_pass.value=S.mapPass.texture,p.uniforms.resolution.value=S.mapSize,p.uniforms.radius.value=S.radius,n.setRenderTarget(S.map),n.clear(),n.renderBufferDirect(w,null,R,p,v,null)}function _(S,w,R,M){let x=null;const I=R.isPointLight===!0?S.customDistanceMaterial:S.customDepthMaterial;if(I!==void 0)x=I;else if(x=R.isPointLight===!0?l:o,n.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){const L=x.uuid,C=w.uuid;let U=c[L];U===void 0&&(U={},c[L]=U);let F=U[C];F===void 0&&(F=x.clone(),U[C]=F,w.addEventListener("dispose",A)),x=F}if(x.visible=w.visible,x.wireframe=w.wireframe,M===Gn?x.side=w.shadowSide!==null?w.shadowSide:w.side:x.side=w.shadowSide!==null?w.shadowSide:d[w.side],x.alphaMap=w.alphaMap,x.alphaTest=w.alphaToCoverage===!0?.5:w.alphaTest,x.map=w.map,x.clipShadows=w.clipShadows,x.clippingPlanes=w.clippingPlanes,x.clipIntersection=w.clipIntersection,x.displacementMap=w.displacementMap,x.displacementScale=w.displacementScale,x.displacementBias=w.displacementBias,x.wireframeLinewidth=w.wireframeLinewidth,x.linewidth=w.linewidth,R.isPointLight===!0&&x.isMeshDistanceMaterial===!0){const L=n.properties.get(x);L.light=R}return x}function y(S,w,R,M,x){if(S.visible===!1)return;if(S.layers.test(w.layers)&&(S.isMesh||S.isLine||S.isPoints)&&(S.castShadow||S.receiveShadow&&x===Gn)&&(!S.frustumCulled||i.intersectsObject(S))){S.modelViewMatrix.multiplyMatrices(R.matrixWorldInverse,S.matrixWorld);const C=e.update(S),U=S.material;if(Array.isArray(U)){const F=C.groups;for(let z=0,X=F.length;z<X;z++){const G=F[z],$=U[G.materialIndex];if($&&$.visible){const ne=_(S,$,M,x);S.onBeforeShadow(n,S,w,R,C,ne,G),n.renderBufferDirect(R,null,C,ne,S,G),S.onAfterShadow(n,S,w,R,C,ne,G)}}}else if(U.visible){const F=_(S,U,M,x);S.onBeforeShadow(n,S,w,R,C,F,null),n.renderBufferDirect(R,null,C,F,S,null),S.onAfterShadow(n,S,w,R,C,F,null)}}const L=S.children;for(let C=0,U=L.length;C<U;C++)y(L[C],w,R,M,x)}function A(S){S.target.removeEventListener("dispose",A);for(const R in c){const M=c[R],x=S.target.uuid;x in M&&(M[x].dispose(),delete M[x])}}}const u0={[So]:bo,[Eo]:Ao,[wo]:Ro,[vr]:To,[bo]:So,[Ao]:Eo,[Ro]:wo,[To]:vr};function d0(n,e){function t(){let B=!1;const ue=new dt;let fe=null;const Ae=new dt(0,0,0,0);return{setMask:function(oe){fe!==oe&&!B&&(n.colorMask(oe,oe,oe,oe),fe=oe)},setLocked:function(oe){B=oe},setClear:function(oe,ee,De,Xe,ut){ut===!0&&(oe*=Xe,ee*=Xe,De*=Xe),ue.set(oe,ee,De,Xe),Ae.equals(ue)===!1&&(n.clearColor(oe,ee,De,Xe),Ae.copy(ue))},reset:function(){B=!1,fe=null,Ae.set(-1,0,0,0)}}}function i(){let B=!1,ue=!1,fe=null,Ae=null,oe=null;return{setReversed:function(ee){if(ue!==ee){const De=e.get("EXT_clip_control");ee?De.clipControlEXT(De.LOWER_LEFT_EXT,De.ZERO_TO_ONE_EXT):De.clipControlEXT(De.LOWER_LEFT_EXT,De.NEGATIVE_ONE_TO_ONE_EXT),ue=ee;const Xe=oe;oe=null,this.setClear(Xe)}},getReversed:function(){return ue},setTest:function(ee){ee?Q(n.DEPTH_TEST):_e(n.DEPTH_TEST)},setMask:function(ee){fe!==ee&&!B&&(n.depthMask(ee),fe=ee)},setFunc:function(ee){if(ue&&(ee=u0[ee]),Ae!==ee){switch(ee){case So:n.depthFunc(n.NEVER);break;case bo:n.depthFunc(n.ALWAYS);break;case Eo:n.depthFunc(n.LESS);break;case vr:n.depthFunc(n.LEQUAL);break;case wo:n.depthFunc(n.EQUAL);break;case To:n.depthFunc(n.GEQUAL);break;case Ao:n.depthFunc(n.GREATER);break;case Ro:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Ae=ee}},setLocked:function(ee){B=ee},setClear:function(ee){oe!==ee&&(ue&&(ee=1-ee),n.clearDepth(ee),oe=ee)},reset:function(){B=!1,fe=null,Ae=null,oe=null,ue=!1}}}function r(){let B=!1,ue=null,fe=null,Ae=null,oe=null,ee=null,De=null,Xe=null,ut=null;return{setTest:function(nt){B||(nt?Q(n.STENCIL_TEST):_e(n.STENCIL_TEST))},setMask:function(nt){ue!==nt&&!B&&(n.stencilMask(nt),ue=nt)},setFunc:function(nt,Fn,wn){(fe!==nt||Ae!==Fn||oe!==wn)&&(n.stencilFunc(nt,Fn,wn),fe=nt,Ae=Fn,oe=wn)},setOp:function(nt,Fn,wn){(ee!==nt||De!==Fn||Xe!==wn)&&(n.stencilOp(nt,Fn,wn),ee=nt,De=Fn,Xe=wn)},setLocked:function(nt){B=nt},setClear:function(nt){ut!==nt&&(n.clearStencil(nt),ut=nt)},reset:function(){B=!1,ue=null,fe=null,Ae=null,oe=null,ee=null,De=null,Xe=null,ut=null}}}const s=new t,a=new i,o=new r,l=new WeakMap,c=new WeakMap;let u={},d={},h=new WeakMap,p=[],g=null,v=!1,m=null,f=null,E=null,_=null,y=null,A=null,S=null,w=new Qe(0,0,0),R=0,M=!1,x=null,I=null,L=null,C=null,U=null;const F=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let z=!1,X=0;const G=n.getParameter(n.VERSION);G.indexOf("WebGL")!==-1?(X=parseFloat(/^WebGL (\d)/.exec(G)[1]),z=X>=1):G.indexOf("OpenGL ES")!==-1&&(X=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),z=X>=2);let $=null,ne={};const se=n.getParameter(n.SCISSOR_BOX),Ee=n.getParameter(n.VIEWPORT),Ne=new dt().fromArray(se),ve=new dt().fromArray(Ee);function Re(B,ue,fe,Ae){const oe=new Uint8Array(4),ee=n.createTexture();n.bindTexture(B,ee),n.texParameteri(B,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(B,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let De=0;De<fe;De++)B===n.TEXTURE_3D||B===n.TEXTURE_2D_ARRAY?n.texImage3D(ue,0,n.RGBA,1,1,Ae,0,n.RGBA,n.UNSIGNED_BYTE,oe):n.texImage2D(ue+De,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,oe);return ee}const j={};j[n.TEXTURE_2D]=Re(n.TEXTURE_2D,n.TEXTURE_2D,1),j[n.TEXTURE_CUBE_MAP]=Re(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),j[n.TEXTURE_2D_ARRAY]=Re(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),j[n.TEXTURE_3D]=Re(n.TEXTURE_3D,n.TEXTURE_3D,1,1),s.setClear(0,0,0,1),a.setClear(1),o.setClear(0),Q(n.DEPTH_TEST),a.setFunc(vr),be(!1),me(Ec),Q(n.CULL_FACE),Ve(oi);function Q(B){u[B]!==!0&&(n.enable(B),u[B]=!0)}function _e(B){u[B]!==!1&&(n.disable(B),u[B]=!1)}function de(B,ue){return d[B]!==ue?(n.bindFramebuffer(B,ue),d[B]=ue,B===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=ue),B===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=ue),!0):!1}function k(B,ue){let fe=p,Ae=!1;if(B){fe=h.get(ue),fe===void 0&&(fe=[],h.set(ue,fe));const oe=B.textures;if(fe.length!==oe.length||fe[0]!==n.COLOR_ATTACHMENT0){for(let ee=0,De=oe.length;ee<De;ee++)fe[ee]=n.COLOR_ATTACHMENT0+ee;fe.length=oe.length,Ae=!0}}else fe[0]!==n.BACK&&(fe[0]=n.BACK,Ae=!0);Ae&&n.drawBuffers(fe)}function ie(B){return g!==B?(n.useProgram(B),g=B,!0):!1}const we={[wi]:n.FUNC_ADD,[Rh]:n.FUNC_SUBTRACT,[Ch]:n.FUNC_REVERSE_SUBTRACT};we[Ph]=n.MIN,we[Lh]=n.MAX;const D={[Ih]:n.ZERO,[Dh]:n.ONE,[Uh]:n.SRC_COLOR,[xo]:n.SRC_ALPHA,[kh]:n.SRC_ALPHA_SATURATE,[Bh]:n.DST_COLOR,[Fh]:n.DST_ALPHA,[Nh]:n.ONE_MINUS_SRC_COLOR,[Mo]:n.ONE_MINUS_SRC_ALPHA,[zh]:n.ONE_MINUS_DST_COLOR,[Oh]:n.ONE_MINUS_DST_ALPHA,[Hh]:n.CONSTANT_COLOR,[Vh]:n.ONE_MINUS_CONSTANT_COLOR,[Gh]:n.CONSTANT_ALPHA,[Wh]:n.ONE_MINUS_CONSTANT_ALPHA};function Ve(B,ue,fe,Ae,oe,ee,De,Xe,ut,nt){if(B===oi){v===!0&&(_e(n.BLEND),v=!1);return}if(v===!1&&(Q(n.BLEND),v=!0),B!==Ah){if(B!==m||nt!==M){if((f!==wi||y!==wi)&&(n.blendEquation(n.FUNC_ADD),f=wi,y=wi),nt)switch(B){case fr:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case wc:n.blendFunc(n.ONE,n.ONE);break;case Tc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Ac:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:console.error("THREE.WebGLState: Invalid blending: ",B);break}else switch(B){case fr:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case wc:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Tc:console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Ac:console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:console.error("THREE.WebGLState: Invalid blending: ",B);break}E=null,_=null,A=null,S=null,w.set(0,0,0),R=0,m=B,M=nt}return}oe=oe||ue,ee=ee||fe,De=De||Ae,(ue!==f||oe!==y)&&(n.blendEquationSeparate(we[ue],we[oe]),f=ue,y=oe),(fe!==E||Ae!==_||ee!==A||De!==S)&&(n.blendFuncSeparate(D[fe],D[Ae],D[ee],D[De]),E=fe,_=Ae,A=ee,S=De),(Xe.equals(w)===!1||ut!==R)&&(n.blendColor(Xe.r,Xe.g,Xe.b,ut),w.copy(Xe),R=ut),m=B,M=!1}function ae(B,ue){B.side===un?_e(n.CULL_FACE):Q(n.CULL_FACE);let fe=B.side===Kt;ue&&(fe=!fe),be(fe),B.blending===fr&&B.transparent===!1?Ve(oi):Ve(B.blending,B.blendEquation,B.blendSrc,B.blendDst,B.blendEquationAlpha,B.blendSrcAlpha,B.blendDstAlpha,B.blendColor,B.blendAlpha,B.premultipliedAlpha),a.setFunc(B.depthFunc),a.setTest(B.depthTest),a.setMask(B.depthWrite),s.setMask(B.colorWrite);const Ae=B.stencilWrite;o.setTest(Ae),Ae&&(o.setMask(B.stencilWriteMask),o.setFunc(B.stencilFunc,B.stencilRef,B.stencilFuncMask),o.setOp(B.stencilFail,B.stencilZFail,B.stencilZPass)),Se(B.polygonOffset,B.polygonOffsetFactor,B.polygonOffsetUnits),B.alphaToCoverage===!0?Q(n.SAMPLE_ALPHA_TO_COVERAGE):_e(n.SAMPLE_ALPHA_TO_COVERAGE)}function be(B){x!==B&&(B?n.frontFace(n.CW):n.frontFace(n.CCW),x=B)}function me(B){B!==Eh?(Q(n.CULL_FACE),B!==I&&(B===Ec?n.cullFace(n.BACK):B===wh?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):_e(n.CULL_FACE),I=B}function qe(B){B!==L&&(z&&n.lineWidth(B),L=B)}function Se(B,ue,fe){B?(Q(n.POLYGON_OFFSET_FILL),(C!==ue||U!==fe)&&(n.polygonOffset(ue,fe),C=ue,U=fe)):_e(n.POLYGON_OFFSET_FILL)}function Ce(B){B?Q(n.SCISSOR_TEST):_e(n.SCISSOR_TEST)}function Je(B){B===void 0&&(B=n.TEXTURE0+F-1),$!==B&&(n.activeTexture(B),$=B)}function ct(B,ue,fe){fe===void 0&&($===null?fe=n.TEXTURE0+F-1:fe=$);let Ae=ne[fe];Ae===void 0&&(Ae={type:void 0,texture:void 0},ne[fe]=Ae),(Ae.type!==B||Ae.texture!==ue)&&($!==fe&&(n.activeTexture(fe),$=fe),n.bindTexture(B,ue||j[B]),Ae.type=B,Ae.texture=ue)}function P(){const B=ne[$];B!==void 0&&B.type!==void 0&&(n.bindTexture(B.type,null),B.type=void 0,B.texture=void 0)}function b(){try{n.compressedTexImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function W(){try{n.compressedTexImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function K(){try{n.texSubImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function re(){try{n.texSubImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Z(){try{n.compressedTexSubImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Ue(){try{n.compressedTexSubImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function he(){try{n.texStorage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Pe(){try{n.texStorage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function Ie(){try{n.texImage2D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function le(){try{n.texImage3D(...arguments)}catch(B){console.error("THREE.WebGLState:",B)}}function ye(B){Ne.equals(B)===!1&&(n.scissor(B.x,B.y,B.z,B.w),Ne.copy(B))}function He(B){ve.equals(B)===!1&&(n.viewport(B.x,B.y,B.z,B.w),ve.copy(B))}function Fe(B,ue){let fe=c.get(ue);fe===void 0&&(fe=new WeakMap,c.set(ue,fe));let Ae=fe.get(B);Ae===void 0&&(Ae=n.getUniformBlockIndex(ue,B.name),fe.set(B,Ae))}function xe(B,ue){const Ae=c.get(ue).get(B);l.get(ue)!==Ae&&(n.uniformBlockBinding(ue,Ae,B.__bindingPointIndex),l.set(ue,Ae))}function Ye(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),a.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),u={},$=null,ne={},d={},h=new WeakMap,p=[],g=null,v=!1,m=null,f=null,E=null,_=null,y=null,A=null,S=null,w=new Qe(0,0,0),R=0,M=!1,x=null,I=null,L=null,C=null,U=null,Ne.set(0,0,n.canvas.width,n.canvas.height),ve.set(0,0,n.canvas.width,n.canvas.height),s.reset(),a.reset(),o.reset()}return{buffers:{color:s,depth:a,stencil:o},enable:Q,disable:_e,bindFramebuffer:de,drawBuffers:k,useProgram:ie,setBlending:Ve,setMaterial:ae,setFlipSided:be,setCullFace:me,setLineWidth:qe,setPolygonOffset:Se,setScissorTest:Ce,activeTexture:Je,bindTexture:ct,unbindTexture:P,compressedTexImage2D:b,compressedTexImage3D:W,texImage2D:Ie,texImage3D:le,updateUBOMapping:Fe,uniformBlockBinding:xe,texStorage2D:he,texStorage3D:Pe,texSubImage2D:K,texSubImage3D:re,compressedTexSubImage2D:Z,compressedTexSubImage3D:Ue,scissor:ye,viewport:He,reset:Ye}}function h0(n,e,t,i,r,s,a){const o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new ze,u=new WeakMap;let d;const h=new WeakMap;let p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(P,b){return p?new OffscreenCanvas(P,b):Jr("canvas")}function v(P,b,W){let K=1;const re=ct(P);if((re.width>W||re.height>W)&&(K=W/Math.max(re.width,re.height)),K<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){const Z=Math.floor(K*re.width),Ue=Math.floor(K*re.height);d===void 0&&(d=g(Z,Ue));const he=b?g(Z,Ue):d;return he.width=Z,he.height=Ue,he.getContext("2d").drawImage(P,0,0,Z,Ue),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+re.width+"x"+re.height+") to ("+Z+"x"+Ue+")."),he}else return"data"in P&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+re.width+"x"+re.height+")."),P;return P}function m(P){return P.generateMipmaps}function f(P){n.generateMipmap(P)}function E(P){return P.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?n.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function _(P,b,W,K,re=!1){if(P!==null){if(n[P]!==void 0)return n[P];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let Z=b;if(b===n.RED&&(W===n.FLOAT&&(Z=n.R32F),W===n.HALF_FLOAT&&(Z=n.R16F),W===n.UNSIGNED_BYTE&&(Z=n.R8)),b===n.RED_INTEGER&&(W===n.UNSIGNED_BYTE&&(Z=n.R8UI),W===n.UNSIGNED_SHORT&&(Z=n.R16UI),W===n.UNSIGNED_INT&&(Z=n.R32UI),W===n.BYTE&&(Z=n.R8I),W===n.SHORT&&(Z=n.R16I),W===n.INT&&(Z=n.R32I)),b===n.RG&&(W===n.FLOAT&&(Z=n.RG32F),W===n.HALF_FLOAT&&(Z=n.RG16F),W===n.UNSIGNED_BYTE&&(Z=n.RG8)),b===n.RG_INTEGER&&(W===n.UNSIGNED_BYTE&&(Z=n.RG8UI),W===n.UNSIGNED_SHORT&&(Z=n.RG16UI),W===n.UNSIGNED_INT&&(Z=n.RG32UI),W===n.BYTE&&(Z=n.RG8I),W===n.SHORT&&(Z=n.RG16I),W===n.INT&&(Z=n.RG32I)),b===n.RGB_INTEGER&&(W===n.UNSIGNED_BYTE&&(Z=n.RGB8UI),W===n.UNSIGNED_SHORT&&(Z=n.RGB16UI),W===n.UNSIGNED_INT&&(Z=n.RGB32UI),W===n.BYTE&&(Z=n.RGB8I),W===n.SHORT&&(Z=n.RGB16I),W===n.INT&&(Z=n.RGB32I)),b===n.RGBA_INTEGER&&(W===n.UNSIGNED_BYTE&&(Z=n.RGBA8UI),W===n.UNSIGNED_SHORT&&(Z=n.RGBA16UI),W===n.UNSIGNED_INT&&(Z=n.RGBA32UI),W===n.BYTE&&(Z=n.RGBA8I),W===n.SHORT&&(Z=n.RGBA16I),W===n.INT&&(Z=n.RGBA32I)),b===n.RGB&&(W===n.UNSIGNED_INT_5_9_9_9_REV&&(Z=n.RGB9_E5),W===n.UNSIGNED_INT_10F_11F_11F_REV&&(Z=n.R11F_G11F_B10F)),b===n.RGBA){const Ue=re?Qs:tt.getTransfer(K);W===n.FLOAT&&(Z=n.RGBA32F),W===n.HALF_FLOAT&&(Z=n.RGBA16F),W===n.UNSIGNED_BYTE&&(Z=Ue===st?n.SRGB8_ALPHA8:n.RGBA8),W===n.UNSIGNED_SHORT_4_4_4_4&&(Z=n.RGBA4),W===n.UNSIGNED_SHORT_5_5_5_1&&(Z=n.RGB5_A1)}return(Z===n.R16F||Z===n.R32F||Z===n.RG16F||Z===n.RG32F||Z===n.RGBA16F||Z===n.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function y(P,b){let W;return P?b===null||b===Ii||b===$r?W=n.DEPTH24_STENCIL8:b===qn?W=n.DEPTH32F_STENCIL8:b===Yr&&(W=n.DEPTH24_STENCIL8,console.warn("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):b===null||b===Ii||b===$r?W=n.DEPTH_COMPONENT24:b===qn?W=n.DEPTH_COMPONENT32F:b===Yr&&(W=n.DEPTH_COMPONENT16),W}function A(P,b){return m(P)===!0||P.isFramebufferTexture&&P.minFilter!==En&&P.minFilter!==Wt?Math.log2(Math.max(b.width,b.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?b.mipmaps.length:1}function S(P){const b=P.target;b.removeEventListener("dispose",S),R(b),b.isVideoTexture&&u.delete(b)}function w(P){const b=P.target;b.removeEventListener("dispose",w),x(b)}function R(P){const b=i.get(P);if(b.__webglInit===void 0)return;const W=P.source,K=h.get(W);if(K){const re=K[b.__cacheKey];re.usedTimes--,re.usedTimes===0&&M(P),Object.keys(K).length===0&&h.delete(W)}i.remove(P)}function M(P){const b=i.get(P);n.deleteTexture(b.__webglTexture);const W=P.source,K=h.get(W);delete K[b.__cacheKey],a.memory.textures--}function x(P){const b=i.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),i.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let K=0;K<6;K++){if(Array.isArray(b.__webglFramebuffer[K]))for(let re=0;re<b.__webglFramebuffer[K].length;re++)n.deleteFramebuffer(b.__webglFramebuffer[K][re]);else n.deleteFramebuffer(b.__webglFramebuffer[K]);b.__webglDepthbuffer&&n.deleteRenderbuffer(b.__webglDepthbuffer[K])}else{if(Array.isArray(b.__webglFramebuffer))for(let K=0;K<b.__webglFramebuffer.length;K++)n.deleteFramebuffer(b.__webglFramebuffer[K]);else n.deleteFramebuffer(b.__webglFramebuffer);if(b.__webglDepthbuffer&&n.deleteRenderbuffer(b.__webglDepthbuffer),b.__webglMultisampledFramebuffer&&n.deleteFramebuffer(b.__webglMultisampledFramebuffer),b.__webglColorRenderbuffer)for(let K=0;K<b.__webglColorRenderbuffer.length;K++)b.__webglColorRenderbuffer[K]&&n.deleteRenderbuffer(b.__webglColorRenderbuffer[K]);b.__webglDepthRenderbuffer&&n.deleteRenderbuffer(b.__webglDepthRenderbuffer)}const W=P.textures;for(let K=0,re=W.length;K<re;K++){const Z=i.get(W[K]);Z.__webglTexture&&(n.deleteTexture(Z.__webglTexture),a.memory.textures--),i.remove(W[K])}i.remove(P)}let I=0;function L(){I=0}function C(){const P=I;return P>=r.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+r.maxTextures),I+=1,P}function U(P){const b=[];return b.push(P.wrapS),b.push(P.wrapT),b.push(P.wrapR||0),b.push(P.magFilter),b.push(P.minFilter),b.push(P.anisotropy),b.push(P.internalFormat),b.push(P.format),b.push(P.type),b.push(P.generateMipmaps),b.push(P.premultiplyAlpha),b.push(P.flipY),b.push(P.unpackAlignment),b.push(P.colorSpace),b.join()}function F(P,b){const W=i.get(P);if(P.isVideoTexture&&Ce(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&W.__version!==P.version){const K=P.image;if(K===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(K.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{j(W,P,b);return}}else P.isExternalTexture&&(W.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,W.__webglTexture,n.TEXTURE0+b)}function z(P,b){const W=i.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&W.__version!==P.version){j(W,P,b);return}t.bindTexture(n.TEXTURE_2D_ARRAY,W.__webglTexture,n.TEXTURE0+b)}function X(P,b){const W=i.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&W.__version!==P.version){j(W,P,b);return}t.bindTexture(n.TEXTURE_3D,W.__webglTexture,n.TEXTURE0+b)}function G(P,b){const W=i.get(P);if(P.version>0&&W.__version!==P.version){Q(W,P,b);return}t.bindTexture(n.TEXTURE_CUBE_MAP,W.__webglTexture,n.TEXTURE0+b)}const $={[Lo]:n.REPEAT,[ai]:n.CLAMP_TO_EDGE,[Io]:n.MIRRORED_REPEAT},ne={[En]:n.NEAREST,[ef]:n.NEAREST_MIPMAP_NEAREST,[fs]:n.NEAREST_MIPMAP_LINEAR,[Wt]:n.LINEAR,[Aa]:n.LINEAR_MIPMAP_NEAREST,[Ai]:n.LINEAR_MIPMAP_LINEAR},se={[af]:n.NEVER,[hf]:n.ALWAYS,[of]:n.LESS,[vd]:n.LEQUAL,[lf]:n.EQUAL,[df]:n.GEQUAL,[cf]:n.GREATER,[uf]:n.NOTEQUAL};function Ee(P,b){if(b.type===qn&&e.has("OES_texture_float_linear")===!1&&(b.magFilter===Wt||b.magFilter===Aa||b.magFilter===fs||b.magFilter===Ai||b.minFilter===Wt||b.minFilter===Aa||b.minFilter===fs||b.minFilter===Ai)&&console.warn("THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(P,n.TEXTURE_WRAP_S,$[b.wrapS]),n.texParameteri(P,n.TEXTURE_WRAP_T,$[b.wrapT]),(P===n.TEXTURE_3D||P===n.TEXTURE_2D_ARRAY)&&n.texParameteri(P,n.TEXTURE_WRAP_R,$[b.wrapR]),n.texParameteri(P,n.TEXTURE_MAG_FILTER,ne[b.magFilter]),n.texParameteri(P,n.TEXTURE_MIN_FILTER,ne[b.minFilter]),b.compareFunction&&(n.texParameteri(P,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(P,n.TEXTURE_COMPARE_FUNC,se[b.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(b.magFilter===En||b.minFilter!==fs&&b.minFilter!==Ai||b.type===qn&&e.has("OES_texture_float_linear")===!1)return;if(b.anisotropy>1||i.get(b).__currentAnisotropy){const W=e.get("EXT_texture_filter_anisotropic");n.texParameterf(P,W.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(b.anisotropy,r.getMaxAnisotropy())),i.get(b).__currentAnisotropy=b.anisotropy}}}function Ne(P,b){let W=!1;P.__webglInit===void 0&&(P.__webglInit=!0,b.addEventListener("dispose",S));const K=b.source;let re=h.get(K);re===void 0&&(re={},h.set(K,re));const Z=U(b);if(Z!==P.__cacheKey){re[Z]===void 0&&(re[Z]={texture:n.createTexture(),usedTimes:0},a.memory.textures++,W=!0),re[Z].usedTimes++;const Ue=re[P.__cacheKey];Ue!==void 0&&(re[P.__cacheKey].usedTimes--,Ue.usedTimes===0&&M(b)),P.__cacheKey=Z,P.__webglTexture=re[Z].texture}return W}function ve(P,b,W){return Math.floor(Math.floor(P/W)/b)}function Re(P,b,W,K){const Z=P.updateRanges;if(Z.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,b.width,b.height,W,K,b.data);else{Z.sort((le,ye)=>le.start-ye.start);let Ue=0;for(let le=1;le<Z.length;le++){const ye=Z[Ue],He=Z[le],Fe=ye.start+ye.count,xe=ve(He.start,b.width,4),Ye=ve(ye.start,b.width,4);He.start<=Fe+1&&xe===Ye&&ve(He.start+He.count-1,b.width,4)===xe?ye.count=Math.max(ye.count,He.start+He.count-ye.start):(++Ue,Z[Ue]=He)}Z.length=Ue+1;const he=n.getParameter(n.UNPACK_ROW_LENGTH),Pe=n.getParameter(n.UNPACK_SKIP_PIXELS),Ie=n.getParameter(n.UNPACK_SKIP_ROWS);n.pixelStorei(n.UNPACK_ROW_LENGTH,b.width);for(let le=0,ye=Z.length;le<ye;le++){const He=Z[le],Fe=Math.floor(He.start/4),xe=Math.ceil(He.count/4),Ye=Fe%b.width,B=Math.floor(Fe/b.width),ue=xe,fe=1;n.pixelStorei(n.UNPACK_SKIP_PIXELS,Ye),n.pixelStorei(n.UNPACK_SKIP_ROWS,B),t.texSubImage2D(n.TEXTURE_2D,0,Ye,B,ue,fe,W,K,b.data)}P.clearUpdateRanges(),n.pixelStorei(n.UNPACK_ROW_LENGTH,he),n.pixelStorei(n.UNPACK_SKIP_PIXELS,Pe),n.pixelStorei(n.UNPACK_SKIP_ROWS,Ie)}}function j(P,b,W){let K=n.TEXTURE_2D;(b.isDataArrayTexture||b.isCompressedArrayTexture)&&(K=n.TEXTURE_2D_ARRAY),b.isData3DTexture&&(K=n.TEXTURE_3D);const re=Ne(P,b),Z=b.source;t.bindTexture(K,P.__webglTexture,n.TEXTURE0+W);const Ue=i.get(Z);if(Z.version!==Ue.__version||re===!0){t.activeTexture(n.TEXTURE0+W);const he=tt.getPrimaries(tt.workingColorSpace),Pe=b.colorSpace===Xn?null:tt.getPrimaries(b.colorSpace),Ie=b.colorSpace===Xn||he===Pe?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,b.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,b.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ie);let le=v(b.image,!1,r.maxTextureSize);le=Je(b,le);const ye=s.convert(b.format,b.colorSpace),He=s.convert(b.type);let Fe=_(b.internalFormat,ye,He,b.colorSpace,b.isVideoTexture);Ee(K,b);let xe;const Ye=b.mipmaps,B=b.isVideoTexture!==!0,ue=Ue.__version===void 0||re===!0,fe=Z.dataReady,Ae=A(b,le);if(b.isDepthTexture)Fe=y(b.format===Zr,b.type),ue&&(B?t.texStorage2D(n.TEXTURE_2D,1,Fe,le.width,le.height):t.texImage2D(n.TEXTURE_2D,0,Fe,le.width,le.height,0,ye,He,null));else if(b.isDataTexture)if(Ye.length>0){B&&ue&&t.texStorage2D(n.TEXTURE_2D,Ae,Fe,Ye[0].width,Ye[0].height);for(let oe=0,ee=Ye.length;oe<ee;oe++)xe=Ye[oe],B?fe&&t.texSubImage2D(n.TEXTURE_2D,oe,0,0,xe.width,xe.height,ye,He,xe.data):t.texImage2D(n.TEXTURE_2D,oe,Fe,xe.width,xe.height,0,ye,He,xe.data);b.generateMipmaps=!1}else B?(ue&&t.texStorage2D(n.TEXTURE_2D,Ae,Fe,le.width,le.height),fe&&Re(b,le,ye,He)):t.texImage2D(n.TEXTURE_2D,0,Fe,le.width,le.height,0,ye,He,le.data);else if(b.isCompressedTexture)if(b.isCompressedArrayTexture){B&&ue&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ae,Fe,Ye[0].width,Ye[0].height,le.depth);for(let oe=0,ee=Ye.length;oe<ee;oe++)if(xe=Ye[oe],b.format!==Sn)if(ye!==null)if(B){if(fe)if(b.layerUpdates.size>0){const De=au(xe.width,xe.height,b.format,b.type);for(const Xe of b.layerUpdates){const ut=xe.data.subarray(Xe*De/xe.data.BYTES_PER_ELEMENT,(Xe+1)*De/xe.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,oe,0,0,Xe,xe.width,xe.height,1,ye,ut)}b.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,oe,0,0,0,xe.width,xe.height,le.depth,ye,xe.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,oe,Fe,xe.width,xe.height,le.depth,0,xe.data,0,0);else console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else B?fe&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,oe,0,0,0,xe.width,xe.height,le.depth,ye,He,xe.data):t.texImage3D(n.TEXTURE_2D_ARRAY,oe,Fe,xe.width,xe.height,le.depth,0,ye,He,xe.data)}else{B&&ue&&t.texStorage2D(n.TEXTURE_2D,Ae,Fe,Ye[0].width,Ye[0].height);for(let oe=0,ee=Ye.length;oe<ee;oe++)xe=Ye[oe],b.format!==Sn?ye!==null?B?fe&&t.compressedTexSubImage2D(n.TEXTURE_2D,oe,0,0,xe.width,xe.height,ye,xe.data):t.compressedTexImage2D(n.TEXTURE_2D,oe,Fe,xe.width,xe.height,0,xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):B?fe&&t.texSubImage2D(n.TEXTURE_2D,oe,0,0,xe.width,xe.height,ye,He,xe.data):t.texImage2D(n.TEXTURE_2D,oe,Fe,xe.width,xe.height,0,ye,He,xe.data)}else if(b.isDataArrayTexture)if(B){if(ue&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Ae,Fe,le.width,le.height,le.depth),fe)if(b.layerUpdates.size>0){const oe=au(le.width,le.height,b.format,b.type);for(const ee of b.layerUpdates){const De=le.data.subarray(ee*oe/le.data.BYTES_PER_ELEMENT,(ee+1)*oe/le.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,ee,le.width,le.height,1,ye,He,De)}b.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,le.width,le.height,le.depth,ye,He,le.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,Fe,le.width,le.height,le.depth,0,ye,He,le.data);else if(b.isData3DTexture)B?(ue&&t.texStorage3D(n.TEXTURE_3D,Ae,Fe,le.width,le.height,le.depth),fe&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,le.width,le.height,le.depth,ye,He,le.data)):t.texImage3D(n.TEXTURE_3D,0,Fe,le.width,le.height,le.depth,0,ye,He,le.data);else if(b.isFramebufferTexture){if(ue)if(B)t.texStorage2D(n.TEXTURE_2D,Ae,Fe,le.width,le.height);else{let oe=le.width,ee=le.height;for(let De=0;De<Ae;De++)t.texImage2D(n.TEXTURE_2D,De,Fe,oe,ee,0,ye,He,null),oe>>=1,ee>>=1}}else if(Ye.length>0){if(B&&ue){const oe=ct(Ye[0]);t.texStorage2D(n.TEXTURE_2D,Ae,Fe,oe.width,oe.height)}for(let oe=0,ee=Ye.length;oe<ee;oe++)xe=Ye[oe],B?fe&&t.texSubImage2D(n.TEXTURE_2D,oe,0,0,ye,He,xe):t.texImage2D(n.TEXTURE_2D,oe,Fe,ye,He,xe);b.generateMipmaps=!1}else if(B){if(ue){const oe=ct(le);t.texStorage2D(n.TEXTURE_2D,Ae,Fe,oe.width,oe.height)}fe&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,ye,He,le)}else t.texImage2D(n.TEXTURE_2D,0,Fe,ye,He,le);m(b)&&f(K),Ue.__version=Z.version,b.onUpdate&&b.onUpdate(b)}P.__version=b.version}function Q(P,b,W){if(b.image.length!==6)return;const K=Ne(P,b),re=b.source;t.bindTexture(n.TEXTURE_CUBE_MAP,P.__webglTexture,n.TEXTURE0+W);const Z=i.get(re);if(re.version!==Z.__version||K===!0){t.activeTexture(n.TEXTURE0+W);const Ue=tt.getPrimaries(tt.workingColorSpace),he=b.colorSpace===Xn?null:tt.getPrimaries(b.colorSpace),Pe=b.colorSpace===Xn||Ue===he?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,b.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,b.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Pe);const Ie=b.isCompressedTexture||b.image[0].isCompressedTexture,le=b.image[0]&&b.image[0].isDataTexture,ye=[];for(let ee=0;ee<6;ee++)!Ie&&!le?ye[ee]=v(b.image[ee],!0,r.maxCubemapSize):ye[ee]=le?b.image[ee].image:b.image[ee],ye[ee]=Je(b,ye[ee]);const He=ye[0],Fe=s.convert(b.format,b.colorSpace),xe=s.convert(b.type),Ye=_(b.internalFormat,Fe,xe,b.colorSpace),B=b.isVideoTexture!==!0,ue=Z.__version===void 0||K===!0,fe=re.dataReady;let Ae=A(b,He);Ee(n.TEXTURE_CUBE_MAP,b);let oe;if(Ie){B&&ue&&t.texStorage2D(n.TEXTURE_CUBE_MAP,Ae,Ye,He.width,He.height);for(let ee=0;ee<6;ee++){oe=ye[ee].mipmaps;for(let De=0;De<oe.length;De++){const Xe=oe[De];b.format!==Sn?Fe!==null?B?fe&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De,0,0,Xe.width,Xe.height,Fe,Xe.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De,Ye,Xe.width,Xe.height,0,Xe.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):B?fe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De,0,0,Xe.width,Xe.height,Fe,xe,Xe.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De,Ye,Xe.width,Xe.height,0,Fe,xe,Xe.data)}}}else{if(oe=b.mipmaps,B&&ue){oe.length>0&&Ae++;const ee=ct(ye[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,Ae,Ye,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(le){B?fe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,ye[ee].width,ye[ee].height,Fe,xe,ye[ee].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ye,ye[ee].width,ye[ee].height,0,Fe,xe,ye[ee].data);for(let De=0;De<oe.length;De++){const ut=oe[De].image[ee].image;B?fe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De+1,0,0,ut.width,ut.height,Fe,xe,ut.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De+1,Ye,ut.width,ut.height,0,Fe,xe,ut.data)}}else{B?fe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Fe,xe,ye[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Ye,Fe,xe,ye[ee]);for(let De=0;De<oe.length;De++){const Xe=oe[De];B?fe&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De+1,0,0,Fe,xe,Xe.image[ee]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+ee,De+1,Ye,Fe,xe,Xe.image[ee])}}}m(b)&&f(n.TEXTURE_CUBE_MAP),Z.__version=re.version,b.onUpdate&&b.onUpdate(b)}P.__version=b.version}function _e(P,b,W,K,re,Z){const Ue=s.convert(W.format,W.colorSpace),he=s.convert(W.type),Pe=_(W.internalFormat,Ue,he,W.colorSpace),Ie=i.get(b),le=i.get(W);if(le.__renderTarget=b,!Ie.__hasExternalTextures){const ye=Math.max(1,b.width>>Z),He=Math.max(1,b.height>>Z);re===n.TEXTURE_3D||re===n.TEXTURE_2D_ARRAY?t.texImage3D(re,Z,Pe,ye,He,b.depth,0,Ue,he,null):t.texImage2D(re,Z,Pe,ye,He,0,Ue,he,null)}t.bindFramebuffer(n.FRAMEBUFFER,P),Se(b)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,K,re,le.__webglTexture,0,qe(b)):(re===n.TEXTURE_2D||re>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&re<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,K,re,le.__webglTexture,Z),t.bindFramebuffer(n.FRAMEBUFFER,null)}function de(P,b,W){if(n.bindRenderbuffer(n.RENDERBUFFER,P),b.depthBuffer){const K=b.depthTexture,re=K&&K.isDepthTexture?K.type:null,Z=y(b.stencilBuffer,re),Ue=b.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,he=qe(b);Se(b)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,he,Z,b.width,b.height):W?n.renderbufferStorageMultisample(n.RENDERBUFFER,he,Z,b.width,b.height):n.renderbufferStorage(n.RENDERBUFFER,Z,b.width,b.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Ue,n.RENDERBUFFER,P)}else{const K=b.textures;for(let re=0;re<K.length;re++){const Z=K[re],Ue=s.convert(Z.format,Z.colorSpace),he=s.convert(Z.type),Pe=_(Z.internalFormat,Ue,he,Z.colorSpace),Ie=qe(b);W&&Se(b)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Ie,Pe,b.width,b.height):Se(b)?o.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Ie,Pe,b.width,b.height):n.renderbufferStorage(n.RENDERBUFFER,Pe,b.width,b.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function k(P,b){if(b&&b.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,P),!(b.depthTexture&&b.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const K=i.get(b.depthTexture);K.__renderTarget=b,(!K.__webglTexture||b.depthTexture.image.width!==b.width||b.depthTexture.image.height!==b.height)&&(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0),F(b.depthTexture,0);const re=K.__webglTexture,Z=qe(b);if(b.depthTexture.format===jr)Se(b)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,re,0,Z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,re,0);else if(b.depthTexture.format===Zr)Se(b)?o.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,re,0,Z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,re,0);else throw new Error("Unknown depthTexture format")}function ie(P){const b=i.get(P),W=P.isWebGLCubeRenderTarget===!0;if(b.__boundDepthTexture!==P.depthTexture){const K=P.depthTexture;if(b.__depthDisposeCallback&&b.__depthDisposeCallback(),K){const re=()=>{delete b.__boundDepthTexture,delete b.__depthDisposeCallback,K.removeEventListener("dispose",re)};K.addEventListener("dispose",re),b.__depthDisposeCallback=re}b.__boundDepthTexture=K}if(P.depthTexture&&!b.__autoAllocateDepthBuffer){if(W)throw new Error("target.depthTexture not supported in Cube render targets");const K=P.texture.mipmaps;K&&K.length>0?k(b.__webglFramebuffer[0],P):k(b.__webglFramebuffer,P)}else if(W){b.__webglDepthbuffer=[];for(let K=0;K<6;K++)if(t.bindFramebuffer(n.FRAMEBUFFER,b.__webglFramebuffer[K]),b.__webglDepthbuffer[K]===void 0)b.__webglDepthbuffer[K]=n.createRenderbuffer(),de(b.__webglDepthbuffer[K],P,!1);else{const re=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Z=b.__webglDepthbuffer[K];n.bindRenderbuffer(n.RENDERBUFFER,Z),n.framebufferRenderbuffer(n.FRAMEBUFFER,re,n.RENDERBUFFER,Z)}}else{const K=P.texture.mipmaps;if(K&&K.length>0?t.bindFramebuffer(n.FRAMEBUFFER,b.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,b.__webglFramebuffer),b.__webglDepthbuffer===void 0)b.__webglDepthbuffer=n.createRenderbuffer(),de(b.__webglDepthbuffer,P,!1);else{const re=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Z=b.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,Z),n.framebufferRenderbuffer(n.FRAMEBUFFER,re,n.RENDERBUFFER,Z)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function we(P,b,W){const K=i.get(P);b!==void 0&&_e(K.__webglFramebuffer,P,P.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),W!==void 0&&ie(P)}function D(P){const b=P.texture,W=i.get(P),K=i.get(b);P.addEventListener("dispose",w);const re=P.textures,Z=P.isWebGLCubeRenderTarget===!0,Ue=re.length>1;if(Ue||(K.__webglTexture===void 0&&(K.__webglTexture=n.createTexture()),K.__version=b.version,a.memory.textures++),Z){W.__webglFramebuffer=[];for(let he=0;he<6;he++)if(b.mipmaps&&b.mipmaps.length>0){W.__webglFramebuffer[he]=[];for(let Pe=0;Pe<b.mipmaps.length;Pe++)W.__webglFramebuffer[he][Pe]=n.createFramebuffer()}else W.__webglFramebuffer[he]=n.createFramebuffer()}else{if(b.mipmaps&&b.mipmaps.length>0){W.__webglFramebuffer=[];for(let he=0;he<b.mipmaps.length;he++)W.__webglFramebuffer[he]=n.createFramebuffer()}else W.__webglFramebuffer=n.createFramebuffer();if(Ue)for(let he=0,Pe=re.length;he<Pe;he++){const Ie=i.get(re[he]);Ie.__webglTexture===void 0&&(Ie.__webglTexture=n.createTexture(),a.memory.textures++)}if(P.samples>0&&Se(P)===!1){W.__webglMultisampledFramebuffer=n.createFramebuffer(),W.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,W.__webglMultisampledFramebuffer);for(let he=0;he<re.length;he++){const Pe=re[he];W.__webglColorRenderbuffer[he]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,W.__webglColorRenderbuffer[he]);const Ie=s.convert(Pe.format,Pe.colorSpace),le=s.convert(Pe.type),ye=_(Pe.internalFormat,Ie,le,Pe.colorSpace,P.isXRRenderTarget===!0),He=qe(P);n.renderbufferStorageMultisample(n.RENDERBUFFER,He,ye,P.width,P.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+he,n.RENDERBUFFER,W.__webglColorRenderbuffer[he])}n.bindRenderbuffer(n.RENDERBUFFER,null),P.depthBuffer&&(W.__webglDepthRenderbuffer=n.createRenderbuffer(),de(W.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Z){t.bindTexture(n.TEXTURE_CUBE_MAP,K.__webglTexture),Ee(n.TEXTURE_CUBE_MAP,b);for(let he=0;he<6;he++)if(b.mipmaps&&b.mipmaps.length>0)for(let Pe=0;Pe<b.mipmaps.length;Pe++)_e(W.__webglFramebuffer[he][Pe],P,b,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+he,Pe);else _e(W.__webglFramebuffer[he],P,b,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+he,0);m(b)&&f(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Ue){for(let he=0,Pe=re.length;he<Pe;he++){const Ie=re[he],le=i.get(Ie);let ye=n.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ye=P.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(ye,le.__webglTexture),Ee(ye,Ie),_e(W.__webglFramebuffer,P,Ie,n.COLOR_ATTACHMENT0+he,ye,0),m(Ie)&&f(ye)}t.unbindTexture()}else{let he=n.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(he=P.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(he,K.__webglTexture),Ee(he,b),b.mipmaps&&b.mipmaps.length>0)for(let Pe=0;Pe<b.mipmaps.length;Pe++)_e(W.__webglFramebuffer[Pe],P,b,n.COLOR_ATTACHMENT0,he,Pe);else _e(W.__webglFramebuffer,P,b,n.COLOR_ATTACHMENT0,he,0);m(b)&&f(he),t.unbindTexture()}P.depthBuffer&&ie(P)}function Ve(P){const b=P.textures;for(let W=0,K=b.length;W<K;W++){const re=b[W];if(m(re)){const Z=E(P),Ue=i.get(re).__webglTexture;t.bindTexture(Z,Ue),f(Z),t.unbindTexture()}}}const ae=[],be=[];function me(P){if(P.samples>0){if(Se(P)===!1){const b=P.textures,W=P.width,K=P.height;let re=n.COLOR_BUFFER_BIT;const Z=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Ue=i.get(P),he=b.length>1;if(he)for(let Ie=0;Ie<b.length;Ie++)t.bindFramebuffer(n.FRAMEBUFFER,Ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ie,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ie,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Ue.__webglMultisampledFramebuffer);const Pe=P.texture.mipmaps;Pe&&Pe.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ue.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ue.__webglFramebuffer);for(let Ie=0;Ie<b.length;Ie++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(re|=n.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(re|=n.STENCIL_BUFFER_BIT)),he){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Ue.__webglColorRenderbuffer[Ie]);const le=i.get(b[Ie]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,le,0)}n.blitFramebuffer(0,0,W,K,0,0,W,K,re,n.NEAREST),l===!0&&(ae.length=0,be.length=0,ae.push(n.COLOR_ATTACHMENT0+Ie),P.depthBuffer&&P.resolveDepthBuffer===!1&&(ae.push(Z),be.push(Z),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,be)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,ae))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),he)for(let Ie=0;Ie<b.length;Ie++){t.bindFramebuffer(n.FRAMEBUFFER,Ue.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ie,n.RENDERBUFFER,Ue.__webglColorRenderbuffer[Ie]);const le=i.get(b[Ie]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Ue.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Ie,n.TEXTURE_2D,le,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Ue.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){const b=P.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[b])}}}function qe(P){return Math.min(r.maxSamples,P.samples)}function Se(P){const b=i.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&b.__useRenderToTexture!==!1}function Ce(P){const b=a.render.frame;u.get(P)!==b&&(u.set(P,b),P.update())}function Je(P,b){const W=P.colorSpace,K=P.format,re=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||W!==xr&&W!==Xn&&(tt.getTransfer(W)===st?(K!==Sn||re!==Zn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",W)),b}function ct(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=C,this.resetTextureUnits=L,this.setTexture2D=F,this.setTexture2DArray=z,this.setTexture3D=X,this.setTextureCube=G,this.rebindTextures=we,this.setupRenderTarget=D,this.updateRenderTargetMipmap=Ve,this.updateMultisampleRenderTarget=me,this.setupDepthRenderbuffer=ie,this.setupFrameBufferTexture=_e,this.useMultisampledRTT=Se}function f0(n,e){function t(i,r=Xn){let s;const a=tt.getTransfer(r);if(i===Zn)return n.UNSIGNED_BYTE;if(i===Dl)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Ul)return n.UNSIGNED_SHORT_5_5_5_1;if(i===dd)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===hd)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===cd)return n.BYTE;if(i===ud)return n.SHORT;if(i===Yr)return n.UNSIGNED_SHORT;if(i===Il)return n.INT;if(i===Ii)return n.UNSIGNED_INT;if(i===qn)return n.FLOAT;if(i===ss)return n.HALF_FLOAT;if(i===fd)return n.ALPHA;if(i===pd)return n.RGB;if(i===Sn)return n.RGBA;if(i===jr)return n.DEPTH_COMPONENT;if(i===Zr)return n.DEPTH_STENCIL;if(i===md)return n.RED;if(i===Nl)return n.RED_INTEGER;if(i===gd)return n.RG;if(i===Fl)return n.RG_INTEGER;if(i===Ol)return n.RGBA_INTEGER;if(i===Ys||i===$s||i===js||i===Zs)if(a===st)if(s=e.get("WEBGL_compressed_texture_s3tc_srgb"),s!==null){if(i===Ys)return s.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===$s)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===js)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Zs)return s.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(s=e.get("WEBGL_compressed_texture_s3tc"),s!==null){if(i===Ys)return s.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===$s)return s.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===js)return s.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Zs)return s.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Do||i===Uo||i===No||i===Fo)if(s=e.get("WEBGL_compressed_texture_pvrtc"),s!==null){if(i===Do)return s.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Uo)return s.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===No)return s.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===Fo)return s.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Oo||i===Bo||i===zo)if(s=e.get("WEBGL_compressed_texture_etc"),s!==null){if(i===Oo||i===Bo)return a===st?s.COMPRESSED_SRGB8_ETC2:s.COMPRESSED_RGB8_ETC2;if(i===zo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:s.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===ko||i===Ho||i===Vo||i===Go||i===Wo||i===Xo||i===qo||i===Yo||i===$o||i===jo||i===Zo||i===Ko||i===Jo||i===Qo)if(s=e.get("WEBGL_compressed_texture_astc"),s!==null){if(i===ko)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:s.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Ho)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:s.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Vo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:s.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Go)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:s.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Wo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:s.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Xo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:s.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===qo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:s.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Yo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:s.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===$o)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:s.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===jo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:s.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===Zo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:s.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Ko)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:s.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Jo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:s.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Qo)return a===st?s.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:s.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===el||i===tl||i===nl)if(s=e.get("EXT_texture_compression_bptc"),s!==null){if(i===el)return a===st?s.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:s.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===tl)return s.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===nl)return s.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===il||i===rl||i===sl||i===al)if(s=e.get("EXT_texture_compression_rgtc"),s!==null){if(i===il)return s.COMPRESSED_RED_RGTC1_EXT;if(i===rl)return s.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===sl)return s.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===al)return s.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===$r?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}const p0=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,m0=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class g0{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new Id(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new an({vertexShader:p0,fragmentShader:m0,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new It(new os(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class v0 extends Bi{constructor(e,t){super();const i=this;let r=null,s=1,a=null,o="local-floor",l=1,c=null,u=null,d=null,h=null,p=null,g=null;const v=typeof XRWebGLBinding<"u",m=new g0,f={},E=t.getContextAttributes();let _=null,y=null;const A=[],S=[],w=new ze;let R=null;const M=new yn;M.viewport=new dt;const x=new yn;x.viewport=new dt;const I=[M,x],L=new Up;let C=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let Q=A[j];return Q===void 0&&(Q=new $a,A[j]=Q),Q.getTargetRaySpace()},this.getControllerGrip=function(j){let Q=A[j];return Q===void 0&&(Q=new $a,A[j]=Q),Q.getGripSpace()},this.getHand=function(j){let Q=A[j];return Q===void 0&&(Q=new $a,A[j]=Q),Q.getHandSpace()};function F(j){const Q=S.indexOf(j.inputSource);if(Q===-1)return;const _e=A[Q];_e!==void 0&&(_e.update(j.inputSource,j.frame,c||a),_e.dispatchEvent({type:j.type,data:j.inputSource}))}function z(){r.removeEventListener("select",F),r.removeEventListener("selectstart",F),r.removeEventListener("selectend",F),r.removeEventListener("squeeze",F),r.removeEventListener("squeezestart",F),r.removeEventListener("squeezeend",F),r.removeEventListener("end",z),r.removeEventListener("inputsourceschange",X);for(let j=0;j<A.length;j++){const Q=S[j];Q!==null&&(S[j]=null,A[j].disconnect(Q))}C=null,U=null,m.reset();for(const j in f)delete f[j];e.setRenderTarget(_),p=null,h=null,d=null,r=null,y=null,Re.stop(),i.isPresenting=!1,e.setPixelRatio(R),e.setSize(w.width,w.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){s=j,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){o=j,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(j){c=j},this.getBaseLayer=function(){return h!==null?h:p},this.getBinding=function(){return d===null&&v&&(d=new XRWebGLBinding(r,t)),d},this.getFrame=function(){return g},this.getSession=function(){return r},this.setSession=async function(j){if(r=j,r!==null){if(_=e.getRenderTarget(),r.addEventListener("select",F),r.addEventListener("selectstart",F),r.addEventListener("selectend",F),r.addEventListener("squeeze",F),r.addEventListener("squeezestart",F),r.addEventListener("squeezeend",F),r.addEventListener("end",z),r.addEventListener("inputsourceschange",X),E.xrCompatible!==!0&&await t.makeXRCompatible(),R=e.getPixelRatio(),e.getSize(w),v&&"createProjectionLayer"in XRWebGLBinding.prototype){let _e=null,de=null,k=null;E.depth&&(k=E.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,_e=E.stencil?Zr:jr,de=E.stencil?$r:Ii);const ie={colorFormat:t.RGBA8,depthFormat:k,scaleFactor:s};d=this.getBinding(),h=d.createProjectionLayer(ie),r.updateRenderState({layers:[h]}),e.setPixelRatio(1),e.setSize(h.textureWidth,h.textureHeight,!1),y=new Ui(h.textureWidth,h.textureHeight,{format:Sn,type:Zn,depthTexture:new Ld(h.textureWidth,h.textureHeight,de,void 0,void 0,void 0,void 0,void 0,void 0,_e),stencilBuffer:E.stencil,colorSpace:e.outputColorSpace,samples:E.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const _e={antialias:E.antialias,alpha:!0,depth:E.depth,stencil:E.stencil,framebufferScaleFactor:s};p=new XRWebGLLayer(r,t,_e),r.updateRenderState({baseLayer:p}),e.setPixelRatio(1),e.setSize(p.framebufferWidth,p.framebufferHeight,!1),y=new Ui(p.framebufferWidth,p.framebufferHeight,{format:Sn,type:Zn,colorSpace:e.outputColorSpace,stencilBuffer:E.stencil,resolveDepthBuffer:p.ignoreDepthValues===!1,resolveStencilBuffer:p.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await r.requestReferenceSpace(o),Re.setContext(r),Re.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return m.getDepthTexture()};function X(j){for(let Q=0;Q<j.removed.length;Q++){const _e=j.removed[Q],de=S.indexOf(_e);de>=0&&(S[de]=null,A[de].disconnect(_e))}for(let Q=0;Q<j.added.length;Q++){const _e=j.added[Q];let de=S.indexOf(_e);if(de===-1){for(let ie=0;ie<A.length;ie++)if(ie>=S.length){S.push(_e),de=ie;break}else if(S[ie]===null){S[ie]=_e,de=ie;break}if(de===-1)break}const k=A[de];k&&k.connect(_e)}}const G=new O,$=new O;function ne(j,Q,_e){G.setFromMatrixPosition(Q.matrixWorld),$.setFromMatrixPosition(_e.matrixWorld);const de=G.distanceTo($),k=Q.projectionMatrix.elements,ie=_e.projectionMatrix.elements,we=k[14]/(k[10]-1),D=k[14]/(k[10]+1),Ve=(k[9]+1)/k[5],ae=(k[9]-1)/k[5],be=(k[8]-1)/k[0],me=(ie[8]+1)/ie[0],qe=we*be,Se=we*me,Ce=de/(-be+me),Je=Ce*-be;if(Q.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(Je),j.translateZ(Ce),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),k[10]===-1)j.projectionMatrix.copy(Q.projectionMatrix),j.projectionMatrixInverse.copy(Q.projectionMatrixInverse);else{const ct=we+Ce,P=D+Ce,b=qe-Je,W=Se+(de-Je),K=Ve*D/P*ct,re=ae*D/P*ct;j.projectionMatrix.makePerspective(b,W,K,re,ct,P),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function se(j,Q){Q===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(Q.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(r===null)return;let Q=j.near,_e=j.far;m.texture!==null&&(m.depthNear>0&&(Q=m.depthNear),m.depthFar>0&&(_e=m.depthFar)),L.near=x.near=M.near=Q,L.far=x.far=M.far=_e,(C!==L.near||U!==L.far)&&(r.updateRenderState({depthNear:L.near,depthFar:L.far}),C=L.near,U=L.far),L.layers.mask=j.layers.mask|6,M.layers.mask=L.layers.mask&3,x.layers.mask=L.layers.mask&5;const de=j.parent,k=L.cameras;se(L,de);for(let ie=0;ie<k.length;ie++)se(k[ie],de);k.length===2?ne(L,M,x):L.projectionMatrix.copy(M.projectionMatrix),Ee(j,L,de)};function Ee(j,Q,_e){_e===null?j.matrix.copy(Q.matrixWorld):(j.matrix.copy(_e.matrixWorld),j.matrix.invert(),j.matrix.multiply(Q.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(Q.projectionMatrix),j.projectionMatrixInverse.copy(Q.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=Kr*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(h===null&&p===null))return l},this.setFoveation=function(j){l=j,h!==null&&(h.fixedFoveation=j),p!==null&&p.fixedFoveation!==void 0&&(p.fixedFoveation=j)},this.hasDepthSensing=function(){return m.texture!==null},this.getDepthSensingMesh=function(){return m.getMesh(L)},this.getCameraTexture=function(j){return f[j]};let Ne=null;function ve(j,Q){if(u=Q.getViewerPose(c||a),g=Q,u!==null){const _e=u.views;p!==null&&(e.setRenderTargetFramebuffer(y,p.framebuffer),e.setRenderTarget(y));let de=!1;_e.length!==L.cameras.length&&(L.cameras.length=0,de=!0);for(let D=0;D<_e.length;D++){const Ve=_e[D];let ae=null;if(p!==null)ae=p.getViewport(Ve);else{const me=d.getViewSubImage(h,Ve);ae=me.viewport,D===0&&(e.setRenderTargetTextures(y,me.colorTexture,me.depthStencilTexture),e.setRenderTarget(y))}let be=I[D];be===void 0&&(be=new yn,be.layers.enable(D),be.viewport=new dt,I[D]=be),be.matrix.fromArray(Ve.transform.matrix),be.matrix.decompose(be.position,be.quaternion,be.scale),be.projectionMatrix.fromArray(Ve.projectionMatrix),be.projectionMatrixInverse.copy(be.projectionMatrix).invert(),be.viewport.set(ae.x,ae.y,ae.width,ae.height),D===0&&(L.matrix.copy(be.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),de===!0&&L.cameras.push(be)}const k=r.enabledFeatures;if(k&&k.includes("depth-sensing")&&r.depthUsage=="gpu-optimized"&&v){d=i.getBinding();const D=d.getDepthInformation(_e[0]);D&&D.isValid&&D.texture&&m.init(D,r.renderState)}if(k&&k.includes("camera-access")&&v){e.state.unbindTexture(),d=i.getBinding();for(let D=0;D<_e.length;D++){const Ve=_e[D].camera;if(Ve){let ae=f[Ve];ae||(ae=new Id,f[Ve]=ae);const be=d.getCameraImage(Ve);ae.sourceTexture=be}}}}for(let _e=0;_e<A.length;_e++){const de=S[_e],k=A[_e];de!==null&&k!==void 0&&k.update(de,Q,c||a)}Ne&&Ne(j,Q),Q.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:Q}),g=null}const Re=new zd;Re.setAnimationLoop(ve),this.setAnimationLoop=function(j){Ne=j},this.dispose=function(){}}}const bi=new Kn,_0=new ht;function y0(n,e){function t(m,f){m.matrixAutoUpdate===!0&&m.updateMatrix(),f.value.copy(m.matrix)}function i(m,f){f.color.getRGB(m.fogColor.value,bd(n)),f.isFog?(m.fogNear.value=f.near,m.fogFar.value=f.far):f.isFogExp2&&(m.fogDensity.value=f.density)}function r(m,f,E,_,y){f.isMeshBasicMaterial||f.isMeshLambertMaterial?s(m,f):f.isMeshToonMaterial?(s(m,f),d(m,f)):f.isMeshPhongMaterial?(s(m,f),u(m,f)):f.isMeshStandardMaterial?(s(m,f),h(m,f),f.isMeshPhysicalMaterial&&p(m,f,y)):f.isMeshMatcapMaterial?(s(m,f),g(m,f)):f.isMeshDepthMaterial?s(m,f):f.isMeshDistanceMaterial?(s(m,f),v(m,f)):f.isMeshNormalMaterial?s(m,f):f.isLineBasicMaterial?(a(m,f),f.isLineDashedMaterial&&o(m,f)):f.isPointsMaterial?l(m,f,E,_):f.isSpriteMaterial?c(m,f):f.isShadowMaterial?(m.color.value.copy(f.color),m.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function s(m,f){m.opacity.value=f.opacity,f.color&&m.diffuse.value.copy(f.color),f.emissive&&m.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(m.map.value=f.map,t(f.map,m.mapTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,t(f.alphaMap,m.alphaMapTransform)),f.bumpMap&&(m.bumpMap.value=f.bumpMap,t(f.bumpMap,m.bumpMapTransform),m.bumpScale.value=f.bumpScale,f.side===Kt&&(m.bumpScale.value*=-1)),f.normalMap&&(m.normalMap.value=f.normalMap,t(f.normalMap,m.normalMapTransform),m.normalScale.value.copy(f.normalScale),f.side===Kt&&m.normalScale.value.negate()),f.displacementMap&&(m.displacementMap.value=f.displacementMap,t(f.displacementMap,m.displacementMapTransform),m.displacementScale.value=f.displacementScale,m.displacementBias.value=f.displacementBias),f.emissiveMap&&(m.emissiveMap.value=f.emissiveMap,t(f.emissiveMap,m.emissiveMapTransform)),f.specularMap&&(m.specularMap.value=f.specularMap,t(f.specularMap,m.specularMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest);const E=e.get(f),_=E.envMap,y=E.envMapRotation;_&&(m.envMap.value=_,bi.copy(y),bi.x*=-1,bi.y*=-1,bi.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(bi.y*=-1,bi.z*=-1),m.envMapRotation.value.setFromMatrix4(_0.makeRotationFromEuler(bi)),m.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=f.reflectivity,m.ior.value=f.ior,m.refractionRatio.value=f.refractionRatio),f.lightMap&&(m.lightMap.value=f.lightMap,m.lightMapIntensity.value=f.lightMapIntensity,t(f.lightMap,m.lightMapTransform)),f.aoMap&&(m.aoMap.value=f.aoMap,m.aoMapIntensity.value=f.aoMapIntensity,t(f.aoMap,m.aoMapTransform))}function a(m,f){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,f.map&&(m.map.value=f.map,t(f.map,m.mapTransform))}function o(m,f){m.dashSize.value=f.dashSize,m.totalSize.value=f.dashSize+f.gapSize,m.scale.value=f.scale}function l(m,f,E,_){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,m.size.value=f.size*E,m.scale.value=_*.5,f.map&&(m.map.value=f.map,t(f.map,m.uvTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,t(f.alphaMap,m.alphaMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest)}function c(m,f){m.diffuse.value.copy(f.color),m.opacity.value=f.opacity,m.rotation.value=f.rotation,f.map&&(m.map.value=f.map,t(f.map,m.mapTransform)),f.alphaMap&&(m.alphaMap.value=f.alphaMap,t(f.alphaMap,m.alphaMapTransform)),f.alphaTest>0&&(m.alphaTest.value=f.alphaTest)}function u(m,f){m.specular.value.copy(f.specular),m.shininess.value=Math.max(f.shininess,1e-4)}function d(m,f){f.gradientMap&&(m.gradientMap.value=f.gradientMap)}function h(m,f){m.metalness.value=f.metalness,f.metalnessMap&&(m.metalnessMap.value=f.metalnessMap,t(f.metalnessMap,m.metalnessMapTransform)),m.roughness.value=f.roughness,f.roughnessMap&&(m.roughnessMap.value=f.roughnessMap,t(f.roughnessMap,m.roughnessMapTransform)),f.envMap&&(m.envMapIntensity.value=f.envMapIntensity)}function p(m,f,E){m.ior.value=f.ior,f.sheen>0&&(m.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),m.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(m.sheenColorMap.value=f.sheenColorMap,t(f.sheenColorMap,m.sheenColorMapTransform)),f.sheenRoughnessMap&&(m.sheenRoughnessMap.value=f.sheenRoughnessMap,t(f.sheenRoughnessMap,m.sheenRoughnessMapTransform))),f.clearcoat>0&&(m.clearcoat.value=f.clearcoat,m.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(m.clearcoatMap.value=f.clearcoatMap,t(f.clearcoatMap,m.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,t(f.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(m.clearcoatNormalMap.value=f.clearcoatNormalMap,t(f.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===Kt&&m.clearcoatNormalScale.value.negate())),f.dispersion>0&&(m.dispersion.value=f.dispersion),f.iridescence>0&&(m.iridescence.value=f.iridescence,m.iridescenceIOR.value=f.iridescenceIOR,m.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(m.iridescenceMap.value=f.iridescenceMap,t(f.iridescenceMap,m.iridescenceMapTransform)),f.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=f.iridescenceThicknessMap,t(f.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),f.transmission>0&&(m.transmission.value=f.transmission,m.transmissionSamplerMap.value=E.texture,m.transmissionSamplerSize.value.set(E.width,E.height),f.transmissionMap&&(m.transmissionMap.value=f.transmissionMap,t(f.transmissionMap,m.transmissionMapTransform)),m.thickness.value=f.thickness,f.thicknessMap&&(m.thicknessMap.value=f.thicknessMap,t(f.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=f.attenuationDistance,m.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(m.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(m.anisotropyMap.value=f.anisotropyMap,t(f.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=f.specularIntensity,m.specularColor.value.copy(f.specularColor),f.specularColorMap&&(m.specularColorMap.value=f.specularColorMap,t(f.specularColorMap,m.specularColorMapTransform)),f.specularIntensityMap&&(m.specularIntensityMap.value=f.specularIntensityMap,t(f.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,f){f.matcap&&(m.matcap.value=f.matcap)}function v(m,f){const E=e.get(f).light;m.referencePosition.value.setFromMatrixPosition(E.matrixWorld),m.nearDistance.value=E.shadow.camera.near,m.farDistance.value=E.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:r}}function x0(n,e,t,i){let r={},s={},a=[];const o=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(E,_){const y=_.program;i.uniformBlockBinding(E,y)}function c(E,_){let y=r[E.id];y===void 0&&(g(E),y=u(E),r[E.id]=y,E.addEventListener("dispose",m));const A=_.program;i.updateUBOMapping(E,A);const S=e.render.frame;s[E.id]!==S&&(h(E),s[E.id]=S)}function u(E){const _=d();E.__bindingPointIndex=_;const y=n.createBuffer(),A=E.__size,S=E.usage;return n.bindBuffer(n.UNIFORM_BUFFER,y),n.bufferData(n.UNIFORM_BUFFER,A,S),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,_,y),y}function d(){for(let E=0;E<o;E++)if(a.indexOf(E)===-1)return a.push(E),E;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(E){const _=r[E.id],y=E.uniforms,A=E.__cache;n.bindBuffer(n.UNIFORM_BUFFER,_);for(let S=0,w=y.length;S<w;S++){const R=Array.isArray(y[S])?y[S]:[y[S]];for(let M=0,x=R.length;M<x;M++){const I=R[M];if(p(I,S,M,A)===!0){const L=I.__offset,C=Array.isArray(I.value)?I.value:[I.value];let U=0;for(let F=0;F<C.length;F++){const z=C[F],X=v(z);typeof z=="number"||typeof z=="boolean"?(I.__data[0]=z,n.bufferSubData(n.UNIFORM_BUFFER,L+U,I.__data)):z.isMatrix3?(I.__data[0]=z.elements[0],I.__data[1]=z.elements[1],I.__data[2]=z.elements[2],I.__data[3]=0,I.__data[4]=z.elements[3],I.__data[5]=z.elements[4],I.__data[6]=z.elements[5],I.__data[7]=0,I.__data[8]=z.elements[6],I.__data[9]=z.elements[7],I.__data[10]=z.elements[8],I.__data[11]=0):(z.toArray(I.__data,U),U+=X.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,L,I.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function p(E,_,y,A){const S=E.value,w=_+"_"+y;if(A[w]===void 0)return typeof S=="number"||typeof S=="boolean"?A[w]=S:A[w]=S.clone(),!0;{const R=A[w];if(typeof S=="number"||typeof S=="boolean"){if(R!==S)return A[w]=S,!0}else if(R.equals(S)===!1)return R.copy(S),!0}return!1}function g(E){const _=E.uniforms;let y=0;const A=16;for(let w=0,R=_.length;w<R;w++){const M=Array.isArray(_[w])?_[w]:[_[w]];for(let x=0,I=M.length;x<I;x++){const L=M[x],C=Array.isArray(L.value)?L.value:[L.value];for(let U=0,F=C.length;U<F;U++){const z=C[U],X=v(z),G=y%A,$=G%X.boundary,ne=G+$;y+=$,ne!==0&&A-ne<X.storage&&(y+=A-ne),L.__data=new Float32Array(X.storage/Float32Array.BYTES_PER_ELEMENT),L.__offset=y,y+=X.storage}}}const S=y%A;return S>0&&(y+=A-S),E.__size=y,E.__cache={},this}function v(E){const _={boundary:0,storage:0};return typeof E=="number"||typeof E=="boolean"?(_.boundary=4,_.storage=4):E.isVector2?(_.boundary=8,_.storage=8):E.isVector3||E.isColor?(_.boundary=16,_.storage=12):E.isVector4?(_.boundary=16,_.storage=16):E.isMatrix3?(_.boundary=48,_.storage=48):E.isMatrix4?(_.boundary=64,_.storage=64):E.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",E),_}function m(E){const _=E.target;_.removeEventListener("dispose",m);const y=a.indexOf(_.__bindingPointIndex);a.splice(y,1),n.deleteBuffer(r[_.id]),delete r[_.id],delete s[_.id]}function f(){for(const E in r)n.deleteBuffer(r[E]);a=[],r={},s={}}return{bind:l,update:c,dispose:f}}class M0{constructor(e={}){const{canvas:t=Pf(),context:i=null,depth:r=!0,stencil:s=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:h=!1}=e;this.isWebGLRenderer=!0;let p;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=i.getContextAttributes().alpha}else p=a;const g=new Uint32Array(4),v=new Int32Array(4);let m=null,f=null;const E=[],_=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=li,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const y=this;let A=!1;this._outputColorSpace=jt;let S=0,w=0,R=null,M=-1,x=null;const I=new dt,L=new dt;let C=null;const U=new Qe(0);let F=0,z=t.width,X=t.height,G=1,$=null,ne=null;const se=new dt(0,0,z,X),Ee=new dt(0,0,z,X);let Ne=!1;const ve=new Cd;let Re=!1,j=!1;const Q=new ht,_e=new O,de=new dt,k={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ie=!1;function we(){return R===null?G:1}let D=i;function Ve(T,H){return t.getContext(T,H)}try{const T={alpha:!0,depth:r,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ll}`),t.addEventListener("webglcontextlost",fe,!1),t.addEventListener("webglcontextrestored",Ae,!1),t.addEventListener("webglcontextcreationerror",oe,!1),D===null){const H="webgl2";if(D=Ve(H,T),D===null)throw Ve(H)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(T){throw console.error("THREE.WebGLRenderer: "+T.message),T}let ae,be,me,qe,Se,Ce,Je,ct,P,b,W,K,re,Z,Ue,he,Pe,Ie,le,ye,He,Fe,xe,Ye;function B(){ae=new Lv(D),ae.init(),Fe=new f0(D,ae),be=new Ev(D,ae,e,Fe),me=new d0(D,ae),be.reversedDepthBuffer&&h&&me.buffers.depth.setReversed(!0),qe=new Uv(D),Se=new J_,Ce=new h0(D,ae,me,Se,be,Fe,qe),Je=new Tv(y),ct=new Pv(y),P=new kp(D),xe=new Sv(D,P),b=new Iv(D,P,qe,xe),W=new Fv(D,b,P,qe),le=new Nv(D,be,Ce),he=new wv(Se),K=new K_(y,Je,ct,ae,be,xe,he),re=new y0(y,Se),Z=new e0,Ue=new a0(ae),Ie=new Mv(y,Je,ct,me,W,p,l),Pe=new c0(y,W,be),Ye=new x0(D,qe,be,me),ye=new bv(D,ae,qe),He=new Dv(D,ae,qe),qe.programs=K.programs,y.capabilities=be,y.extensions=ae,y.properties=Se,y.renderLists=Z,y.shadowMap=Pe,y.state=me,y.info=qe}B();const ue=new v0(y,D);this.xr=ue,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){const T=ae.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){const T=ae.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return G},this.setPixelRatio=function(T){T!==void 0&&(G=T,this.setSize(z,X,!1))},this.getSize=function(T){return T.set(z,X)},this.setSize=function(T,H,q=!0){if(ue.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}z=T,X=H,t.width=Math.floor(T*G),t.height=Math.floor(H*G),q===!0&&(t.style.width=T+"px",t.style.height=H+"px"),this.setViewport(0,0,T,H)},this.getDrawingBufferSize=function(T){return T.set(z*G,X*G).floor()},this.setDrawingBufferSize=function(T,H,q){z=T,X=H,G=q,t.width=Math.floor(T*q),t.height=Math.floor(H*q),this.setViewport(0,0,T,H)},this.getCurrentViewport=function(T){return T.copy(I)},this.getViewport=function(T){return T.copy(se)},this.setViewport=function(T,H,q,Y){T.isVector4?se.set(T.x,T.y,T.z,T.w):se.set(T,H,q,Y),me.viewport(I.copy(se).multiplyScalar(G).round())},this.getScissor=function(T){return T.copy(Ee)},this.setScissor=function(T,H,q,Y){T.isVector4?Ee.set(T.x,T.y,T.z,T.w):Ee.set(T,H,q,Y),me.scissor(L.copy(Ee).multiplyScalar(G).round())},this.getScissorTest=function(){return Ne},this.setScissorTest=function(T){me.setScissorTest(Ne=T)},this.setOpaqueSort=function(T){$=T},this.setTransparentSort=function(T){ne=T},this.getClearColor=function(T){return T.copy(Ie.getClearColor())},this.setClearColor=function(){Ie.setClearColor(...arguments)},this.getClearAlpha=function(){return Ie.getClearAlpha()},this.setClearAlpha=function(){Ie.setClearAlpha(...arguments)},this.clear=function(T=!0,H=!0,q=!0){let Y=0;if(T){let V=!1;if(R!==null){const ce=R.texture.format;V=ce===Ol||ce===Fl||ce===Nl}if(V){const ce=R.texture.type,Me=ce===Zn||ce===Ii||ce===Yr||ce===$r||ce===Dl||ce===Ul,Le=Ie.getClearColor(),Te=Ie.getClearAlpha(),ke=Le.r,Ge=Le.g,Oe=Le.b;Me?(g[0]=ke,g[1]=Ge,g[2]=Oe,g[3]=Te,D.clearBufferuiv(D.COLOR,0,g)):(v[0]=ke,v[1]=Ge,v[2]=Oe,v[3]=Te,D.clearBufferiv(D.COLOR,0,v))}else Y|=D.COLOR_BUFFER_BIT}H&&(Y|=D.DEPTH_BUFFER_BIT),q&&(Y|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",fe,!1),t.removeEventListener("webglcontextrestored",Ae,!1),t.removeEventListener("webglcontextcreationerror",oe,!1),Ie.dispose(),Z.dispose(),Ue.dispose(),Se.dispose(),Je.dispose(),ct.dispose(),W.dispose(),xe.dispose(),Ye.dispose(),K.dispose(),ue.dispose(),ue.removeEventListener("sessionstart",wn),ue.removeEventListener("sessionend",vc),gi.stop()};function fe(T){T.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),A=!0}function Ae(){console.log("THREE.WebGLRenderer: Context Restored."),A=!1;const T=qe.autoReset,H=Pe.enabled,q=Pe.autoUpdate,Y=Pe.needsUpdate,V=Pe.type;B(),qe.autoReset=T,Pe.enabled=H,Pe.autoUpdate=q,Pe.needsUpdate=Y,Pe.type=V}function oe(T){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function ee(T){const H=T.target;H.removeEventListener("dispose",ee),De(H)}function De(T){Xe(T),Se.remove(T)}function Xe(T){const H=Se.get(T).programs;H!==void 0&&(H.forEach(function(q){K.releaseProgram(q)}),T.isShaderMaterial&&K.releaseShaderCache(T))}this.renderBufferDirect=function(T,H,q,Y,V,ce){H===null&&(H=k);const Me=V.isMesh&&V.matrixWorld.determinant()<0,Le=ph(T,H,q,Y,V);me.setMaterial(Y,Me);let Te=q.index,ke=1;if(Y.wireframe===!0){if(Te=b.getWireframeAttribute(q),Te===void 0)return;ke=2}const Ge=q.drawRange,Oe=q.attributes.position;let Ze=Ge.start*ke,rt=(Ge.start+Ge.count)*ke;ce!==null&&(Ze=Math.max(Ze,ce.start*ke),rt=Math.min(rt,(ce.start+ce.count)*ke)),Te!==null?(Ze=Math.max(Ze,0),rt=Math.min(rt,Te.count)):Oe!=null&&(Ze=Math.max(Ze,0),rt=Math.min(rt,Oe.count));const yt=rt-Ze;if(yt<0||yt===1/0)return;xe.setup(V,Y,Le,q,Te);let ft,lt=ye;if(Te!==null&&(ft=P.get(Te),lt=He,lt.setIndex(ft)),V.isMesh)Y.wireframe===!0?(me.setLineWidth(Y.wireframeLinewidth*we()),lt.setMode(D.LINES)):lt.setMode(D.TRIANGLES);else if(V.isLine){let Be=Y.linewidth;Be===void 0&&(Be=1),me.setLineWidth(Be*we()),V.isLineSegments?lt.setMode(D.LINES):V.isLineLoop?lt.setMode(D.LINE_LOOP):lt.setMode(D.LINE_STRIP)}else V.isPoints?lt.setMode(D.POINTS):V.isSprite&&lt.setMode(D.TRIANGLES);if(V.isBatchedMesh)if(V._multiDrawInstances!==null)Qr("THREE.WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),lt.renderMultiDrawInstances(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount,V._multiDrawInstances);else if(ae.get("WEBGL_multi_draw"))lt.renderMultiDraw(V._multiDrawStarts,V._multiDrawCounts,V._multiDrawCount);else{const Be=V._multiDrawStarts,gt=V._multiDrawCounts,et=V._multiDrawCount,Jt=Te?P.get(Te).bytesPerElement:1,Vi=Se.get(Y).currentProgram.getUniforms();for(let Qt=0;Qt<et;Qt++)Vi.setValue(D,"_gl_DrawID",Qt),lt.render(Be[Qt]/Jt,gt[Qt])}else if(V.isInstancedMesh)lt.renderInstances(Ze,yt,V.count);else if(q.isInstancedBufferGeometry){const Be=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,gt=Math.min(q.instanceCount,Be);lt.renderInstances(Ze,yt,gt)}else lt.render(Ze,yt)};function ut(T,H,q){T.transparent===!0&&T.side===un&&T.forceSinglePass===!1?(T.side=Kt,T.needsUpdate=!0,hs(T,H,q),T.side=fi,T.needsUpdate=!0,hs(T,H,q),T.side=un):hs(T,H,q)}this.compile=function(T,H,q=null){q===null&&(q=T),f=Ue.get(q),f.init(H),_.push(f),q.traverseVisible(function(V){V.isLight&&V.layers.test(H.layers)&&(f.pushLight(V),V.castShadow&&f.pushShadow(V))}),T!==q&&T.traverseVisible(function(V){V.isLight&&V.layers.test(H.layers)&&(f.pushLight(V),V.castShadow&&f.pushShadow(V))}),f.setupLights();const Y=new Set;return T.traverse(function(V){if(!(V.isMesh||V.isPoints||V.isLine||V.isSprite))return;const ce=V.material;if(ce)if(Array.isArray(ce))for(let Me=0;Me<ce.length;Me++){const Le=ce[Me];ut(Le,q,V),Y.add(Le)}else ut(ce,q,V),Y.add(ce)}),f=_.pop(),Y},this.compileAsync=function(T,H,q=null){const Y=this.compile(T,H,q);return new Promise(V=>{function ce(){if(Y.forEach(function(Me){Se.get(Me).currentProgram.isReady()&&Y.delete(Me)}),Y.size===0){V(T);return}setTimeout(ce,10)}ae.get("KHR_parallel_shader_compile")!==null?ce():setTimeout(ce,10)})};let nt=null;function Fn(T){nt&&nt(T)}function wn(){gi.stop()}function vc(){gi.start()}const gi=new zd;gi.setAnimationLoop(Fn),typeof self<"u"&&gi.setContext(self),this.setAnimationLoop=function(T){nt=T,ue.setAnimationLoop(T),T===null?gi.stop():gi.start()},ue.addEventListener("sessionstart",wn),ue.addEventListener("sessionend",vc),this.render=function(T,H){if(H!==void 0&&H.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;if(T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),H.parent===null&&H.matrixWorldAutoUpdate===!0&&H.updateMatrixWorld(),ue.enabled===!0&&ue.isPresenting===!0&&(ue.cameraAutoUpdate===!0&&ue.updateCamera(H),H=ue.getCamera()),T.isScene===!0&&T.onBeforeRender(y,T,H,R),f=Ue.get(T,_.length),f.init(H),_.push(f),Q.multiplyMatrices(H.projectionMatrix,H.matrixWorldInverse),ve.setFromProjectionMatrix(Q,Ln,H.reversedDepth),j=this.localClippingEnabled,Re=he.init(this.clippingPlanes,j),m=Z.get(T,E.length),m.init(),E.push(m),ue.enabled===!0&&ue.isPresenting===!0){const ce=y.xr.getDepthSensingMesh();ce!==null&&Ea(ce,H,-1/0,y.sortObjects)}Ea(T,H,0,y.sortObjects),m.finish(),y.sortObjects===!0&&m.sort($,ne),ie=ue.enabled===!1||ue.isPresenting===!1||ue.hasDepthSensing()===!1,ie&&Ie.addToRenderList(m,T),this.info.render.frame++,Re===!0&&he.beginShadows();const q=f.state.shadowsArray;Pe.render(q,T,H),Re===!0&&he.endShadows(),this.info.autoReset===!0&&this.info.reset();const Y=m.opaque,V=m.transmissive;if(f.setupLights(),H.isArrayCamera){const ce=H.cameras;if(V.length>0)for(let Me=0,Le=ce.length;Me<Le;Me++){const Te=ce[Me];yc(Y,V,T,Te)}ie&&Ie.render(T);for(let Me=0,Le=ce.length;Me<Le;Me++){const Te=ce[Me];_c(m,T,Te,Te.viewport)}}else V.length>0&&yc(Y,V,T,H),ie&&Ie.render(T),_c(m,T,H);R!==null&&w===0&&(Ce.updateMultisampleRenderTarget(R),Ce.updateRenderTargetMipmap(R)),T.isScene===!0&&T.onAfterRender(y,T,H),xe.resetDefaultState(),M=-1,x=null,_.pop(),_.length>0?(f=_[_.length-1],Re===!0&&he.setGlobalState(y.clippingPlanes,f.state.camera)):f=null,E.pop(),E.length>0?m=E[E.length-1]:m=null};function Ea(T,H,q,Y){if(T.visible===!1)return;if(T.layers.test(H.layers)){if(T.isGroup)q=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(H);else if(T.isLight)f.pushLight(T),T.castShadow&&f.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||ve.intersectsSprite(T)){Y&&de.setFromMatrixPosition(T.matrixWorld).applyMatrix4(Q);const Me=W.update(T),Le=T.material;Le.visible&&m.push(T,Me,Le,q,de.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||ve.intersectsObject(T))){const Me=W.update(T),Le=T.material;if(Y&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),de.copy(T.boundingSphere.center)):(Me.boundingSphere===null&&Me.computeBoundingSphere(),de.copy(Me.boundingSphere.center)),de.applyMatrix4(T.matrixWorld).applyMatrix4(Q)),Array.isArray(Le)){const Te=Me.groups;for(let ke=0,Ge=Te.length;ke<Ge;ke++){const Oe=Te[ke],Ze=Le[Oe.materialIndex];Ze&&Ze.visible&&m.push(T,Me,Ze,q,de.z,Oe)}}else Le.visible&&m.push(T,Me,Le,q,de.z,null)}}const ce=T.children;for(let Me=0,Le=ce.length;Me<Le;Me++)Ea(ce[Me],H,q,Y)}function _c(T,H,q,Y){const V=T.opaque,ce=T.transmissive,Me=T.transparent;f.setupLightsView(q),Re===!0&&he.setGlobalState(y.clippingPlanes,q),Y&&me.viewport(I.copy(Y)),V.length>0&&ds(V,H,q),ce.length>0&&ds(ce,H,q),Me.length>0&&ds(Me,H,q),me.buffers.depth.setTest(!0),me.buffers.depth.setMask(!0),me.buffers.color.setMask(!0),me.setPolygonOffset(!1)}function yc(T,H,q,Y){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;f.state.transmissionRenderTarget[Y.id]===void 0&&(f.state.transmissionRenderTarget[Y.id]=new Ui(1,1,{generateMipmaps:!0,type:ae.has("EXT_color_buffer_half_float")||ae.has("EXT_color_buffer_float")?ss:Zn,minFilter:Ai,samples:4,stencilBuffer:s,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:tt.workingColorSpace}));const ce=f.state.transmissionRenderTarget[Y.id],Me=Y.viewport||I;ce.setSize(Me.z*y.transmissionResolutionScale,Me.w*y.transmissionResolutionScale);const Le=y.getRenderTarget(),Te=y.getActiveCubeFace(),ke=y.getActiveMipmapLevel();y.setRenderTarget(ce),y.getClearColor(U),F=y.getClearAlpha(),F<1&&y.setClearColor(16777215,.5),y.clear(),ie&&Ie.render(q);const Ge=y.toneMapping;y.toneMapping=li;const Oe=Y.viewport;if(Y.viewport!==void 0&&(Y.viewport=void 0),f.setupLightsView(Y),Re===!0&&he.setGlobalState(y.clippingPlanes,Y),ds(T,q,Y),Ce.updateMultisampleRenderTarget(ce),Ce.updateRenderTargetMipmap(ce),ae.has("WEBGL_multisampled_render_to_texture")===!1){let Ze=!1;for(let rt=0,yt=H.length;rt<yt;rt++){const ft=H[rt],lt=ft.object,Be=ft.geometry,gt=ft.material,et=ft.group;if(gt.side===un&&lt.layers.test(Y.layers)){const Jt=gt.side;gt.side=Kt,gt.needsUpdate=!0,xc(lt,q,Y,Be,gt,et),gt.side=Jt,gt.needsUpdate=!0,Ze=!0}}Ze===!0&&(Ce.updateMultisampleRenderTarget(ce),Ce.updateRenderTargetMipmap(ce))}y.setRenderTarget(Le,Te,ke),y.setClearColor(U,F),Oe!==void 0&&(Y.viewport=Oe),y.toneMapping=Ge}function ds(T,H,q){const Y=H.isScene===!0?H.overrideMaterial:null;for(let V=0,ce=T.length;V<ce;V++){const Me=T[V],Le=Me.object,Te=Me.geometry,ke=Me.group;let Ge=Me.material;Ge.allowOverride===!0&&Y!==null&&(Ge=Y),Le.layers.test(q.layers)&&xc(Le,H,q,Te,Ge,ke)}}function xc(T,H,q,Y,V,ce){T.onBeforeRender(y,H,q,Y,V,ce),T.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),V.onBeforeRender(y,H,q,Y,T,ce),V.transparent===!0&&V.side===un&&V.forceSinglePass===!1?(V.side=Kt,V.needsUpdate=!0,y.renderBufferDirect(q,H,Y,V,T,ce),V.side=fi,V.needsUpdate=!0,y.renderBufferDirect(q,H,Y,V,T,ce),V.side=un):y.renderBufferDirect(q,H,Y,V,T,ce),T.onAfterRender(y,H,q,Y,V,ce)}function hs(T,H,q){H.isScene!==!0&&(H=k);const Y=Se.get(T),V=f.state.lights,ce=f.state.shadowsArray,Me=V.state.version,Le=K.getParameters(T,V.state,ce,H,q),Te=K.getProgramCacheKey(Le);let ke=Y.programs;Y.environment=T.isMeshStandardMaterial?H.environment:null,Y.fog=H.fog,Y.envMap=(T.isMeshStandardMaterial?ct:Je).get(T.envMap||Y.environment),Y.envMapRotation=Y.environment!==null&&T.envMap===null?H.environmentRotation:T.envMapRotation,ke===void 0&&(T.addEventListener("dispose",ee),ke=new Map,Y.programs=ke);let Ge=ke.get(Te);if(Ge!==void 0){if(Y.currentProgram===Ge&&Y.lightsStateVersion===Me)return Sc(T,Le),Ge}else Le.uniforms=K.getUniforms(T),T.onBeforeCompile(Le,y),Ge=K.acquireProgram(Le,Te),ke.set(Te,Ge),Y.uniforms=Le.uniforms;const Oe=Y.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(Oe.clippingPlanes=he.uniform),Sc(T,Le),Y.needsLights=gh(T),Y.lightsStateVersion=Me,Y.needsLights&&(Oe.ambientLightColor.value=V.state.ambient,Oe.lightProbe.value=V.state.probe,Oe.directionalLights.value=V.state.directional,Oe.directionalLightShadows.value=V.state.directionalShadow,Oe.spotLights.value=V.state.spot,Oe.spotLightShadows.value=V.state.spotShadow,Oe.rectAreaLights.value=V.state.rectArea,Oe.ltc_1.value=V.state.rectAreaLTC1,Oe.ltc_2.value=V.state.rectAreaLTC2,Oe.pointLights.value=V.state.point,Oe.pointLightShadows.value=V.state.pointShadow,Oe.hemisphereLights.value=V.state.hemi,Oe.directionalShadowMap.value=V.state.directionalShadowMap,Oe.directionalShadowMatrix.value=V.state.directionalShadowMatrix,Oe.spotShadowMap.value=V.state.spotShadowMap,Oe.spotLightMatrix.value=V.state.spotLightMatrix,Oe.spotLightMap.value=V.state.spotLightMap,Oe.pointShadowMap.value=V.state.pointShadowMap,Oe.pointShadowMatrix.value=V.state.pointShadowMatrix),Y.currentProgram=Ge,Y.uniformsList=null,Ge}function Mc(T){if(T.uniformsList===null){const H=T.currentProgram.getUniforms();T.uniformsList=Ks.seqWithValue(H.seq,T.uniforms)}return T.uniformsList}function Sc(T,H){const q=Se.get(T);q.outputColorSpace=H.outputColorSpace,q.batching=H.batching,q.batchingColor=H.batchingColor,q.instancing=H.instancing,q.instancingColor=H.instancingColor,q.instancingMorph=H.instancingMorph,q.skinning=H.skinning,q.morphTargets=H.morphTargets,q.morphNormals=H.morphNormals,q.morphColors=H.morphColors,q.morphTargetsCount=H.morphTargetsCount,q.numClippingPlanes=H.numClippingPlanes,q.numIntersection=H.numClipIntersection,q.vertexAlphas=H.vertexAlphas,q.vertexTangents=H.vertexTangents,q.toneMapping=H.toneMapping}function ph(T,H,q,Y,V){H.isScene!==!0&&(H=k),Ce.resetTextureUnits();const ce=H.fog,Me=Y.isMeshStandardMaterial?H.environment:null,Le=R===null?y.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:xr,Te=(Y.isMeshStandardMaterial?ct:Je).get(Y.envMap||Me),ke=Y.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,Ge=!!q.attributes.tangent&&(!!Y.normalMap||Y.anisotropy>0),Oe=!!q.morphAttributes.position,Ze=!!q.morphAttributes.normal,rt=!!q.morphAttributes.color;let yt=li;Y.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(yt=y.toneMapping);const ft=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,lt=ft!==void 0?ft.length:0,Be=Se.get(Y),gt=f.state.lights;if(Re===!0&&(j===!0||T!==x)){const kt=T===x&&Y.id===M;he.setState(Y,T,kt)}let et=!1;Y.version===Be.__version?(Be.needsLights&&Be.lightsStateVersion!==gt.state.version||Be.outputColorSpace!==Le||V.isBatchedMesh&&Be.batching===!1||!V.isBatchedMesh&&Be.batching===!0||V.isBatchedMesh&&Be.batchingColor===!0&&V.colorTexture===null||V.isBatchedMesh&&Be.batchingColor===!1&&V.colorTexture!==null||V.isInstancedMesh&&Be.instancing===!1||!V.isInstancedMesh&&Be.instancing===!0||V.isSkinnedMesh&&Be.skinning===!1||!V.isSkinnedMesh&&Be.skinning===!0||V.isInstancedMesh&&Be.instancingColor===!0&&V.instanceColor===null||V.isInstancedMesh&&Be.instancingColor===!1&&V.instanceColor!==null||V.isInstancedMesh&&Be.instancingMorph===!0&&V.morphTexture===null||V.isInstancedMesh&&Be.instancingMorph===!1&&V.morphTexture!==null||Be.envMap!==Te||Y.fog===!0&&Be.fog!==ce||Be.numClippingPlanes!==void 0&&(Be.numClippingPlanes!==he.numPlanes||Be.numIntersection!==he.numIntersection)||Be.vertexAlphas!==ke||Be.vertexTangents!==Ge||Be.morphTargets!==Oe||Be.morphNormals!==Ze||Be.morphColors!==rt||Be.toneMapping!==yt||Be.morphTargetsCount!==lt)&&(et=!0):(et=!0,Be.__version=Y.version);let Jt=Be.currentProgram;et===!0&&(Jt=hs(Y,H,V));let Vi=!1,Qt=!1,Ir=!1;const vt=Jt.getUniforms(),on=Be.uniforms;if(me.useProgram(Jt.program)&&(Vi=!0,Qt=!0,Ir=!0),Y.id!==M&&(M=Y.id,Qt=!0),Vi||x!==T){me.buffers.depth.getReversed()&&T.reversedDepth!==!0&&(T._reversedDepth=!0,T.updateProjectionMatrix()),vt.setValue(D,"projectionMatrix",T.projectionMatrix),vt.setValue(D,"viewMatrix",T.matrixWorldInverse);const Yt=vt.map.cameraPosition;Yt!==void 0&&Yt.setValue(D,_e.setFromMatrixPosition(T.matrixWorld)),be.logarithmicDepthBuffer&&vt.setValue(D,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(Y.isMeshPhongMaterial||Y.isMeshToonMaterial||Y.isMeshLambertMaterial||Y.isMeshBasicMaterial||Y.isMeshStandardMaterial||Y.isShaderMaterial)&&vt.setValue(D,"isOrthographic",T.isOrthographicCamera===!0),x!==T&&(x=T,Qt=!0,Ir=!0)}if(V.isSkinnedMesh){vt.setOptional(D,V,"bindMatrix"),vt.setOptional(D,V,"bindMatrixInverse");const kt=V.skeleton;kt&&(kt.boneTexture===null&&kt.computeBoneTexture(),vt.setValue(D,"boneTexture",kt.boneTexture,Ce))}V.isBatchedMesh&&(vt.setOptional(D,V,"batchingTexture"),vt.setValue(D,"batchingTexture",V._matricesTexture,Ce),vt.setOptional(D,V,"batchingIdTexture"),vt.setValue(D,"batchingIdTexture",V._indirectTexture,Ce),vt.setOptional(D,V,"batchingColorTexture"),V._colorsTexture!==null&&vt.setValue(D,"batchingColorTexture",V._colorsTexture,Ce));const ln=q.morphAttributes;if((ln.position!==void 0||ln.normal!==void 0||ln.color!==void 0)&&le.update(V,q,Jt),(Qt||Be.receiveShadow!==V.receiveShadow)&&(Be.receiveShadow=V.receiveShadow,vt.setValue(D,"receiveShadow",V.receiveShadow)),Y.isMeshGouraudMaterial&&Y.envMap!==null&&(on.envMap.value=Te,on.flipEnvMap.value=Te.isCubeTexture&&Te.isRenderTargetTexture===!1?-1:1),Y.isMeshStandardMaterial&&Y.envMap===null&&H.environment!==null&&(on.envMapIntensity.value=H.environmentIntensity),Qt&&(vt.setValue(D,"toneMappingExposure",y.toneMappingExposure),Be.needsLights&&mh(on,Ir),ce&&Y.fog===!0&&re.refreshFogUniforms(on,ce),re.refreshMaterialUniforms(on,Y,G,X,f.state.transmissionRenderTarget[T.id]),Ks.upload(D,Mc(Be),on,Ce)),Y.isShaderMaterial&&Y.uniformsNeedUpdate===!0&&(Ks.upload(D,Mc(Be),on,Ce),Y.uniformsNeedUpdate=!1),Y.isSpriteMaterial&&vt.setValue(D,"center",V.center),vt.setValue(D,"modelViewMatrix",V.modelViewMatrix),vt.setValue(D,"normalMatrix",V.normalMatrix),vt.setValue(D,"modelMatrix",V.matrixWorld),Y.isShaderMaterial||Y.isRawShaderMaterial){const kt=Y.uniformsGroups;for(let Yt=0,wa=kt.length;Yt<wa;Yt++){const vi=kt[Yt];Ye.update(vi,Jt),Ye.bind(vi,Jt)}}return Jt}function mh(T,H){T.ambientLightColor.needsUpdate=H,T.lightProbe.needsUpdate=H,T.directionalLights.needsUpdate=H,T.directionalLightShadows.needsUpdate=H,T.pointLights.needsUpdate=H,T.pointLightShadows.needsUpdate=H,T.spotLights.needsUpdate=H,T.spotLightShadows.needsUpdate=H,T.rectAreaLights.needsUpdate=H,T.hemisphereLights.needsUpdate=H}function gh(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return S},this.getActiveMipmapLevel=function(){return w},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(T,H,q){const Y=Se.get(T);Y.__autoAllocateDepthBuffer=T.resolveDepthBuffer===!1,Y.__autoAllocateDepthBuffer===!1&&(Y.__useRenderToTexture=!1),Se.get(T.texture).__webglTexture=H,Se.get(T.depthTexture).__webglTexture=Y.__autoAllocateDepthBuffer?void 0:q,Y.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(T,H){const q=Se.get(T);q.__webglFramebuffer=H,q.__useDefaultFramebuffer=H===void 0};const vh=D.createFramebuffer();this.setRenderTarget=function(T,H=0,q=0){R=T,S=H,w=q;let Y=!0,V=null,ce=!1,Me=!1;if(T){const Te=Se.get(T);if(Te.__useDefaultFramebuffer!==void 0)me.bindFramebuffer(D.FRAMEBUFFER,null),Y=!1;else if(Te.__webglFramebuffer===void 0)Ce.setupRenderTarget(T);else if(Te.__hasExternalTextures)Ce.rebindTextures(T,Se.get(T.texture).__webglTexture,Se.get(T.depthTexture).__webglTexture);else if(T.depthBuffer){const Oe=T.depthTexture;if(Te.__boundDepthTexture!==Oe){if(Oe!==null&&Se.has(Oe)&&(T.width!==Oe.image.width||T.height!==Oe.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Ce.setupDepthRenderbuffer(T)}}const ke=T.texture;(ke.isData3DTexture||ke.isDataArrayTexture||ke.isCompressedArrayTexture)&&(Me=!0);const Ge=Se.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(Ge[H])?V=Ge[H][q]:V=Ge[H],ce=!0):T.samples>0&&Ce.useMultisampledRTT(T)===!1?V=Se.get(T).__webglMultisampledFramebuffer:Array.isArray(Ge)?V=Ge[q]:V=Ge,I.copy(T.viewport),L.copy(T.scissor),C=T.scissorTest}else I.copy(se).multiplyScalar(G).floor(),L.copy(Ee).multiplyScalar(G).floor(),C=Ne;if(q!==0&&(V=vh),me.bindFramebuffer(D.FRAMEBUFFER,V)&&Y&&me.drawBuffers(T,V),me.viewport(I),me.scissor(L),me.setScissorTest(C),ce){const Te=Se.get(T.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+H,Te.__webglTexture,q)}else if(Me){const Te=H;for(let ke=0;ke<T.textures.length;ke++){const Ge=Se.get(T.textures[ke]);D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0+ke,Ge.__webglTexture,q,Te)}}else if(T!==null&&q!==0){const Te=Se.get(T.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,Te.__webglTexture,q)}M=-1},this.readRenderTargetPixels=function(T,H,q,Y,V,ce,Me,Le=0){if(!(T&&T.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Te=Se.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Me!==void 0&&(Te=Te[Me]),Te){me.bindFramebuffer(D.FRAMEBUFFER,Te);try{const ke=T.textures[Le],Ge=ke.format,Oe=ke.type;if(!be.textureFormatReadable(Ge)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!be.textureTypeReadable(Oe)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}H>=0&&H<=T.width-Y&&q>=0&&q<=T.height-V&&(T.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+Le),D.readPixels(H,q,Y,V,Fe.convert(Ge),Fe.convert(Oe),ce))}finally{const ke=R!==null?Se.get(R).__webglFramebuffer:null;me.bindFramebuffer(D.FRAMEBUFFER,ke)}}},this.readRenderTargetPixelsAsync=async function(T,H,q,Y,V,ce,Me,Le=0){if(!(T&&T.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Te=Se.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&Me!==void 0&&(Te=Te[Me]),Te)if(H>=0&&H<=T.width-Y&&q>=0&&q<=T.height-V){me.bindFramebuffer(D.FRAMEBUFFER,Te);const ke=T.textures[Le],Ge=ke.format,Oe=ke.type;if(!be.textureFormatReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!be.textureTypeReadable(Oe))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Ze=D.createBuffer();D.bindBuffer(D.PIXEL_PACK_BUFFER,Ze),D.bufferData(D.PIXEL_PACK_BUFFER,ce.byteLength,D.STREAM_READ),T.textures.length>1&&D.readBuffer(D.COLOR_ATTACHMENT0+Le),D.readPixels(H,q,Y,V,Fe.convert(Ge),Fe.convert(Oe),0);const rt=R!==null?Se.get(R).__webglFramebuffer:null;me.bindFramebuffer(D.FRAMEBUFFER,rt);const yt=D.fenceSync(D.SYNC_GPU_COMMANDS_COMPLETE,0);return D.flush(),await Lf(D,yt,4),D.bindBuffer(D.PIXEL_PACK_BUFFER,Ze),D.getBufferSubData(D.PIXEL_PACK_BUFFER,0,ce),D.deleteBuffer(Ze),D.deleteSync(yt),ce}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(T,H=null,q=0){const Y=Math.pow(2,-q),V=Math.floor(T.image.width*Y),ce=Math.floor(T.image.height*Y),Me=H!==null?H.x:0,Le=H!==null?H.y:0;Ce.setTexture2D(T,0),D.copyTexSubImage2D(D.TEXTURE_2D,q,0,0,Me,Le,V,ce),me.unbindTexture()};const _h=D.createFramebuffer(),yh=D.createFramebuffer();this.copyTextureToTexture=function(T,H,q=null,Y=null,V=0,ce=null){ce===null&&(V!==0?(Qr("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),ce=V,V=0):ce=0);let Me,Le,Te,ke,Ge,Oe,Ze,rt,yt;const ft=T.isCompressedTexture?T.mipmaps[ce]:T.image;if(q!==null)Me=q.max.x-q.min.x,Le=q.max.y-q.min.y,Te=q.isBox3?q.max.z-q.min.z:1,ke=q.min.x,Ge=q.min.y,Oe=q.isBox3?q.min.z:0;else{const ln=Math.pow(2,-V);Me=Math.floor(ft.width*ln),Le=Math.floor(ft.height*ln),T.isDataArrayTexture?Te=ft.depth:T.isData3DTexture?Te=Math.floor(ft.depth*ln):Te=1,ke=0,Ge=0,Oe=0}Y!==null?(Ze=Y.x,rt=Y.y,yt=Y.z):(Ze=0,rt=0,yt=0);const lt=Fe.convert(H.format),Be=Fe.convert(H.type);let gt;H.isData3DTexture?(Ce.setTexture3D(H,0),gt=D.TEXTURE_3D):H.isDataArrayTexture||H.isCompressedArrayTexture?(Ce.setTexture2DArray(H,0),gt=D.TEXTURE_2D_ARRAY):(Ce.setTexture2D(H,0),gt=D.TEXTURE_2D),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,H.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,H.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,H.unpackAlignment);const et=D.getParameter(D.UNPACK_ROW_LENGTH),Jt=D.getParameter(D.UNPACK_IMAGE_HEIGHT),Vi=D.getParameter(D.UNPACK_SKIP_PIXELS),Qt=D.getParameter(D.UNPACK_SKIP_ROWS),Ir=D.getParameter(D.UNPACK_SKIP_IMAGES);D.pixelStorei(D.UNPACK_ROW_LENGTH,ft.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,ft.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,ke),D.pixelStorei(D.UNPACK_SKIP_ROWS,Ge),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Oe);const vt=T.isDataArrayTexture||T.isData3DTexture,on=H.isDataArrayTexture||H.isData3DTexture;if(T.isDepthTexture){const ln=Se.get(T),kt=Se.get(H),Yt=Se.get(ln.__renderTarget),wa=Se.get(kt.__renderTarget);me.bindFramebuffer(D.READ_FRAMEBUFFER,Yt.__webglFramebuffer),me.bindFramebuffer(D.DRAW_FRAMEBUFFER,wa.__webglFramebuffer);for(let vi=0;vi<Te;vi++)vt&&(D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Se.get(T).__webglTexture,V,Oe+vi),D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,Se.get(H).__webglTexture,ce,yt+vi)),D.blitFramebuffer(ke,Ge,Me,Le,Ze,rt,Me,Le,D.DEPTH_BUFFER_BIT,D.NEAREST);me.bindFramebuffer(D.READ_FRAMEBUFFER,null),me.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else if(V!==0||T.isRenderTargetTexture||Se.has(T)){const ln=Se.get(T),kt=Se.get(H);me.bindFramebuffer(D.READ_FRAMEBUFFER,_h),me.bindFramebuffer(D.DRAW_FRAMEBUFFER,yh);for(let Yt=0;Yt<Te;Yt++)vt?D.framebufferTextureLayer(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,ln.__webglTexture,V,Oe+Yt):D.framebufferTexture2D(D.READ_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,ln.__webglTexture,V),on?D.framebufferTextureLayer(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,kt.__webglTexture,ce,yt+Yt):D.framebufferTexture2D(D.DRAW_FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_2D,kt.__webglTexture,ce),V!==0?D.blitFramebuffer(ke,Ge,Me,Le,Ze,rt,Me,Le,D.COLOR_BUFFER_BIT,D.NEAREST):on?D.copyTexSubImage3D(gt,ce,Ze,rt,yt+Yt,ke,Ge,Me,Le):D.copyTexSubImage2D(gt,ce,Ze,rt,ke,Ge,Me,Le);me.bindFramebuffer(D.READ_FRAMEBUFFER,null),me.bindFramebuffer(D.DRAW_FRAMEBUFFER,null)}else on?T.isDataTexture||T.isData3DTexture?D.texSubImage3D(gt,ce,Ze,rt,yt,Me,Le,Te,lt,Be,ft.data):H.isCompressedArrayTexture?D.compressedTexSubImage3D(gt,ce,Ze,rt,yt,Me,Le,Te,lt,ft.data):D.texSubImage3D(gt,ce,Ze,rt,yt,Me,Le,Te,lt,Be,ft):T.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,ce,Ze,rt,Me,Le,lt,Be,ft.data):T.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,ce,Ze,rt,ft.width,ft.height,lt,ft.data):D.texSubImage2D(D.TEXTURE_2D,ce,Ze,rt,Me,Le,lt,Be,ft);D.pixelStorei(D.UNPACK_ROW_LENGTH,et),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,Jt),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Vi),D.pixelStorei(D.UNPACK_SKIP_ROWS,Qt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,Ir),ce===0&&H.generateMipmaps&&D.generateMipmap(gt),me.unbindTexture()},this.initRenderTarget=function(T){Se.get(T).__webglFramebuffer===void 0&&Ce.setupRenderTarget(T)},this.initTexture=function(T){T.isCubeTexture?Ce.setTextureCube(T,0):T.isData3DTexture?Ce.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?Ce.setTexture2DArray(T,0):Ce.setTexture2D(T,0),me.unbindTexture()},this.resetState=function(){S=0,w=0,R=null,me.reset(),xe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Ln}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=tt._getDrawingBufferColorSpace(e),t.unpackColorSpace=tt._getUnpackColorSpace()}}const Lu={type:"change"},Xl={type:"start"},Wd={type:"end"},Gs=new pa,Iu=new si,S0=Math.cos(70*dr.DEG2RAD),wt=new O,$t=2*Math.PI,at={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},co=1e-6;class b0 extends Bp{constructor(e,t=null){super(e,t),this.state=at.NONE,this.target=new O,this.cursor=new O,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:xn.ROTATE,MIDDLE:xn.DOLLY,RIGHT:xn.PAN},this.touches={ONE:Pn.ROTATE,TWO:Pn.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new O,this._lastQuaternion=new Di,this._lastTargetPosition=new O,this._quat=new Di().setFromUnitVectors(e.up,new O(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new ru,this._sphericalDelta=new ru,this._scale=1,this._panOffset=new O,this._rotateStart=new ze,this._rotateEnd=new ze,this._rotateDelta=new ze,this._panStart=new ze,this._panEnd=new ze,this._panDelta=new ze,this._dollyStart=new ze,this._dollyEnd=new ze,this._dollyDelta=new ze,this._dollyDirection=new O,this._mouse=new ze,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=w0.bind(this),this._onPointerDown=E0.bind(this),this._onPointerUp=T0.bind(this),this._onContextMenu=D0.bind(this),this._onMouseWheel=C0.bind(this),this._onKeyDown=P0.bind(this),this._onTouchStart=L0.bind(this),this._onTouchMove=I0.bind(this),this._onMouseDown=A0.bind(this),this._onMouseMove=R0.bind(this),this._interceptControlDown=U0.bind(this),this._interceptControlUp=N0.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Lu),this.update(),this.state=at.NONE}update(e=null){const t=this.object.position;wt.copy(t).sub(this.target),wt.applyQuaternion(this._quat),this._spherical.setFromVector3(wt),this.autoRotate&&this.state===at.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,r=this.maxAzimuthAngle;isFinite(i)&&isFinite(r)&&(i<-Math.PI?i+=$t:i>Math.PI&&(i-=$t),r<-Math.PI?r+=$t:r>Math.PI&&(r-=$t),i<=r?this._spherical.theta=Math.max(i,Math.min(r,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+r)/2?Math.max(i,this._spherical.theta):Math.min(r,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let s=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const a=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),s=a!=this._spherical.radius}if(wt.setFromSpherical(this._spherical),wt.applyQuaternion(this._quatInverse),t.copy(this.target).add(wt),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let a=null;if(this.object.isPerspectiveCamera){const o=wt.length();a=this._clampDistance(o*this._scale);const l=o-a;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),s=!!l}else if(this.object.isOrthographicCamera){const o=new O(this._mouse.x,this._mouse.y,0);o.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),s=l!==this.object.zoom;const c=new O(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(o),this.object.updateMatrixWorld(),a=wt.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;a!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(a).add(this.object.position):(Gs.origin.copy(this.object.position),Gs.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Gs.direction))<S0?this.object.lookAt(this.target):(Iu.setFromNormalAndCoplanarPoint(this.object.up,this.target),Gs.intersectPlane(Iu,this.target))))}else if(this.object.isOrthographicCamera){const a=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),a!==this.object.zoom&&(this.object.updateProjectionMatrix(),s=!0)}return this._scale=1,this._performCursorZoom=!1,s||this._lastPosition.distanceToSquared(this.object.position)>co||8*(1-this._lastQuaternion.dot(this.object.quaternion))>co||this._lastTargetPosition.distanceToSquared(this.target)>co?(this.dispatchEvent(Lu),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?$t/60*this.autoRotateSpeed*e:$t/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){wt.setFromMatrixColumn(t,0),wt.multiplyScalar(-e),this._panOffset.add(wt)}_panUp(e,t){this.screenSpacePanning===!0?wt.setFromMatrixColumn(t,1):(wt.setFromMatrixColumn(t,0),wt.crossVectors(this.object.up,wt)),wt.multiplyScalar(e),this._panOffset.add(wt)}_pan(e,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const r=this.object.position;wt.copy(r).sub(this.target);let s=wt.length();s*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*s/i.clientHeight,this.object.matrix),this._panUp(2*t*s/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),r=e-i.left,s=t-i.top,a=i.width,o=i.height;this._mouse.x=r/a*2-1,this._mouse.y=-(s/o)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft($t*this._rotateDelta.x/t.clientHeight),this._rotateUp($t*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp($t*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-$t*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft($t*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-$t*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._rotateStart.set(i,r)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panStart.set(i,r)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,s=Math.sqrt(i*i+r*r);this._dollyStart.set(0,s)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const i=this._getSecondPointerPosition(e),r=.5*(e.pageX+i.x),s=.5*(e.pageY+i.y);this._rotateEnd.set(r,s)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft($t*this._rotateDelta.x/t.clientHeight),this._rotateUp($t*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);this._panEnd.set(i,r)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,r=e.pageY-t.y,s=Math.sqrt(i*i+r*r);this._dollyEnd.set(0,s),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const a=(e.pageX+t.x)*.5,o=(e.pageY+t.y)*.5;this._updateZoomParameters(a,o)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new ze,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function E0(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n)))}function w0(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function T0(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(Wd),this.state=at.NONE;break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function A0(n){let e;switch(n.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case xn.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=at.DOLLY;break;case xn.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=at.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=at.ROTATE}break;case xn.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=at.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=at.PAN}break;default:this.state=at.NONE}this.state!==at.NONE&&this.dispatchEvent(Xl)}function R0(n){switch(this.state){case at.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case at.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case at.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function C0(n){this.enabled===!1||this.enableZoom===!1||this.state!==at.NONE||(n.preventDefault(),this.dispatchEvent(Xl),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(Wd))}function P0(n){this.enabled!==!1&&this._handleKeyDown(n)}function L0(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case Pn.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=at.TOUCH_ROTATE;break;case Pn.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=at.TOUCH_PAN;break;default:this.state=at.NONE}break;case 2:switch(this.touches.TWO){case Pn.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=at.TOUCH_DOLLY_PAN;break;case Pn.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=at.TOUCH_DOLLY_ROTATE;break;default:this.state=at.NONE}break;default:this.state=at.NONE}this.state!==at.NONE&&this.dispatchEvent(Xl)}function I0(n){switch(this._trackPointer(n),this.state){case at.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case at.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case at.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case at.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=at.NONE}}function D0(n){this.enabled!==!1&&n.preventDefault()}function U0(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function N0(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const ls=["ch01","ch02","ch03","ch04","ex-marseille","ex-valmy","delivery-ch01","delivery-ch02","delivery-ch03","delivery-ch04","delivery-ch05","delivery-ch06","delivery-ch07","delivery-ch08"],Du="fr1789:terrain-b:state:v1",Uu={language:"zh",volume:1,muted:!1};function br(n){if(!ls.includes(n))throw new Error("Unknown content ID")}function St(n){function e(t,i){if(i>40)throw new Error("State nesting is too deep");if(!(t===null||typeof t=="string"||typeof t=="boolean")&&!(typeof t=="number"&&Number.isFinite(t))){if(Array.isArray(t)){t.forEach(r=>e(r,i+1));return}if(t&&typeof t=="object"&&(Object.getPrototypeOf(t)===Object.prototype||Object.getPrototypeOf(t)===null)){for(const[r,s]of Object.entries(t)){if(["__proto__","prototype","constructor"].includes(r))throw new Error("Unsafe state key");e(s,i+1)}return}throw new Error("State must contain only JSON values")}}if(!n||typeof n!="object"||Array.isArray(n))throw new Error("State must be a record");return e(n,0),JSON.parse(JSON.stringify(n))}function fl(n,e){St(e);for(const i of Object.keys(e))if(!["language","volume","muted"].includes(i))throw new Error("Unknown settings field");const t={...n,...e};if(!da(t.language)||!Number.isFinite(t.volume)||t.volume<0||t.volume>1||typeof t.muted!="boolean")throw new Error("Invalid settings");return t}function Nu(n){let e=n?"persistent":"session",t={...Uu},i={},r=null;if(n){let a=null;try{a=n.getItem(Du)}catch{e="session"}if(a)try{const o=St(JSON.parse(a));if(o.apiVersion!=="fr1789-state/1")throw new Error("Unsupported state version");const l=o.settings;if(!l||Object.keys(l).length!==3)throw new Error("Incomplete settings");const c=fl(Uu,l),u=St(o.chapterProgress),d={};for(const[p,g]of Object.entries(u))br(p),d[p]=St(g);const h=o.map===null?null:St(o.map);t=c,i=d,r=h}catch{}}function s(){if(e==="persistent"&&n)try{n.setItem(Du,JSON.stringify({apiVersion:"fr1789-state/1",settings:t,chapterProgress:i,map:r}))}catch{e="session"}}return{apiVersion:"fr1789-state/1",get mode(){return e},settings:{read:()=>({...t}),update(a){t=fl(t,a),s()}},chapter(a){return br(a),{read:()=>i[a]?St(i[a]):null,checkpoint(o){i[a]={...i[a],...St(o)},s()},reset(){delete i[a],s()}}},map:{read:()=>r?St(r):null,write(a){r=St(a),s()}}}}const cs=Object.freeze(Object.fromEntries(ls.map(n=>[n,Object.freeze({status:"missing",manifest:`chapters/${n}/chapter.json`})])));function Js(n){if(typeof n!="string"||!n||n.trim()!==n)throw new Error("Resource path must be relative");let e=n;for(let t=0;t<8;t++){if(/[\\:\u0000-\u0020\u007f?#]/.test(e)||/%(?:2f|5c)/i.test(e)||e.startsWith("/")||e.split("/").some(r=>!r||r==="."||r===".."))throw new Error("Unsafe resource path");let i;try{i=decodeURIComponent(e)}catch{throw new Error("Malformed resource path")}if(i===e)return n;e=i}throw new Error("Excessively encoded resource path")}function F0(n){if(!n||typeof n!="object")throw new Error("Invalid entry target");if(n.kind==="city"){if(br(n.chapterId),!["paris","versailles"].includes(n.regionId))throw new Error("Invalid city");return{kind:"city",regionId:n.regionId,chapterId:n.chapterId}}if(n.kind==="chapter"){if(br(n.contentId),!["start","continue","restart"].includes(n.action))throw new Error("Invalid entry action");return{kind:"chapter",contentId:n.contentId,action:n.action}}throw new Error("Invalid entry kind")}function O0(){return new DOMException("Entry was cancelled","AbortError")}function B0(n,e,t){let i=!1,r,s;const a=new Map;t&&a.set(t,null);const o=()=>{if(e.aborted)throw O0()};return{view:{apiVersion:"fr1789-state/1",get mode(){return n.mode},settings:{read:()=>({...r??n.settings.read()}),update(c){o(),i?n.settings.update(c):r=fl(r??n.settings.read(),c)}},chapter(c){br(c);const u=n.chapter(c);return{read(){const d=a.has(c)?a.get(c):u.read();return d===null?null:St(d)},checkpoint(d){o();const h=St(d);i?u.checkpoint(h):a.set(c,{...this.read(),...h})},reset(){o(),i?u.reset():a.set(c,null)}}},map:{read:()=>s?St(s):n.map.read(),write(c){o(),i?n.map.write(c):s=St(c)}}},commit(){if(o(),!i){r&&n.settings.update(r),s&&n.map.write(s);for(const[c,u]of a)n.chapter(c).reset(),u&&n.chapter(c).checkpoint(u);a.clear(),r=void 0,s=void 0,i=!0}}}}function z0(n){if(n.store.apiVersion!=="fr1789-state/1")throw new Error("Unsupported state adapter");let e,t,i,r,s=!1,a=!1,o=0;const l=new Set;let c="overview";const u=new WeakSet,d=S=>n.resolver(Js(S));function h(S){if(!(!S||u.has(S))){u.add(S);try{S.pause()}catch(w){console.error("Surface pause failed",w)}try{S.dispose()}catch(w){console.error("Surface dispose failed",w)}}}function p(S){const w={...S,target:{...S.target}};return queueMicrotask(()=>{try{n.onResult?.(w)}catch(R){console.error("Host result observer failed",R)}}),S}function g(S,w,R){S.settled||(S.settled=!0,S.resolve(p({status:w,requestId:S.id,target:{...S.target},...R?{message:R}:{}})))}function v(){s||(t?(n.map.show(!1),a||t.session.resume()):(r&&(n.map.restore(St(r)),r=void 0),n.map.show(!0),a||n.map.resume()))}function m(S){const w=i;w&&(i=void 0,w.controller.abort(),h(w.session),c=s?"disposed":t?"entered":"overview",S&&v(),g(w,"cancelled"))}const f=S=>!s&&!S.controller.signal.aborted&&i===S;function E(S){return a?new Promise(w=>{const R=()=>{l.delete(R),S.controller.signal.removeEventListener("abort",R),w()};l.add(R),S.controller.signal.addEventListener("abort",R,{once:!0}),S.controller.signal.aborted&&R()}):Promise.resolve()}async function _(S,w,R,M){const x=B0(n.store,S.controller.signal,S.target.kind==="chapter"&&S.target.action==="restart"&&R.restartMode?.[S.target.contentId]!=="surface"?S.target.contentId:void 0);try{let I;if(M){const C=Js(M),U=R.loadManifest?await R.loadManifest(C,S.controller.signal):await(async()=>{const F=await fetch(d(C),{signal:S.controller.signal});if(!F.ok)throw new Error(`Chapter manifest HTTP ${F.status}`);return F.json()})();if(!f(S))return;if(I=St(U),S.target.kind!=="chapter"||I.id!==S.target.contentId||typeof I.entryNodeId!="string"||!I.entryNodeId.trim())throw new Error("Invalid chapter manifest ID or entryNodeId")}if(!f(S))return;const L={signal:S.controller.signal,store:x.view,resolver:d,root:n.root,manifest:I,returnToOverview:()=>{S.controller.signal.aborted||A()},enter:C=>S.controller.signal.aborted?Promise.resolve({status:"cancelled",requestId:S.id,target:C}):y(C)};if(S.session=await w({...S.target},L),!S.session||["activate","pause","resume","dispose"].some(C=>typeof S.session[C]!="function"))throw new Error("Invalid surface session");if(!f(S)){h(S.session);return}if(await E(S),!f(S))return;if(S.activationStarted=!0,await S.session.activate(),!f(S)){h(S.session);return}if(a&&(S.session.pause(),S.activationPaused=!0),S.activationPaused){if(await E(S),!f(S))return;S.activationPaused&&(S.session.resume(),S.activationPaused=!1)}x.commit(),t&&(t.controller.abort(),h(t.session)),t=S,i=void 0,c="entered",g(S,"entered")}catch(I){if(h(S.session),!f(S))return;i=void 0,S.controller.abort(),c="load-error",v(),g(S,"load-error",I instanceof Error?I.message:String(I))}}function y(S){let w;try{w=F0(S)}catch(z){return Promise.resolve(p({status:"load-error",requestId:++o,target:S,message:String(z)}))}if(s)return Promise.resolve({status:"cancelled",requestId:++o,target:w});const R=JSON.stringify(w);if(i?.key===R)return i.promise;if(m(!0),t?.key===R&&!(w.kind==="chapter"&&w.action==="restart"))return c="entered",Promise.resolve(p({status:"entered",requestId:t.id,target:w}));const M=e,x=w.kind==="city"?M?.city:M?.chapter,I=w.kind==="chapter"?(M?.catalog??cs)[w.contentId]:void 0,L=w.kind==="chapter"&&I?.status!=="available"?"missing-content":x?void 0:"no-host";if(L)return c=L,Promise.resolve(p({status:L,requestId:++o,target:w}));let C;const U=new Promise(z=>{C=z}),F={id:++o,target:w,key:R,controller:new AbortController,promise:U,resolve:C,settled:!1};i=F,c="loading";try{r||(r=St(n.map.capture())),n.map.pause(),t?.session?.pause(),n.map.show(!1),_(F,x,M,I?.manifest)}catch(z){i=void 0,F.controller.abort(),c="load-error",v(),g(F,"load-error",String(z))}return U}function A(){s||(m(!1),t&&(t.controller.abort(),h(t.session),t=void 0),r&&(n.map.restore(St(r)),r=void 0,n.map.show(!0),a||n.map.resume()),c="overview")}return{apiVersion:"fr1789-host/1",connect(S){if(!S||S.apiVersion!=="fr1789-host/1"||S.city!==void 0&&typeof S.city!="function"||S.chapter!==void 0&&typeof S.chapter!="function")throw new Error("Unsupported host services");if(S.catalog)for(const w of ls){const R=S.catalog[w];if(!R||!["missing","available"].includes(R.status))throw new Error("Invalid content catalog");Js(R.manifest)}if(S.restartMode){for(const[w,R]of Object.entries(S.restartMode))if(br(w),!["chapter","surface"].includes(R))throw new Error("Invalid restart mode")}m(!0),e={...S,...S.restartMode?{restartMode:{...S.restartMode}}:{},...S.catalog?{catalog:JSON.parse(JSON.stringify(S.catalog))}:{}}},enter:y,returnToOverview:A,pause(){s||a||(a=!0,n.map.pause(),t?.session?.pause(),i?.session&&(i.session.pause(),i.activationStarted&&(i.activationPaused=!0)))},resume(){if(!(s||!a))if(a=!1,i){i.activationStarted&&i.session&&(i.session.resume(),i.activationPaused=!1);for(const S of[...l])S()}else t?t.session.resume():n.map.resume()},dispose(){s||(s=!0,m(!1),t&&(t.controller.abort(),h(t.session),t=void 0),n.map.pause(),r=void 0,c="disposed")},snapshot(){return{apiVersion:"fr1789-host/1",status:c,current:t?{...t.target}:null,pending:i?{...i.target}:null,requestId:i?.id??t?.id??o,disposed:s,suspended:a,scene:t?.session?.snapshot?St(t.session.snapshot()):null}}}}const ia=window.fr1789Bootstrap;function k0(){try{return Nu(localStorage)}catch{return Nu()}}const mt=ia?.store??k0();if(mt.apiVersion!=="fr1789-state/1")throw Error("Unsupported shared state adapter");const Xd=ia?.services;function Nn(n){const e=Js(n);return ia?.resolver?ia.resolver(e):new URL("./"+e,location.href).href}const Fu=new Jn,Ws=new O;class ra extends Dp{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],i=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(i),this.setAttribute("position",new bt(e,3)),this.setAttribute("uv",new bt(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,i=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),i.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const i=new ul(t,6,1);return this.setAttribute("instanceStart",new In(i,3,0)),this.setAttribute("instanceEnd",new In(i,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const i=new ul(t,6,1);return this.setAttribute("instanceColorStart",new In(i,3,0)),this.setAttribute("instanceColorEnd",new In(i,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Ap(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Jn);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Fu.setFromBufferAttribute(t),this.boundingBox.union(Fu))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new zi),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const i=this.boundingSphere.center;this.boundingBox.getCenter(i);let r=0;for(let s=0,a=e.count;s<a;s++)Ws.fromBufferAttribute(e,s),r=Math.max(r,i.distanceToSquared(Ws)),Ws.fromBufferAttribute(t,s),r=Math.max(r,i.distanceToSquared(Ws));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}pe.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new ze(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Zt.line={uniforms:Hl.merge([pe.common,pe.fog,pe.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class ql extends an{constructor(e){super({type:"LineMaterial",uniforms:Hl.clone(Zt.line.uniforms),vertexShader:Zt.line.vertexShader,fragmentShader:Zt.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}const uo=new dt,Ou=new O,Bu=new O,Dt=new dt,Ut=new dt,Tn=new dt,ho=new O,fo=new ht,Nt=new Op,zu=new O,Xs=new Jn,qs=new zi,An=new dt;let Cn,Ci;function ku(n,e,t){return An.set(0,0,-e,1).applyMatrix4(n.projectionMatrix),An.multiplyScalar(1/An.w),An.x=Ci/t.width,An.y=Ci/t.height,An.applyMatrix4(n.projectionMatrixInverse),An.multiplyScalar(1/An.w),Math.abs(Math.max(An.x,An.y))}function H0(n,e){const t=n.matrixWorld,i=n.geometry,r=i.attributes.instanceStart,s=i.attributes.instanceEnd,a=Math.min(i.instanceCount,r.count);for(let o=0,l=a;o<l;o++){Nt.start.fromBufferAttribute(r,o),Nt.end.fromBufferAttribute(s,o),Nt.applyMatrix4(t);const c=new O,u=new O;Cn.distanceSqToSegment(Nt.start,Nt.end,u,c),u.distanceTo(c)<Ci*.5&&e.push({point:u,pointOnLine:c,distance:Cn.origin.distanceTo(u),object:n,face:null,faceIndex:o,uv:null,uv1:null})}}function V0(n,e,t){const i=e.projectionMatrix,s=n.material.resolution,a=n.matrixWorld,o=n.geometry,l=o.attributes.instanceStart,c=o.attributes.instanceEnd,u=Math.min(o.instanceCount,l.count),d=-e.near;Cn.at(1,Tn),Tn.w=1,Tn.applyMatrix4(e.matrixWorldInverse),Tn.applyMatrix4(i),Tn.multiplyScalar(1/Tn.w),Tn.x*=s.x/2,Tn.y*=s.y/2,Tn.z=0,ho.copy(Tn),fo.multiplyMatrices(e.matrixWorldInverse,a);for(let h=0,p=u;h<p;h++){if(Dt.fromBufferAttribute(l,h),Ut.fromBufferAttribute(c,h),Dt.w=1,Ut.w=1,Dt.applyMatrix4(fo),Ut.applyMatrix4(fo),Dt.z>d&&Ut.z>d)continue;if(Dt.z>d){const _=Dt.z-Ut.z,y=(Dt.z-d)/_;Dt.lerp(Ut,y)}else if(Ut.z>d){const _=Ut.z-Dt.z,y=(Ut.z-d)/_;Ut.lerp(Dt,y)}Dt.applyMatrix4(i),Ut.applyMatrix4(i),Dt.multiplyScalar(1/Dt.w),Ut.multiplyScalar(1/Ut.w),Dt.x*=s.x/2,Dt.y*=s.y/2,Ut.x*=s.x/2,Ut.y*=s.y/2,Nt.start.copy(Dt),Nt.start.z=0,Nt.end.copy(Ut),Nt.end.z=0;const v=Nt.closestPointToPointParameter(ho,!0);Nt.at(v,zu);const m=dr.lerp(Dt.z,Ut.z,v),f=m>=-1&&m<=1,E=ho.distanceTo(zu)<Ci*.5;if(f&&E){Nt.start.fromBufferAttribute(l,h),Nt.end.fromBufferAttribute(c,h),Nt.start.applyMatrix4(a),Nt.end.applyMatrix4(a);const _=new O,y=new O;Cn.distanceSqToSegment(Nt.start,Nt.end,y,_),t.push({point:y,pointOnLine:_,distance:Cn.origin.distanceTo(y),object:n,face:null,faceIndex:h,uv:null,uv1:null})}}}class qd extends It{constructor(e=new ra,t=new ql({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,i=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let a=0,o=0,l=t.count;a<l;a++,o+=2)Ou.fromBufferAttribute(t,a),Bu.fromBufferAttribute(i,a),r[o]=o===0?0:r[o-1],r[o+1]=r[o]+Ou.distanceTo(Bu);const s=new ul(r,2,1);return e.setAttribute("instanceDistanceStart",new In(s,1,0)),e.setAttribute("instanceDistanceEnd",new In(s,1,1)),this}raycast(e,t){const i=this.material.worldUnits,r=e.camera;r===null&&!i&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const s=e.params.Line2!==void 0&&e.params.Line2.threshold||0;Cn=e.ray;const a=this.matrixWorld,o=this.geometry,l=this.material;Ci=l.linewidth+s,o.boundingSphere===null&&o.computeBoundingSphere(),qs.copy(o.boundingSphere).applyMatrix4(a);let c;if(i)c=Ci*.5;else{const d=Math.max(r.near,qs.distanceToPoint(Cn.origin));c=ku(r,d,l.resolution)}if(qs.radius+=c,Cn.intersectsSphere(qs)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),Xs.copy(o.boundingBox).applyMatrix4(a);let u;if(i)u=Ci*.5;else{const d=Math.max(r.near,Xs.distanceToPoint(Cn.origin));u=ku(r,d,l.resolution)}Xs.expandByScalar(u),Cn.intersectsBox(Xs)!==!1&&(i?H0(this,t):V0(this,r,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(uo),this.material.uniforms.resolution.value.set(uo.z,uo.w))}}const pl=Math.PI/180,Hu=63710088e-1,ml=1e5,G0=Math.cos(46.3*pl);function Yn(n,e){if(!Number.isFinite(n)||!Number.isFinite(e)||Math.abs(n)>180||Math.abs(e)>90)throw Error("Invalid coordinate");return{x:(n-2.25)*Hu*G0*pl/ml,z:-(e-46.3)*Hu*pl/ml}}function qr(n,e=16){if(!Number.isFinite(n)||n<-500||n>6e3||!Number.isFinite(e)||e<1||e>24)throw Error("Invalid elevation or exaggeration");return n/ml*e}function Vu(n,e,t){if(n.n<2||n.heights.length!==n.n*n.n||n.mask.length!==n.n*n.n||n.east<=n.west||n.north<=n.south)throw Error("Invalid grid");if(!Number.isFinite(e)||!Number.isFinite(t)||e<n.west||e>n.east||t<n.south||t>n.north)return null;const i=(e-n.west)/(n.east-n.west)*(n.n-1),r=(n.north-t)/(n.north-n.south)*(n.n-1),s=Math.min(Math.floor(i),n.n-2),a=Math.min(Math.floor(r),n.n-2),o=i-s,l=r-a,c=[a*n.n+s,a*n.n+s+1,(a+1)*n.n+s,(a+1)*n.n+s+1],u=[(1-o)*(1-l),o*(1-l),(1-o)*l,o*l];return!n.mask[Math.round(r)*n.n+Math.round(i)]||c.some((d,h)=>u[h]>0&&(!Number.isFinite(n.heights[d])||n.heights[d]<-500||n.heights[d]>6e3))?null:c.reduce((d,h,p)=>d+n.heights[h]*u[p],0)}async function W0(n){const e=new Uint8Array(n);return e[0]!==31||e[1]!==139?n:new Response(new Blob([n]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()}function X0(n,e,t=64){let i=1/0,r=-1/0,s=1/0,a=-1/0;for(let v=0;v<n.length;v+=3)i=Math.min(i,n[v]),r=Math.max(r,n[v]),s=Math.min(s,n[v+2]),a=Math.max(a,n[v+2]);const o=(r-i)/t,l=(a-s)/t,c=Array.from({length:t*t},()=>[]),u=new Float32Array(e.length/3*4),d=v=>Math.max(0,Math.min(t-1,Math.floor((v-i)/o))),h=v=>Math.max(0,Math.min(t-1,Math.floor((v-s)/l)));for(let v=0;v<e.length;v+=3){const m=e[v]*3,f=e[v+1]*3,E=e[v+2]*3,_=v/3*4;u[_]=Math.min(n[m],n[f],n[E]),u[_+1]=Math.max(n[m],n[f],n[E]),u[_+2]=Math.min(n[m+2],n[f+2],n[E+2]),u[_+3]=Math.max(n[m+2],n[f+2],n[E+2]);const y=d(u[_]),A=d(u[_+1]),S=h(u[_+2]),w=h(u[_+3]);for(let R=S;R<=w;R++)for(let M=y;M<=A;M++)c[R*t+M].push(v)}return Object.assign((v,m)=>{if(!Number.isFinite(v)||!Number.isFinite(m)||v<i||v>r||m<s||m>a)return null;for(const f of c[h(m)*t+d(v)]){const E=e[f]*3,_=e[f+1]*3,y=e[f+2]*3,A=n[E],S=n[E+2],w=n[_]-A,R=n[_+2]-S,M=n[y]-A,x=n[y+2]-S,I=w*x-M*R;if(Math.abs(I)<1e-16)continue;const L=((v-A)*x-M*(m-S))/I,C=(w*(m-S)-(v-A)*R)/I;if(L>=-1e-6&&C>=-1e-6&&L+C<=1+1e-6)return n[E+1]+L*(n[_+1]-n[E+1])+C*(n[y+1]-n[E+1])}return null},{trianglesIn:v=>{const{minX:m,maxX:f,minZ:E,maxZ:_}=v;if(![m,f,E,_].every(Number.isFinite)||m>f||E>_||f<i||m>r||_<s||E>a)return[];const y=[],A=new Set;for(let S=h(E);S<=h(_);S++)for(let w=d(m);w<=d(f);w++)for(const R of c[S*t+w]){if(A.has(R))continue;A.add(R);const M=R/3*4;if(u[M]>f||u[M+1]<m||u[M+2]>_||u[M+3]<E)continue;const x=I=>[n[I*3],n[I*3+1],n[I*3+2]];y.push({id:R/3,vertices:[x(e[R]),x(e[R+1]),x(e[R+2])]})}return y}})}function sa(n,e,t,i,r,s=.001,a=0){const o=n(e,t),l=n(i,r);if(o===null||l===null)return[];let c=!1;for(const u of[.25,.5,.75]){const d=n(e+(i-e)*u,t+(r-t)*u);if(d===null)return[];Math.abs(d-(o+(l-o)*u))>s*.45&&(c=!0)}if(c&&a<8){const u=(e+i)/2,d=(t+r)/2;return[...sa(n,e,t,u,d,s,a+1),...sa(n,u,d,i,r,s,a+1)]}return[e,o+s,t,i,l+s,r]}const ya=Nn;async function ur(n){const e=await fetch(ya("data/"+n));if(!e.ok)throw Error(`资源加载失败 ${n}: ${e.status}`);return W0(await e.arrayBuffer())}async function Gu(n){const e=await fetch(ya("data/"+n));if(!e.ok)throw Error(`资源加载失败 ${n}`);return e.json()}async function q0(n){n("读取法国高程 / Reading elevation");const e=await Gu("terrain.json"),[t,i,r,s,a]=await Promise.all([ur("height.u16.gz"),ur("mask.u8.gz"),ur("overview.mesh.gz"),ur("overview.edges.gz"),Gu("rivers.json")]),o=new Uint16Array(t),l=new Float32Array(o.length);for(let C=0;C<l.length;C++)l[C]=o[C]/10;const c={...e,heights:l,mask:new Uint8Array(i)};n("塑造山脊与河谷 / Shaping the relief");const u=new Od,[d,h]=await Promise.all(["terrain-detail.png","terrain-ao.png"].map(C=>u.loadAsync(ya("data/"+C))));for(const C of[d,h])C.colorSpace=Xn,C.flipY=!1,C.minFilter=Wt,C.magFilter=Wt,C.generateMipmaps=!1;const p={detail:{value:d},ao:{value:h},exaggeration:{value:16},contours:{value:0}},g=`
    precision highp float;
    uniform sampler2D detail;uniform sampler2D ao;
    uniform float exaggeration;uniform float contours;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float grain(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float elevation(vec2 uv){vec2 c=texture2D(detail,(uv*4096.+.5)/4097.).rg;return (c.r*65280.+c.g*255.)*.1;}
    vec3 reliefColor(vec2 uv,float h,vec2 world,float minRadius,float snowStrength){
      // Broaden the DEM derivative footprint at national scale to avoid
      // subpixel ridge shimmer; close views retain the source's fine slopes.
      float radius=clamp(max(length(dFdx(uv)),length(dFdy(uv)))*4096.*.65,minRadius,7.);
      vec2 stepUv=vec2(radius/4096.,0.);
      vec2 g=vec2((elevation(uv+stepUv)-elevation(uv-stepUv))/(566.41755*radius),(elevation(uv+stepUv.yx)-elevation(uv-stepUv.yx))/(542.94473*radius));
      vec3 normal=normalize(vec3(-g.x*exaggeration,1.,-g.y*exaggeration));
      float slope=length(g);
      vec3 plain=vec3(.205,.257,.176),hill=vec3(.09,.147,.105),rock=vec3(.42,.435,.385),snow=vec3(.88,.90,.855);
      vec3 color=mix(plain,hill,smoothstep(180.,1000.,h));
      float rocky=smoothstep(.14,.48,slope)*.65+smoothstep(1450.,2500.,h)*.60;
      color=mix(color,rock,clamp(rocky,0.,.94));
      float snowline=smoothstep(2500.,3350.,h)*(1.-smoothstep(.38,.95,slope)*.78);
      color=mix(color,snow,snowline*snowStrength);
      float micro=grain(world*480.)*.5+grain(world*1350.)*.5;
      color*=.982+micro*.036;
      float diffuse=max(0.,dot(normal,normalize(vec3(-.65,.95,-.45))));
      float ambient=.49+.10*normal.y;
      color*=ambient+diffuse*.74;
      color*=mix(.76,1.,texture2D(ao,uv).r);
      return color;
    }
  `,v=new an({uniforms:p,vertexShader:`
    varying vec2 vUv; varying float vHeight; varying vec3 vWorld;
    void main(){vUv=uv;vHeight=(modelMatrix*vec4(position,1.)).y;vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
  `,fragmentShader:g+`
    varying vec2 vUv; varying float vHeight; varying vec3 vWorld;
    void main(){
      float h=vHeight*100000./exaggeration;
      vec3 color=reliefColor(vUv,h,vWorld.xz,1.,1.);
      if(contours>.5){float line=abs(fract(h/200.+.5)-.5)/max(fwidth(h/200.),.001);color*=mix(.76,1.,smoothstep(.0,1.1,line));}
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `}),m=new an({uniforms:p,vertexShader:`
    attribute float rimHeight;attribute float wallT;
    varying vec2 vUv;varying float vRimHeight;varying float vWallT;varying vec2 vWorld;
    void main(){vUv=uv;vRimHeight=rimHeight;vWallT=wallT;vWorld=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
  `,fragmentShader:g+`
    varying vec2 vUv;varying float vRimHeight;varying float vWallT;varying vec2 vWorld;
    void main(){vec3 color=reliefColor(vUv,vRimHeight,vWorld,4.,smoothstep(.55,1.,vWallT));
      color*=mix(.68,1.,smoothstep(0.,1.,vWallT));
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,side:un}),f=[],E={segments:0,missing:0,surface:"barycentric triangles; 100m then adaptive edge subdivision; 6.25m lift"};let _=!1;function y(C,U){const F=new Uint32Array(C,0,2),z=new Uint16Array(C,8,F[0]*3),X=8+z.byteLength+(4-z.byteLength%4)%4,G=new Uint32Array(C,X,F[1]),$=new Float32Array(F[0]*3),ne=new Float32Array(F[0]*2),se=Yn(e.west,e.north),Ee=Yn(e.east,e.south);for(let ae=0;ae<F[0];ae++){const be=z[ae*3]/(e.n-1),me=z[ae*3+1]/(e.n-1);$[ae*3]=se.x+(Ee.x-se.x)*be,$[ae*3+1]=qr(z[ae*3+2]/10),$[ae*3+2]=se.z+(Ee.z-se.z)*me,ne[ae*2]=be,ne[ae*2+1]=me}const Ne=new bn,ve=Array.from({length:64},()=>[]);for(let ae=0;ae<G.length;ae+=3){let be=0,me=0;for(let Ce=0;Ce<3;Ce++)be+=ne[G[ae+Ce]*2],me+=ne[G[ae+Ce]*2+1];const qe=Math.min(7,Math.floor(be/3*8)),Se=Math.min(7,Math.floor(me/3*8));ve[Se*8+qe].push(G[ae],G[ae+1],G[ae+2])}const Re=new sn($,3),j=new sn(ne,2);for(const ae of ve){if(!ae.length)continue;const be=new zt;be.setAttribute("position",Re),be.setAttribute("uv",j),be.setIndex(ae);const me=new Jn;for(const qe of ae)me.expandByPoint(new O().fromArray($,qe*3));be.boundingBox=me,be.boundingSphere=me.getBoundingSphere(new zi),Ne.add(new It(be,v))}const Q=new Uint32Array(U),_e=[],de=[],k=[],ie=[];for(let ae=0;ae<Q.length;ae+=2){const be=Q[ae],me=Q[ae+1];for(const[qe,Se]of[[be,1],[me,1],[be,0],[me,1],[me,0],[be,0]])_e.push($[qe*3],Se?$[qe*3+1]:-.065,$[qe*3+2]),de.push(ne[qe*2],ne[qe*2+1]),k.push($[qe*3+1]*1e5/16),ie.push(Se)}const we=new zt;we.setAttribute("position",new bt(_e,3)),we.setAttribute("uv",new bt(de,2)),we.setAttribute("rimHeight",new bt(k,1)),we.setAttribute("wallT",new bt(ie,1)),Ne.add(new It(we,m));const D=X0($,G),Ve=new bn;for(const ae of[1,2]){const be=[];for(const Ce of a.filter(Je=>Je.tier===ae))for(let Je=1;Je<Ce.coordinates.length;Je++){const ct=Ce.coordinates[Je-1],P=Ce.coordinates[Je],b=Yn(ct[0],ct[1]),W=Yn(P[0],P[1]),K=Math.max(1,Math.ceil(Math.hypot(W.x-b.x,W.z-b.z)/.001));let re;for(let Z=0;Z<=K;Z++){const Ue=Z/K,he=b.x+(W.x-b.x)*Ue,Pe=b.z+(W.z-b.z)*Ue,Ie=D(he,Pe);if(Ie===null){E.missing++,re=void 0;continue}const le=[he,Ie+.001,Pe];if(re){const ye=sa(D,re[0],re[2],he,Pe);be.push(...ye),E.segments+=ye.length/6}re=le}}const me=new ra;me.setPositions(be);const qe=new ql({color:ae===1?8764337:7578779,linewidth:ae===1?2.15:1.2,transparent:!0,opacity:ae===1?.94:.69,depthTest:!0,depthWrite:!1}),Se=new qd(me,qe);Se.userData.tier=ae,Se.computeLineDistances(),Ve.add(Se),f.push(qe)}return Ne.add(Ve),{group:Ne,positions:$,uv:ne,indices:G,riverGroup:Ve,sample:D,triangles:G.length/3}}const A=y(r,s),S=new bn;S.add(A.group);let w,R,M="overview";function x(C,U){!_&&C<10&&!w&&!R&&(R=Promise.all([ur("detail.mesh.gz"),ur("detail.edges.gz")]).then(([z,X])=>{_||(w=y(z,X),w.group.visible=!1,S.add(w.group),U())}).catch(z=>{_||console.error(z)}));const F=w&&(C<10||M==="detail"&&C<12)?"detail":"overview";A.group.visible=F==="overview",w&&(w.group.visible=F==="detail"),M=F;for(const z of[A,w])if(z)for(const X of z.riverGroup.children)X.visible=X.userData.tier===1||C<12}function I(){_=!0,S.traverse(C=>{(C instanceof It||C.isLineSegments2)&&C.geometry?.dispose()}),v.dispose(),m.dispose();for(const C of f)C.dispose();for(const C of[d,h])C.dispose()}const L=Object.assign((C,U)=>{const F=(M==="detail"?w:A).sample(C,U);return F===null?null:F*S.scale.y},{trianglesIn:C=>(M==="detail"?w:A).sample.trianglesIn(C).map(U=>({id:U.id,vertices:U.vertices.map(([F,z,X])=>[F,z*S.scale.y,X])}))});return{root:S,grid:c,meta:e,uniforms:p,riverMaterials:f,riverAudit:E,setLOD:x,dispose:I,sampleSurface:L,setExaggeration:C=>{qr(0,C),S.scale.y=C/16,p.exaggeration.value=C},getLevel:()=>M,getTriangles:()=>M==="detail"?w.triangles:A.triangles}}const Pi=(n,e)=>Math.hypot(n[0]-e[0],n[1]-e[1]),po=(n,e)=>[(n[0]+e[0])/2,(n[1]+e[1])/2];function Yd(n,e=96){if(n.length<2||n.some(r=>r.length!==2||r.some(s=>!Number.isFinite(s))))throw Error("Invalid path");const t=n.filter((r,s)=>!s||Pi(r,n[s-1])>1e-8);if(t.length<2)throw Error("Empty path");const i=new lp(t.map(r=>new O(r[0],0,r[1])),!1,"centripetal");return Array.from({length:e+1},(r,s)=>{const a=i.getPointAt(s/e);return[a.x,a.z]})}function Y0(n,e){if(!Number.isFinite(e)||e<=0)throw Error("Invalid width");const t=Yd(n,96),i=[],r=[];for(let l=0;l<t.length;l++){const c=l/(t.length-1),u=t[Math.max(0,l-1)],d=t[Math.min(t.length-1,l+1)],h=Pi(u,d),p=-(d[1]-u[1])/h,g=(d[0]-u[0])/h,v=Math.max(0,Math.min(1,(c-.72)/.1)),m=c<.72?.2+.35*c/.72:c<.82?.55+.9*v*v*(3-2*v):1.45*(1-c)/.18;i.push([t[l][0]+p*e*m,t[l][1]+g*e*m]),r.push([t[l][0]-p*e*m,t[l][1]-g*e*m])}const s=[...i,...r.slice(0,-1).reverse(),i[0]];if($0(s))throw Error("Arrow curve too tight for its width");const a=s.slice(0,-1),o=va.triangulateShape(a.map(l=>new ze(...l)),[]).map(([l,c,u])=>[a[l],a[c],a[u]]);return{outline:s,triangles:o,path:t,tip:t.at(-1)}}function $0(n){const e=(t,i,r)=>(i[0]-t[0])*(r[1]-t[1])-(i[1]-t[1])*(r[0]-t[0]);for(let t=0;t<n.length-1;t++)for(let i=t+2;i<n.length-1;i++){if(t===0&&i===n.length-2)continue;const r=n[t],s=n[t+1],a=n[i],o=n[i+1];if(e(r,s,a)*e(r,s,o)<-1e-14&&e(a,o,r)*e(a,o,s)<-1e-14)return!0}return!1}const mr=(n,e,t)=>(e[0]-n[0])*(t[1]-n[1])-(e[1]-n[1])*(t[0]-n[0]);function j0(n,e){const t=e.vertices.map(s=>[s[0],s[2]]),i=Math.sign(mr(...t));if(!i)return[];let r=n;for(let s=0;s<3&&r.length;s++){const a=t[s],o=t[(s+1)%3],l=[];let c=r.at(-1),u=i*mr(a,o,c);for(const d of r){const h=i*mr(a,o,d);if(u>=0!=h>=0){const p=u/(u-h);l.push([c[0]+p*(d[0]-c[0]),c[1]+p*(d[1]-c[1])])}h>=0&&l.push(d),c=d,u=h}r=l.filter((d,h)=>!h||Pi(d,l[h-1])>1e-12),r.length>1&&Pi(r[0],r.at(-1))<=1e-12&&r.pop()}return r}function Z0(n,e,t){const i=[],r=new Set;let s=0;for(const a of n){const o=Math.abs(mr(...a));if(o<1e-16)continue;const l=e({minX:Math.min(...a.map(u=>u[0])),maxX:Math.max(...a.map(u=>u[0])),minZ:Math.min(...a.map(u=>u[1])),maxZ:Math.max(...a.map(u=>u[1]))});let c=0;for(const u of l){const d=j0(a,u);if(d.length<3)continue;const[h,p,g]=u.vertices,v=p[0]-h[0],m=p[2]-h[2],f=g[0]-h[0],E=g[2]-h[2],_=v*E-f*m;if(!(Math.abs(_)<1e-16))for(let y=1;y<d.length-1;y++){const A=[d[0],d[y],d[y+1]],S=Math.abs(mr(...A));if(S<1e-16)continue;c+=S;const w=A.map(([x,I])=>[Math.fround(x),Math.fround(I)]);if(mr(...w)===0)continue;const R=[];for(const[x,I]of A){const L=((x-h[0])*E-f*(I-h[2]))/_,C=(v*(I-h[2])-(x-h[0])*m)/_;R.push(x,h[1]+L*(p[1]-h[1])+C*(g[1]-h[1])+t,I)}const M=[0,3,6].map(x=>R.slice(x,x+3).map(Math.fround).join(",")).sort().join(";");r.has(M)||(r.add(M),i.push(...R))}}c<o-Math.max(1e-14,o*1e-9)&&s++}return{positions:i,omitted:s}}function K0(n,e,t=.002,i=.025){if(e.trianglesIn)return Z0(n,e.trianglesIn,t);const r=[],s={count:0};function a(o,l){const[c,u,d]=o,h=o.map(w=>e(...w)),p=po(c,u),g=po(u,d),v=po(d,c),m=[(c[0]+u[0]+d[0])/3,(c[1]+u[1]+d[1])/3],f=[p,g,v,m],E=f.map(w=>e(...w)),_=h.some(w=>w===null)||E.some(w=>w===null),y=Math.max(Pi(c,u),Pi(u,d),Pi(d,c))>i,A=[((h[0]??0)+(h[1]??0))/2,((h[1]??0)+(h[2]??0))/2,((h[2]??0)+(h[0]??0))/2,h.reduce((w,R)=>w+(R??0),0)/3],S=E.some((w,R)=>w!==null&&Math.abs(w-A[R])>t*.35);if(l<7&&(y||!_&&S||_&&E.some(w=>w!==null))){a([c,p,v],l+1),a([p,u,g],l+1),a([v,g,d],l+1),a([p,g,v],l+1);return}if(_){s.count++;return}if(S){s.count++;return}o.forEach((w,R)=>r.push(w[0],h[R]+t,w[1]))}for(const o of n)a(o,0);return{positions:r,omitted:s.count}}function J0(n,e,t){if(![n,e,t].every(Number.isFinite)||t<=0||e<0)throw Error("Invalid playback time");return Math.min(1,Math.max(0,n)+e/t)}function Wu(n){if(n.kind!=="route"&&n.kind!=="arrow")return null;switch(n.faction){case"french-revolutionary":case"french-republican":return"french";case"coalition":case"foreign-intervention":return"coalition";case"federes-marseillais":return"federes";case"royal-household":case"escorted-royal-household":return"carriage";default:return null}}function Q0(n){const e=n==="coalition"||n==="carriage"?.5:0,t=n==="french"||n==="coalition"?.5:0,i=.5/1536,r=.5/1024;return{offset:[e+i,t+r],repeat:[.5-2*i,.5-2*r]}}function ey(n,e){if(n.length<2||!Number.isFinite(e)||n.some(u=>!u.every(Number.isFinite)))return null;const t=Math.max(0,Math.min(1,e))*(n.length-1),i=Math.min(n.length-2,Math.floor(t)),r=t-i,s=n[i],a=n[i+1],o=a[0]-s[0],l=a[1]-s[1],c=Math.hypot(o,l);return{x:s[0]+o*r,z:s[1]+l*r,heading:c?[o/c,l/c]:[1,0]}}function $d(n,e,t){const i=ey(n,e);if(!i)return null;const r=t(i.x,i.z);return r===null||!Number.isFinite(r)?null:{...i,y:r}}function ty(n,e){const t=n.top-n.bottom;if(![t,n.zoom,e.width,e.height].every(Number.isFinite)||t<=0||n.zoom<=0||e.width<=0||e.height<=0)return 0;const i=e.width<700,r=Math.min(i?52:68,(i?44:58)+Math.max(0,Math.log2(n.zoom))*4);return t/n.zoom*r/e.height}function ny(n,e){const t=n.map(()=>0),i=n.map((s,a)=>a).sort((s,a)=>n[s].x-n[a].x||s-a),r=Math.min(40,(e.width+6)/2);for(let s=0;s<i.length;s++)for(let a=s+1;a<i.length;a++){const o=i[s],l=i[a];if(Math.abs(n[o].y-n[l].y)>=e.height*.75)continue;const c=n[l].x+t[l]-n[o].x-t[o],u=e.width+6-c;u<=0||(t[o]=Math.max(-r,t[o]-u/2),t[l]=Math.min(r,t[l]+u/2))}return t}function iy(n,e,t,i){const r=new bn;r.name="historical-actors",n.add(r);const s=new os(1,1),a=new Map;let o,l,c=!1,u=!1,d=!1,h=[],p=[],g=1,v={military:!0,people:!0},m=[],f=[];function E(U,F=!0){const z=`${U}:${F}`,X=a.get(z);if(X)return X;const G=Q0(U),$=o.clone();return $.offset.set(G.offset[0]+(F?0:G.repeat[0]),G.offset[1]),$.repeat.set(G.repeat[0]*(F?1:-1),G.repeat[1]),$.needsUpdate=!0,a.set(z,$),$}function _(){for(const U of p)U.sprite.material.dispose(),U.shadow.material.dispose(),U.guide.geometry.dispose(),U.guide.material.dispose();p=[],f=[],r.clear()}function y(){if(_(),!(!o||d)){for(const U of h){const F=Wu(U.layer);if(!F)continue;const z=new Ad({map:E(F),color:16777215,transparent:!0,depthTest:!0,depthWrite:!1,alphaTest:.08,toneMapped:!1}),X=new np(z);X.name=`historical-actor:${U.layer.id}`,X.center.set(.5,.12),X.renderOrder=4;const G=new an({transparent:!0,depthTest:!0,depthWrite:!1,side:un,uniforms:{opacity:{value:.27}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"varying vec2 vUv;uniform float opacity;void main(){float a=1.-smoothstep(.1,.5,length(vUv-.5));gl_FragColor=vec4(.06,.05,.04,a*opacity);}"}),$=new It(s,G);$.name=`historical-actor-shadow:${U.layer.id}`,$.rotation.x=-Math.PI/2,$.renderOrder=3;const ne=new zt;ne.setAttribute("position",new bt(new Float32Array(6),3));const se=new ap(ne,new Pd({color:13351319,transparent:!0,opacity:.4,depthTest:!0,depthWrite:!1,toneMapped:!1}));se.name=`historical-actor-guide:${U.layer.id}`,se.visible=!1,se.renderOrder=3,r.add($,se,X),p.push({route:U,kind:F,sprite:X,shadow:$,guide:se,heading:[1,0]})}S()}}function A(){if(!(d||c||u||o||!h.length)){c=!0;try{l=new Od().load(t("art/revolution-actors.webp"),U=>{if(d){U.dispose();return}c=!1,l=void 0,o=U,U.colorSpace=jt,U.wrapS=U.wrapT=ai,U.minFilter=U.magFilter=Wt,U.generateMipmaps=!1,U.needsUpdate=!0,y(),i()},void 0,()=>{d||(c=!1,u=!0,l?.dispose(),l=void 0)})}catch{c=!1,u=!0,l?.dispose(),l=void 0}}}function S(){f=[];for(const U of p){const F=$d(U.route.path,g,e),z=v[U.route.layer.category]&&F!==null;U.sprite.visible=U.shadow.visible=z,z||(U.guide.visible=!1);const X=m.length&&!m.includes(U.route.layer.id)?.38:1;U.sprite.material.opacity=X,U.shadow.material.uniforms.opacity.value=.27*X,U.guide.material.opacity=.4*X,F&&(U.sprite.position.set(F.x,F.y+.006,F.z),U.shadow.position.set(F.x,F.y+.004,F.z),U.heading=F.heading)}}const w=new O,R=new O,M=new O;function x(U,F){if(f=[],d)return;const z=ty(U,F);if(r.visible=z>0,!z)return;U.updateMatrixWorld();const X=[],G=[],$=[],ne=(U.right-U.left)/U.zoom/F.width,se=z*U.zoom*F.height/(U.top-U.bottom),Ee=z*1.5/ne;for(const ve of p)ve.sprite.scale.set(z*1.5,z,1),ve.sprite.center.x=.5,ve.shadow.scale.set(z*.68,z*.22,1),ve.guide.visible=!1,ve.sprite.visible&&(w.copy(ve.sprite.position).project(U),R.set(ve.sprite.position.x+ve.heading[0],ve.sprite.position.y,ve.sprite.position.z+ve.heading[1]).project(U),Math.abs(R.x-w.x)>1e-5&&(ve.sprite.material.map=E(ve.kind,R.x>=w.x)),!(w.z<-1||w.z>1||Math.abs(w.x)>1||Math.abs(w.y)>1)&&(X.push(ve),G.push({x:(w.x+1)*F.width/2,y:(1-w.y)*F.height/2}),w.copy(ve.sprite.position),w.y-=.006,w.project(U),$.push({x:(w.x+1)*F.width/2,y:(1-w.y)*F.height/2})));const Ne=ny(G,{width:Ee*.78,height:se});M.setFromMatrixColumn(U.matrixWorld,0).normalize();for(let ve=0;ve<X.length;ve++){const Re=X[ve],j=Ne[ve]*ne,Q=Math.abs(Ne[ve])>=1?Ne[ve]:0;if(Q){Re.sprite.center.x=.5-j/(z*1.5),R.copy(Re.sprite.position).addScaledVector(M,j);const _e=Re.guide.geometry.getAttribute("position");_e.setXYZ(0,Re.sprite.position.x,Re.sprite.position.y,Re.sprite.position.z),_e.setXYZ(1,R.x,R.y,R.z),_e.needsUpdate=!0,Re.guide.geometry.computeBoundingSphere(),Re.guide.visible=!0}f.push({id:Re.route.layer.id,kind:Re.kind,x:G[ve].x+Q,y:G[ve].y,anchorX:$[ve].x,anchorY:$[ve].y,width:Ee,height:se,visible:!0})}if(g>=.82){const ve=f.findIndex(j=>j.id==="arrow-french-valmy"),Re=f.findIndex(j=>j.id==="arrow-coalition-valmy");if(ve>=0&&Re>=0)for(const[j,Q]of[[ve,Re],[Re,ve]])X[j].sprite.material.map=E(X[j].kind,f[Q].x>=f[j].x)}}function I(U){d||(h=U.filter(F=>Wu(F.layer)!==null&&F.path.length>1),y(),A())}function L(U,F,z){d||(g=U,v={...F},m=z,S())}function C(){if(!d){d=!0,_(),s.dispose();for(const U of a.values())U.dispose();a.clear(),o?.dispose(),l?.dispose(),o=l=void 0,h=[],n.remove(r)}}return{set:I,update:L,sync:x,dispose:C,screenActors:()=>f.map(U=>({...U})),hasActor:U=>p.some(F=>F.route.layer.id===U)}}function ry(n,e,t){const i=t.vertices,r=(l,c,u,d)=>l*d-c*u,s=Math.sign(r(i[1][0]-i[0][0],i[1][2]-i[0][2],i[2][0]-i[0][0],i[2][2]-i[0][2]));if(!s)return null;let a=0,o=1;for(let l=0;l<3;l++){const c=i[l],u=i[(l+1)%3],d=g=>s*r(u[0]-c[0],u[2]-c[2],g[0]-c[0],g[1]-c[2]),h=d(n),p=d(e);if(h<0&&p<0||(h<0&&(a=Math.max(a,h/(h-p))),p<0&&(o=Math.min(o,h/(h-p))),o<=a))return null}return o-a>1e-12?[a,o]:null}function Xu(n,e,t=.004){const i=[],r=[];if(n.length<2||n.some(a=>!a.every(Number.isFinite)))return{positions:i,travel:r};const s=(a,o)=>{const l=e(a,o);return l!==null&&Number.isFinite(l)?l:null};for(let a=1;a<n.length;a++){const o=n[a-1],l=n[a],c=l[0]-o[0],u=l[1]-o[1],d=c*c+u*u;if(d<1e-18)continue;let h;if(e.trianglesIn)h=e.trianglesIn({minX:Math.min(o[0],l[0]),maxX:Math.max(o[0],l[0]),minZ:Math.min(o[1],l[1]),maxZ:Math.max(o[1],l[1])}).map(g=>ry(o,l,g)).filter(g=>g!==null).sort((g,v)=>g[0]-v[0]||g[1]-v[1]);else{const g=Math.max(1,Math.ceil(Math.sqrt(d)/.008));h=Array.from({length:g},(v,m)=>[m/g,(m+1)/g])}let p=0;for(const[g,v]of h){const m=Math.max(g,p);if(v-m<=1e-12)continue;p=v;const f=sa(s,o[0]+c*m,o[1]+u*m,o[0]+c*v,o[1]+u*v,t);i.push(...f);for(let E=0;E<f.length;E+=3){const _=((f[E]-o[0])*c+(f[E+2]-o[1])*u)/d;r.push((a-1+Math.max(0,Math.min(1,_)))/(n.length-1))}}}return{positions:i,travel:r}}function sy(n,e){const t=Number.isFinite(e)?Math.max(0,Math.min(1,e)):0;let i=0,r=n.length/2;for(;i<r;){const o=Math.floor((i+r)/2);n[o*2]<t?i=o+1:r=o}const s=i,a=s-1;return a<0||n[a*2+1]<=t?{count:s,partial:null}:{count:s,partial:{index:a,fraction:(t-n[a*2])/(n[a*2+1]-n[a*2])}}}function ay(n,e,t){const i=new bn;i.name="historical-route-accents",n.add(i);let r=[],s=!1,a={width:1,height:1},o=!0;function l(y,A,S,w){const R=new ra;R.setPositions(S.length?S:[0,0,0,0,0,0]),R.instanceCount=S.length/6;const M=new ql({color:w,worldUnits:!1,linewidth:2.1,transparent:!0,opacity:.75,depthTest:!0,depthWrite:!1,toneMapped:!1});M.resolution.set(a.width,a.height);const x=new qd(R,M);return x.name=`historical-route-accent-${A}:${y}`,x.renderOrder=3,x.onBeforeRender=()=>{},i.add(x),x}function c(){for(const y of r)for(const A of[y.base,y.main,y.direction])A.geometry.dispose(),A.material.dispose();r=[],i.clear(),o=!0}function u(y){if(!s){c();for(const A of y){if(A.layer.kind!=="route"&&A.layer.kind!=="arrow")continue;const S=Xu(A.path,e),w=new Qe(t(A.layer.faction)),R=l(A.layer.id,"base",S.positions,w.clone().lerp(new Qe(15916990),.24)),M=l(A.layer.id,"progress",S.positions,w.clone().lerp(new Qe(16772558),.18)),x=l(A.layer.id,"direction",[],w);M.geometry.getAttribute("instanceEnd").data.setUsage(ff),r.push({route:A,data:S,base:R,main:M,direction:x,partial:null})}}}function d(y,A,S){if(!s)for(const w of r){const R=A[w.route.layer.category]&&w.data.positions.length>0,M=S.length&&!S.includes(w.route.layer.id)?.32:1;w.base.visible=R,w.main.visible=R&&y>0,w.direction.visible=R&&w.direction.geometry.instanceCount>0,w.base.material.opacity=.4*M,w.main.material.opacity=.82*M,w.direction.material.opacity=.7*M;const x=w.main.geometry.getAttribute("instanceEnd");if(w.partial!==null){const L=w.partial*6+3;x.setXYZ(w.partial,w.data.positions[L],w.data.positions[L+1],w.data.positions[L+2]),x.needsUpdate=!0}const I=sy(w.data.travel,y);if(w.main.geometry.instanceCount=I.count,w.partial=I.partial?.index??null,w.main.visible=R&&I.count>0,I.partial){const{index:L,fraction:C}=I.partial,U=L*6,F=w.data.positions;x.setXYZ(L,F[U]+(F[U+3]-F[U])*C,F[U+1]+(F[U+4]-F[U+1])*C,F[U+2]+(F[U+5]-F[U+2])*C),x.needsUpdate=!0}}}const h=new O,p=new O,g=new O,v=new O,m=new ht,f=new ht;function E(y,A){if(s)return;const S=[A.width,A.height].every(R=>Number.isFinite(R)&&R>0);if(i.visible=S,!S)return;y.updateMatrixWorld(),m.multiplyMatrices(y.projectionMatrix,y.matrixWorldInverse);const w=o||A.width!==a.width||A.height!==a.height||!m.equals(f);a={...A},f.copy(m),o=!1;for(const R of r){for(const F of[R.base,R.main,R.direction])F.material.resolution.set(a.width,a.height);if(R.base.material.linewidth=a.width<700?1.15:1.2,R.main.material.linewidth=a.width<700?2.1:2.2,R.direction.material.linewidth=1.55,!w)continue;const M=R.route.path,x=M.at(-1),I=M.at(-2),L=e(...x),C=e(...I),U=[];if(L!==null&&C!==null&&Number.isFinite(L)&&Number.isFinite(C)){h.set(x[0],L+.004,x[1]).project(y),p.set(I[0],C+.004,I[1]).project(y),g.set(x[0]+1,L+.004,x[1]).project(y).sub(h),v.set(x[0],L+.004,x[1]+1).project(y).sub(h);const F=(h.x-p.x)*a.width,z=(h.y-p.y)*a.height,X=Math.hypot(F,z),G=g.x*v.y-g.y*v.x;if(X>1e-8&&Math.abs(G)>1e-8){const $=F/X,ne=z/X,se=a.width<700?6:7;for(const Ee of[-1,1]){const Ne=(-$*se-ne*3.5*Ee)*2/a.width,ve=(-ne*se+$*3.5*Ee)*2/a.height,Re=[x[0]+(Ne*v.y-ve*v.x)/G,x[1]+(g.x*ve-g.y*Ne)/G];U.push(...Xu([Re,x],e).positions)}}}R.direction.geometry.dispose(),R.direction.geometry=new ra().setPositions(U.length?U:[0,0,0,0,0,0]),R.direction.geometry.instanceCount=U.length/6,R.direction.visible=R.base.visible&&U.length>0}}function _(){s||(s=!0,c(),n.remove(i))}return{set:u,update:d,sync:E,dispose:_}}const oy={coalition:12872540,"french-revolutionary":13213792,"french-republican":13213792,"federes-marseillais":14794102,"royal-household":12626385,"escorted-royal-household":10859981,"rural-unrest":12623966,"civil-war":12286080,federalist:13544564,royalist:11179709,"foreign-intervention":12413793,political:11967074},gl=n=>oy[n]??11967074;function ly(n,e,t,i){const r=new bn;r.name="historical-overlays",n.add(r);let s=[],a=[],o="",l=1,c=!1,u=!1,d=[],h={military:!0,people:!0},p={triangles:0,omitted:0,layerCount:0};const g=i?iy(n,e,i.resolveResource,()=>{u||(E(),t())}):void 0,v=ay(n,e,gl);function m(){for(const M of a)M.mesh.geometry.dispose(),M.material.dispose(),M.marker&&(M.marker.geometry.dispose(),M.marker.material.dispose());a=[],r.clear()}function f(){m(),p={triangles:0,omitted:0,layerCount:s.length};for(const M of s){const x=M.points.map(([$,ne])=>{const se=Yn($,ne);return[se.x,se.z]});if(x.length<2)continue;let I,L;if(M.kind==="arrow"){const $=Y0(x,M.widthKm/100);I=$.triangles,L=$.path}else if(M.kind==="area"){L=x;const $=x.at(-1)[0]===x[0][0]&&x.at(-1)[1]===x[0][1]?x.slice(0,-1):x;I=va.triangulateShape($.map(se=>new ze(...se)),[]).map(se=>[$[se[0]],$[se[1]],$[se[2]]])}else{L=Yd(x,128),I=[];const $=Math.max(.006,M.widthKm/200);for(let ne=1;ne<L.length;ne++){const se=L[ne-1],Ee=L[ne],Ne=Math.hypot(Ee[0]-se[0],Ee[1]-se[1]),ve=-(Ee[1]-se[1])/Ne*$,Re=(Ee[0]-se[0])/Ne*$,j=[se[0]+ve,se[1]+Re],Q=[se[0]-ve,se[1]-Re],_e=[Ee[0]+ve,Ee[1]+Re],de=[Ee[0]-ve,Ee[1]-Re];I.push([j,Q,_e],[Q,de,_e])}}const C=K0(I,e,.0025),U=new zt;U.setAttribute("position",new bt(C.positions,3));const F=[];for(let $=0;$<C.positions.length;$+=3){let ne=1/0,se=0;for(let Ee=0;Ee<L.length;Ee++){const Ne=(C.positions[$]-L[Ee][0])**2+(C.positions[$+2]-L[Ee][1])**2;Ne<ne&&(ne=Ne,se=Ee)}F.push(se/Math.max(1,L.length-1))}U.setAttribute("travel",new bt(F,1)),U.computeBoundingSphere();const z=new an({transparent:!0,depthTest:!0,depthWrite:!1,side:un,polygonOffset:!0,polygonOffsetFactor:-1,polygonOffsetUnits:-1,uniforms:{color:{value:new Qe(gl(M.faction))},progress:{value:l},emphasis:{value:1},routeOpacity:{value:1},area:{value:M.kind==="area"?1:0}},vertexShader:"attribute float travel;varying float vTravel;varying vec3 vWorld;void main(){vTravel=travel;vWorld=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`uniform vec3 color;uniform float progress;uniform float emphasis;uniform float routeOpacity;uniform float area;varying float vTravel;varying vec3 vWorld;void main(){if(area<.5&&vTravel>progress)discard;float alpha=mix(.34,.78,vTravel);if(area>.5)alpha=(.18+.10*smoothstep(.4,.6,fract((vWorld.x+vWorld.z)*25.)))*progress;gl_FragColor=vec4(color,alpha*emphasis*routeOpacity);
   #include <colorspace_fragment>
   }`}),X=new It(U,z);X.renderOrder=3,r.add(X);let G;M.kind==="route"&&(G=new It(new ga(.018,.018,.022,12),new ma({color:15783582})),r.add(G)),a.push({layer:M,mesh:X,material:z,path:L,marker:G}),p.triangles+=C.positions.length/9,p.omitted+=C.omitted}g?.set(a),v.set(a),E()}function E(){g?.update(l,h,d),v.update(l,h,d);for(const M of a){const x=h[M.layer.category],I=g?.hasActor(M.layer.id)??!1;if(M.mesh.visible=x,M.material.uniforms.progress.value=l,M.material.uniforms.emphasis.value=d.length&&!d.includes(M.layer.id)?.32:1,M.material.uniforms.routeOpacity.value=I?.58:1,M.marker){M.marker.visible=x&&c&&l<1&&!I;const L=$d(M.path,l,e);L?M.marker.position.set(L.x,L.y+.014,L.z):M.marker.visible=!1}}}function _(M,x=1){u||(c=!1,s=M,l=Math.max(0,Math.min(1,x)),f(),t())}function y(M,x){return u?!1:(x!==o&&(o=x,s.length&&f()),c&&(l=J0(l,M,9),l===1&&(c=!1),E()),c)}function A(){c=!1,E(),t()}function S(M=!1){u||!s.length||((M||l===1)&&(l=0),c=!0,E(),t())}function w(M,x=[]){h={...M},d=x,E(),t()}function R(){u||(u=!0,c=!1,m(),g?.dispose(),v.dispose(),n.remove(r))}return{set:_,tick:y,pause:A,play:S,configure:w,dispose:R,syncActors:(M,x)=>{g?.sync(M,x),v.sync(M,x)},refresh:()=>{u||(f(),t())},snapshot:()=>({progress:l,playing:c,switches:{...h},layerIds:s.map(M=>M.id),audit:{...p},actors:g?.screenActors()??[]})}}async function cy(n,e){const t=new M0({canvas:n,antialias:!0,powerPreference:"high-performance",alpha:!0,preserveDrawingBuffer:new URLSearchParams(location.search).has("debug")});t.setPixelRatio(Math.min(devicePixelRatio,1.75)),t.outputColorSpace=jt,t.setClearColor(2105636,0);const i=new tp,r=new Bd(-10,10,6,-6,.01,100),s=Yn(2.45,46.6),a=new O(s.x,0,s.z),o=new O(0,13,9.45);r.position.copy(a).add(o);const l=new b0(r,n);l.target.copy(a),l.enableDamping=!0,l.dampingFactor=.12,l.minPolarAngle=.18,l.maxPolarAngle=1.16,l.minZoom=.75,l.maxZoom=10,l.enablePan=!0,l.screenSpacePanning=!1,l.rotateSpeed=.62,l.zoomSpeed=.8,l.autoRotateSpeed=.5,l.mouseButtons={LEFT:xn.ROTATE,MIDDLE:xn.DOLLY,RIGHT:xn.PAN},l.touches={ONE:Pn.ROTATE,TWO:Pn.DOLLY_PAN};const c=await q0(e);i.add(c.root);const u=new bn;i.add(u);for(const[k,ie]of[[2.3522,48.8566],[2.13,48.801]]){const we=Yn(k,ie),D=Vu(c.grid,k,ie)??0,Ve=new It(new ga(.021,.024,.012,16),new ma({color:11967074}));Ve.position.set(we.x,qr(D)+.006,we.z),u.add(Ve)}let d=0,h=0,p=!1,g=!1,v=!1,m=16,f=!1,E=!1,_=!1,y=()=>{},A=0;const S=[],w=[];let R=0;const M={width:1,height:1},x=ly(i,c.sampleSurface,L,{resolveResource:Nn});function I(k){if(d=0,p||document.hidden||g)return;if(v=!0,_){const D=Math.min(1,(k-_.start)/650),Ve=1-(1-D)**3,ae=l.target.clone();l.target.lerpVectors(_.from,_.to,Ve),r.position.add(l.target.clone().sub(ae)),r.zoom=dr.lerp(_.zoom0,_.zoom1,Ve),r.updateProjectionMatrix(),D===1&&(_=!1),h=12}l.update(A?Math.min((k-A)/1e3,.25):0),l.target.x=dr.clamp(l.target.x,-7,7),l.target.z=dr.clamp(l.target.z,-6,6),!_&&!E&&f&&r.zoom<=1.75&&(l.target.distanceToSquared(a)<1e-16?f=!1:F(a,r.zoom)),c.setLOD(16/r.zoom,L);for(const D of c.riverMaterials)D.resolution.set(M.width,M.height);const ie=x.tick(A?Math.min((k-A)/1e3,.25):0,c.getLevel());x.syncActors(r,M),u.visible=r.zoom>1.45;const we=performance.now();t.render(i,r),w.push(performance.now()-we),w.length>240&&w.shift(),A&&(S.push(k-A),S.length>240&&S.shift()),A=k,R++,y(),n.dataset.ready="true",n.dataset.zoom=r.zoom.toFixed(4),n.dataset.frames=String(R),v=!1,!d&&(--h>0||_||l.autoRotate||ie)?d=requestAnimationFrame(I):d||(A=0)}function L(){g||p||document.hidden||(h=12,!d&&!v&&(d=requestAnimationFrame(I)))}l.addEventListener("change",L),l.addEventListener("start",()=>{E=!0,_=!1,l.autoRotate=!1,L()}),l.addEventListener("end",()=>{E=!1,L()});function C(){const k=n.getBoundingClientRect();M.width=k.width,M.height=k.height,t.setSize(k.width,k.height,!1);const ie=k.width/k.height,we=k.width<700?Math.max(12.1,14.2/ie):12.1;r.left=-we*ie/2,r.right=we*ie/2,r.top=we/2,r.bottom=-we/2,r.updateProjectionMatrix(),L()}const U=new ResizeObserver(C);U.observe(n),C();function F(k,ie){_={start:performance.now(),from:l.target.clone(),to:k.clone(),zoom0:r.zoom,zoom1:ie},L()}function z(){_=!1,l.autoRotate=!1,f=!1,l.target.copy(a),r.position.copy(a).add(o),r.zoom=1,r.updateProjectionMatrix(),l.update(0),L()}function X(k,ie,we=3){const D=Yn(k,ie);l.autoRotate=!1,f=!0,F(new O(D.x,0,D.z),we)}function G(k){g||(l.autoRotate=k,_=!1,k&&(f=!1,(r.zoom>1.75||l.target.distanceToSquared(a)>1e-8)&&F(a,1)),L())}function $(k,ie,we=.012){const D=Yn(k,ie),Ve=Vu(c.grid,k,ie)??0,ae=new O(D.x,qr(Ve,m)+we,D.z).project(r);return{x:(ae.x+1)/2*M.width,y:(1-ae.y)/2*M.height,visible:ae.z>-1&&ae.z<1&&Math.abs(ae.x)<.98&&Math.abs(ae.y)<.97}}function ne(){const k=t.getContext(),ie=k.getExtension("WEBGL_debug_renderer_info");return{camera:{position:r.position.toArray(),target:l.target.toArray(),zoom:r.zoom},history:x.snapshot(),autoRotate:l.autoRotate,viewport:{...M,dpr:t.getPixelRatio()},renderer:ie?k.getParameter(ie.UNMASKED_RENDERER_WEBGL):k.getParameter(k.RENDERER),webglVersion:k.getParameter(k.VERSION),triangles:t.info.render.triangles,terrainTriangles:c.getTriangles(),drawCalls:t.info.render.calls,level:c.getLevel(),totalFrames:R,frameTimes:[...S],renderSubmitMs:[...w],riverAudit:c.riverAudit,paused:p,hidden:document.hidden}}function se(){p=!0,x.pause(),d&&cancelAnimationFrame(d),d=0,A=0}function Ee(){p=!1,L()}const Ne=()=>{document.hidden?(x.pause(),d&&cancelAnimationFrame(d),d=0,A=0):L()};document.addEventListener("visibilitychange",Ne);const ve=k=>{const ie=.16/r.zoom;if(k.key==="r"||k.key==="R")z();else if(k.key==="+"||k.key==="=")r.zoom=Math.min(10,r.zoom*1.15),r.updateProjectionMatrix();else if(k.key==="-")r.zoom=Math.max(.75,r.zoom/1.15),r.updateProjectionMatrix();else if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(k.key)){const we=k.key==="ArrowRight"?ie:k.key==="ArrowLeft"?-ie:0,D=k.key==="ArrowDown"?ie:k.key==="ArrowUp"?-ie:0;l.target.x+=we,r.position.x+=we,l.target.z+=D,r.position.z+=D,f=!1}else return;k.preventDefault(),_=!1,l.autoRotate=!1,L()};n.addEventListener("keydown",ve);function Re(){g=!0,se(),x.dispose(),U.disconnect(),document.removeEventListener("visibilitychange",Ne),n.removeEventListener("keydown",ve),l.dispose(),c.dispose(),u.traverse(k=>{k instanceof It&&(k.geometry.dispose(),k.material.dispose())}),t.dispose(),t.forceContextLoss()}function j(k){l.autoRotate=!1,l.mouseButtons.LEFT=k==="rotate"?xn.ROTATE:xn.PAN,l.touches.ONE=k==="rotate"?Pn.ROTATE:Pn.PAN,L()}function Q(k){_=!1,l.autoRotate=!1,r.zoom=dr.clamp(r.zoom*k,.75,10),r.updateProjectionMatrix(),L()}function _e(k){qr(0,k);const ie=k/m;for(const we of u.children)we.position.y=(we.position.y-.006)*ie+.006;m=k,c.setExaggeration(k),x.refresh(),L()}function de(k){if(k.position.length!==3||k.target.length!==3||![...k.position,...k.target,k.zoom].every(Number.isFinite)||k.zoom<.75||k.zoom>10)throw Error("Invalid camera state");_=!1,l.autoRotate=!1,f=!1;const ie=l.enableDamping;l.enableDamping=!1,l.update(0),l.enableDamping=ie,r.position.fromArray(k.position),l.target.fromArray(k.target),r.zoom=k.zoom,r.updateProjectionMatrix(),l.update(0),L()}return L(),{screen:$,focus:X,reset:z,resize:C,snapshot:ne,pause:se,resume:Ee,dispose:Re,invalidate:L,setMode:j,zoomBy:Q,setAutoRotate:G,setExaggeration:_e,restoreCamera:de,setHistory:(k,ie=1)=>x.set(k,ie),configureHistory:(k,ie=[])=>x.configure(k,ie),playHistory:(k=!1)=>{l.autoRotate=!1,x.play(k)},pauseHistory:x.pause,onUpdate:k=>{y=k,L()},setContours:k=>{c.uniforms.contours.value=k?1:0,L()}}}const Yl=[{id:"ch01",zh:"面包与账单",en:"Bread and Bills",dates:[""]},{id:"ch02",zh:"谁代表法国",en:"Who Represents France?",dates:["1789-05-05","1789-06-17","1789-06-20"]},{id:"ch03",zh:"巴士底狱的钟声",en:"The Bells of the Bastille",dates:["1789-07-12","1789-07-13","1789-07-14"]},{id:"ch04",zh:"写下新的权利",en:"Putting Rights into Words",dates:["1789-08-04","1789-08-26"]}];function uy(n){const e=n.replace(/^\uFEFF/,""),t=[];let i=[],r="",s=!1;for(let o=0;o<e.length;o++){const l=e[o];l==='"'?s&&e[o+1]==='"'?(r+='"',o++):s=!s:l===","&&!s?(i.push(r),r=""):(l===`
`||l==="\r")&&!s?(l==="\r"&&e[o+1]===`
`&&o++,i.push(r),i.some(Boolean)&&t.push(i),i=[],r=""):r+=l}if(s)throw new Error("Unclosed CSV quote");i.push(r),i.some(Boolean)&&t.push(i);const a=t.shift()??[];return t.map(o=>{if(o.length!==a.length)throw new Error("CSV field count mismatch");return Object.fromEntries(a.map((l,c)=>[l,o[c]]))})}function jd(n,e,t){return Yl.some(i=>i.id===e)?n.filter(i=>i.chapter_id===e&&!(t&&i.date_start&&i.date_start>t)&&!(t&&i.date_end&&i.date_end<t)):[]}const qu={"loc-street":"paris","loc-bakery":"paris","loc-printshop":"paris","loc-july-street":"paris","loc-palais-royal":"paris","loc-invalides":"paris","loc-bastille":"paris","loc-menus":"versailles","loc-menus-transition":"versailles","loc-jeu":"versailles"};function $l(n){return Object.hasOwn(qu,n.location_id)?qu[n.location_id]:"france"}function dy(n){if(n.location_kind!=="fictional_anchor"&&n.modern_lon?.trim()&&n.modern_lat?.trim()){const t=Number(n.modern_lon),i=Number(n.modern_lat);if(Number.isFinite(t)&&Number.isFinite(i)&&Math.abs(t)<=180&&Math.abs(i)<=90)return{lon:t,lat:i,kind:"modern-reference"}}const e=$l(n);return e==="paris"?{lon:2.3522,lat:48.8566,kind:"regional-anchor"}:e==="versailles"?{lon:2.13,lat:48.801,kind:"regional-anchor"}:null}const J=(n,e)=>({zh:n,en:e}),nn=[2.3522,48.8566],vl=[5.3698,43.2965],Zd=[4.76697,49.08075],_l=[5.035,49.227],mo=[4.8357,45.764],yl=[5.928,43.124],Vt=J("现代城市参考点；用于定位事件，不代表历史建筑或人群的精确位置。","Modern city reference; it locates the event, not an exact historic building or crowd."),go=J("仅连接史料支持的起点与终点；曲线为教学示意，不复原道路、停靠城镇、每日位置或行军速度。","Only the supported endpoints are linked. The curve does not reconstruct roads, stops, daily positions, or travel speed."),Hr=J("战役方向的区域示意；控制点不是已证实的停驻地点，线宽不表示兵力或战线。现代地形覆盖之外的境外集结与接近过程未绘制；地形边缘不是1792年国界。","Regional campaign direction only: control points are not documented stops and width does not measure strength or a front. Foreign assembly and approaches outside the modern terrain coverage are omitted; its edge is not the 1792 border."),hy=[{id:"assembly-revolution",title:"Assemblée nationale — Révolution française, chronology",url:"https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/revolution-francaise"},{id:"assembly-brumaire",title:"Assemblée nationale — Le coup d’État des 18 et 19 brumaire an VIII",url:"https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/revolution-francaise/le-coup-d-etat-des-18-et-19-brumaire-an-viii"},{id:"marseille-memorial",title:"Musées de Marseille — Mémorial de la Marseillaise",url:"https://musees.marseille.fr/memorial-de-la-marseillaise-0"},{id:"marseille-visit",title:"Musée d’Histoire de Marseille — Mémorial visitor guide, p. 1",url:"https://musee-histoire.marseille.fr/sites/default/files/2024-03/aide-visite-marseillaise-revujm-03052021.pdf"},{id:"marseille-history",title:"Ville de Marseille — La Marseillaise : 230 ans d’histoire",url:"https://www.marseille.fr/culture/actualites/la-marseillaise-230-ans-d-histoire"},{id:"elysee-marseillaise",title:"Élysée — La Marseillaise de Rouget de Lisle",url:"https://www.elysee.fr/la-presidence/la-marseillaise-de-rouget-de-lisle"},{id:"valmy-battle",title:"Centre historique Valmy 1792 — La bataille",url:"https://www.valmy1792.com/centre-historique-valmy-1792/la-bataille/"},{id:"valmy-location",title:"Centre historique Valmy 1792 — Published site GPS",url:"https://www.valmy1792.com/accueil/o%C3%B9-nous-trouver/"},{id:"valmy-art",title:"L’Histoire par l’image — La bataille de Valmy",url:"https://histoire-image.org/etudes/bataille-valmy"},{id:"valmy-campaign",title:"L’Histoire par l’image — La bataille de Valmy, 20 septembre 1792",url:"https://histoire-image.org/etudes/bataille-valmy-20-septembre-1792"},{id:"valmy-site",title:"Centre historique Valmy 1792 — Autour du moulin (campaign places only)",url:"https://www.valmy1792.com/le-moulin/autour-du-moulin"},{id:"thil-longwy",title:"Ville de Thil — Histoire : siège de Longwy, 19–23 août 1792",url:"https://www.ville-thil54.fr/fr/histoire.html"},{id:"carnavalet-verdun",title:"Paris Musées / Carnavalet — Défaite à Verdun, 2 septembre 1792, collection record",url:"https://parismuseescollections.paris.fr/es/node/350380"},{id:"lille-campaign",title:"L’Histoire par l’image — Le siège de Lille (1792), campaign context",url:"https://histoire-image.org/etudes/siege-lille-septembre-octobre-1792"},{id:"tackett-fear",title:"Timothy Tackett — La Grande Peur et le complot aristocratique, AHRF 335 (2004), §§1, 9–11",url:"https://journals.openedition.org/ahrf/1298"},{id:"vignolles-fear",title:"Henri Vignolles — La dimension répressive de la Grande Peur, LRF 18 (2020), §§9–10, 24",url:"https://journals.openedition.org/lrf/pdf/3952"},{id:"carnavalet-revolution",title:"Musée Carnavalet — La Révolution française à Paris, educational dossier (2023)",url:"https://www.carnavalet.paris.fr/sites/default/files/2023-01/la_revolution_francaise_a_paris.pdf"},{id:"versailles-flight",title:"Château de Versailles — La messe de la famille royale aux Tuileries (flight dates)",url:"https://www.chateauversailles.fr/actualites/actualites-mecenat/presentation-messe-famille-royale-aux-tuileries"},{id:"varennes-return",title:"L’Histoire par l’image / Archives nationales — Retour de Varennes à Paris",url:"https://histoire-image.org/etudes/retour-varennes-paris"},{id:"vendee-insurrection",title:"L’Histoire par l’image — Insurrections et guerre de Vendée",url:"https://histoire-image.org/albums/insurrections-guerre-vendee"},{id:"vendee-cholet",title:"L’Histoire par l’image — La déroute de Cholet, octobre 1793",url:"https://histoire-image.org/etudes/deroute-cholet-octobre-1793"},{id:"lyon-archives",title:"Archives de Lyon — Lyon n’est plus: siege and repression",url:"https://www.archives-lyon.fr/vuln%C3%A9rabilit%C3%A9s/risques-militaires/Lyon-n%27est-plus"},{id:"lyon-gadagne",title:"Musée d’Histoire de Lyon / Gadagne — Pain du siège de Lyon",url:"https://www.gadagne-lyon.fr/mhl/pain-du-siege-de-lyon"},{id:"toulon-siege",title:"L’Histoire par l’image — Le siège de Toulon (septembre–décembre 1793)",url:"https://histoire-image.org/etudes/siege-toulon-septembre-decembre-1793"},{id:"marine-toulon",title:"Musée national de la Marine — Marines de la Révolution et de l’Empire, Repères (2024), p. 4",url:"https://www.musee-marine.fr/fileadmin/user_upload/Reseau/Enseignant/Dossier_pedagogique/DP_2024/MarinesRevo_Empire_REPERES.pdf"},{id:"senate-directory",title:"Sénat — Le Conseil des Anciens (1795–1799)",url:"https://www.senat.fr/connaitre-le-senat/lhistoire-du-senat/1795-1799-le-conseil-des-anciens.html"},{id:"carnavalet-chronology",title:"Musée Carnavalet — La Révolution française à Paris, chronology (2022)",url:"https://www.carnavalet.paris.fr/sites/default/files/2022-08/mp_dossier_pedagogique_la_revolution_francaise_a_paris.pdf"}],fy=[{id:"ch01",legacyChapterId:"ch01",year:"1789",title:J("面包与账单","Bread and Bills"),dates:[""]},{id:"ch02",legacyChapterId:"ch02",year:"1789",title:J("谁代表法国","Who Represents France?"),dates:["1789-05-05","1789-06-17","1789-06-20"]},{id:"ch03",legacyChapterId:"ch03",year:"1789",title:J("巴士底狱的钟声","The Bells of the Bastille"),dates:["1789-07-12","1789-07-13","1789-07-14"]},{id:"ch04",legacyChapterId:"ch04",year:"1789",title:J("写下新的权利","Putting Rights into Words"),dates:["1789-08-04","1789-08-26"]}],pn=[...fy,{id:"h1789-fear",year:"1789",title:J("夏季：乡村的大恐慌","Summer: the Great Fear in the countryside"),dates:["1789-07-30"]},{id:"h1791-escape",year:"1791",title:J("王室逃亡至瓦伦","The royal flight to Varennes"),dates:["1791-06-21"]},{id:"h1791-return",year:"1791",title:J("王室被护送回巴黎","The escorted return to Paris"),dates:["1791-06-25"]},{id:"h1792-war",year:"1792",title:J("法国宣战","France declares war"),dates:["1792-04-20"]},{id:"h1792-marseille",year:"1792",title:J("夏季：马赛的动员","Summer: mobilization in Marseille"),dates:["1792-07-15"]},{id:"h1792-paris",year:"1792",title:J("马赛联省军抵达巴黎","The Marseillais arrive in Paris"),dates:["1792-07-30"]},{id:"h1792-advance",year:"1792",title:J("东北战局的推进","The northeastern campaign"),dates:["1792-08-23","1792-09-02"]},{id:"h1792-valmy",year:"1792",title:J("瓦尔密：守住阵地","Valmy: holding the line"),dates:["1792-09-20"]},{id:"h1792-monarchy",year:"1792",title:J("国民公会废除君主制","The Convention abolishes monarchy"),dates:["1792-09-21"]},{id:"h1792-republic",year:"1792",title:J("共和国元年的起点","The start of Year I"),dates:["1792-09-22"]},{id:"h1793-vendee",year:"1793",title:J("旺代：内战","Vendée: civil war"),dates:["1793-03-15","1793-10-17"]},{id:"h1793-lyon",year:"1793",title:J("里昂：地方反抗与围城","Lyon: local revolt and siege"),dates:["1793-05-29","1793-08-08","1793-10-09"]},{id:"h1793-toulon",year:"1793",title:J("土伦：港口与外国干预","Toulon: a port and foreign intervention"),dates:["1793-09-15","1793-12-19"]},{id:"h1794-thermidor",year:"1794",title:J("热月：罗伯斯庇尔倒台","Thermidor: the fall of Robespierre"),dates:["1794-07-27","1794-07-28"]},{id:"h1795-directory",year:"1795",title:J("共和三年宪法与督政府","The Year III Constitution and Directory"),dates:["1795-08-22","1795-10-26"]},{id:"h1799-brumaire",year:"1799",title:J("雾月政变","The Brumaire coup"),dates:["1799-11-09","1799-11-10"]}],py=[{id:"ev-fear-dauphine",stageIds:["h1789-fear"],from:"1789-07-20",to:"1789-08-06",precision:"season",anchor:[5.45,45.4],regionId:"dauphine",kind:"archive",layerIds:[],sourceIds:["tackett-fear","vignolles-fear"],title:J("多菲内：警报与乡村动员","Dauphiné: alarms and rural mobilization"),summary:J("夏季的恐慌与反领主行动在这里交织，各地经历并不相同。","Summer panic and action against seigneurial authority intersect here, with different local experiences."),detail:J("塔克特讨论了入侵传闻的变化；维尼奥勒强调恐慌与农民反抗应加区分。两者不能画成一支征服全国的军队。","Tackett examines changing invasion rumours; Vignolles distinguishes panic from agrarian revolt. Neither justifies one army conquering the country."),reconstruction:J("多菲内乡村的区域锚点；7月30日为夏季观察点。未找到可用于本图的精确范围，故不绘制传播边界或部队箭头。","Regional anchor for rural Dauphiné; 30 July is a summer observation. No precise extent is established for this map, so no spread boundary or troop arrow is drawn.")},{id:"ev-fear-quercy",stageIds:["h1789-fear"],from:"1789-07-20",to:"1789-08-06",precision:"season",anchor:[1.4,44.5],regionId:"quercy",kind:"archive",layerIds:[],sourceIds:["tackett-fear"],title:J("凯尔西：流言中的敌人","Quercy: an enemy in rumour"),summary:J("卡奥尔和吕泽克附近的记述展现了人们如何把传闻解释成入侵威胁。","Accounts around Cahors and Luzech show rumours being interpreted as an invasion threat."),detail:J("这是对恐慌与动员的区域观察，不是对传闻中军队真实存在的确认。全国恐慌也没有在同一天开始。","This regional example records fear and mobilization, not the real existence of the imagined armies. Panic did not begin everywhere on one day."),reconstruction:J("凯尔西区域参考点；夏季窗口不表示每个村庄均在整个期间发生同一种事件。无已证实的传播线，故只保留锚点。","Quercy regional reference. The summer window does not imply the same event in every village throughout it. Without a verified spread line, only an anchor is used.")},{id:"ev-royal-escape",stageIds:["h1791-escape"],from:"1791-06-20",to:"1791-06-21",precision:"range",anchor:_l,regionId:"varennes",kind:"evolution",layerIds:["route-royal-escape"],sourceIds:["carnavalet-revolution","versailles-flight"],title:J("逃亡在瓦伦受阻","The flight is stopped at Varennes"),summary:J("6月20日至21日夜间，王室离开巴黎向东逃亡，随后在瓦伦被截住。","During the night of 20–21 June, the royal family leaves Paris eastward and is subsequently stopped at Varennes."),detail:J("日期范围表示逃亡阶段；并不宣称拦截和确认身份都发生于同一时刻。回程另设日期与路线。","The range describes the flight phase, without assigning interception and confirmation of identity to one instant. The return has its own dates and route."),reconstruction:J("瓦伦现代城市参考点；连线为端点示意。逃亡阶段观察日为21日，22日的拘押后续不混作新的逃亡行程。","Modern Varennes reference and endpoint connector. The flight is observed on the 21st; custody developments on the 22nd are not a new outbound journey.")},{id:"ev-royal-return",stageIds:["h1791-return"],from:"1791-06-22",to:"1791-06-25",precision:"range",anchor:nn,regionId:"paris",kind:"evolution",layerIds:["route-royal-return"],sourceIds:["varennes-return","carnavalet-revolution"],title:J("王室回到巴黎","The royal family returns to Paris"),summary:J("6月25日，王室在护送下回到巴黎。","On 25 June the royal family returns to Paris under escort."),detail:J("回程处于议会和护送人员的控制下。巴黎的迎接气氛反映出君主信任的破裂。","The return is controlled by the Assembly and escorts. The reception in Paris reflects the rupture of confidence in the king."),reconstruction:J("22日至25日为被护送回程的阶段窗口，25日抵达有明确记录。独立曲线只表示相反的行进方向，不宣称与去程道路完全相同或不同。","22–25 June is the escorted-return window; arrival on the 25th is documented. A separate curve indicates reverse travel, without claiming identical or different historical roads.")},{id:"ev-war-declaration",stageIds:["h1792-war"],from:"1792-04-20",to:"1792-04-20",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["assembly-revolution"],title:J("法国向波希米亚和匈牙利国王宣战","France declares war on the King of Bohemia and Hungary"),summary:J("4月20日，立法议会使法国卷入对奥地利君主的战争。","On 20 April the Legislative Assembly brings France into war against the Austrian ruler."),detail:J("这是法国的宣战决定。普鲁士军队随后参加的夏季入侵，属于另一阶段。","This is the French declaration. The summer invasion involving Prussian forces is a separate phase."),reconstruction:Vt},{id:"ex-marseille",stageIds:["h1792-marseille"],from:"1792-06-01",to:"1792-07-29",precision:"season",anchor:vl,regionId:"marseille",kind:"scene",contentId:"ex-marseille",layerIds:["route-marseille-paris"],sourceIds:["marseille-history","marseille-memorial","elysee-marseillaise"],title:J("马赛：向巴黎出发","Marseille: Setting Out for Paris"),summary:J("1792年夏，马赛联省军北上巴黎，把一首战歌带进革命的公共生活。","In summer 1792, the Marseillais fédérés travel to Paris, carrying a war song into revolutionary public life."),detail:J("鲁热·德·利尔在斯特拉斯堡创作歌曲；马赛志愿者的传唱是另一段历程。7月15日只是夏季观察点，不是已证实的出发日。","Rouget de Lisle composes the song in Strasbourg; its adoption by the Marseillais is a distinct story. 15 July is a summer observation point, not a verified departure date."),reconstruction:J("城市参考点。夏季范围和7月15日观察点用于教学，不给出队伍当天的精确位置。场景叙述为史料基础上的重建。","City reference. The summer window and 15 July observation do not locate the battalion on that day. Scene narration is a source-based reconstruction.")},{id:"ev-marseillais-arrival",stageIds:["h1792-paris"],from:"1792-07-30",to:"1792-07-30",precision:"day",anchor:nn,regionId:"paris",kind:"evolution",layerIds:["route-marseille-paris"],sourceIds:["marseille-visit"],title:J("马赛联省军进入巴黎","The Marseillais enter Paris"),summary:J("马赛博物馆资料将抵达日期记为1792年7月30日。","The Marseille museum guide dates their arrival to 30 July 1792."),detail:J("北上的人员与歌曲传播相联系；这条连线终止于巴黎，不延伸成瓦尔密的同一支部队路线。","The northward journey helps spread the song. Its connector ends in Paris; it is not continued as the same unit’s route to Valmy."),reconstruction:Vt},{id:"ev-longwy",stageIds:["h1792-advance"],from:"1792-08-23",to:"1792-08-23",precision:"day",anchor:[5.761,49.52],regionId:"longwy",kind:"evolution",layerIds:["arrow-coalition-longwy"],sourceIds:["thil-longwy","valmy-site"],title:J("隆维失守","Longwy falls"),summary:J("8月23日，隆维围城结束，东北防线承受压力。","The siege of Longwy ends on 23 August, increasing pressure in the northeast."),detail:J("隆维与凡尔登是联军接近瓦尔密前的战役节点。此时地图不提前显示瓦尔密战斗已经发生。","Longwy and Verdun mark the coalition campaign before Valmy. This observation does not place the later battle in the present."),reconstruction:Vt},{id:"ev-verdun",stageIds:["h1792-advance"],from:"1792-09-02",to:"1792-09-02",precision:"day",anchor:[5.384,49.159],regionId:"verdun",kind:"evolution",layerIds:["arrow-coalition-argonne"],sourceIds:["carnavalet-verdun","lille-campaign","valmy-site"],title:J("凡尔登失守，阿尔贡承压","Verdun falls; pressure on the Argonne"),summary:J("9月2日的凡尔登失守属于入侵战役，仍早于瓦尔密会战。","The fall of Verdun on 2 September belongs to the invasion campaign, before Valmy."),detail:J("联军随后面对阿尔贡地区的阻滞。曲线只表达区域推进方向，并不复原某个团的逐日行军。","The coalition then faces obstruction in the Argonne. The curve gives a regional direction, not a regiment’s daily itinerary."),reconstruction:Vt},{id:"ex-valmy",stageIds:["h1792-valmy"],from:"1792-09-20",to:"1792-09-20",precision:"day",anchor:Zd,regionId:"valmy",kind:"scene",contentId:"ex-valmy",layerIds:["arrow-coalition-valmy","arrow-french-valmy"],sourceIds:["valmy-battle","valmy-location","valmy-art","valmy-campaign"],title:J("瓦尔密：守住阵地","Valmy: Hold the Line"),summary:J("9月20日，凯勒曼与迪穆里埃指挥的法军在瓦尔密阻止联军突破。","On 20 September, French forces under Kellermann and Dumouriez check the coalition at Valmy."),detail:J("炮击之中，法军保持阵地。会战、次日废除君主制和22日共和国纪年必须分开；地图不把联军全部撤离提前到当天。","The French hold their positions under cannon fire. The battle, next-day abolition, and republican dating on the 22nd are separate events; full coalition withdrawal is not shown on battle day."),reconstruction:J("瓦尔密历史中心公布的现代GPS参考点，位于战场丘陵附近。箭头仅示战役接近方向；不宣称复原战斗队形。","Modern GPS published by the Valmy historical centre, near the battlefield hills. The arrow indicates campaign approach, not reconstructed battle formations.")},{id:"ev-monarchy-abolished",stageIds:["h1792-monarchy"],from:"1792-09-21",to:"1792-09-21",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["assembly-revolution"],title:J("国民公会废除君主制","The Convention abolishes monarchy"),summary:J("9月21日，国民公会在巴黎废除君主制。","On 21 September the Convention abolishes monarchy in Paris."),detail:J("这是议会的制度决定，与20日瓦尔密的军事结果在时间和地点上不同。","This parliamentary decision is distinct in time and place from the military outcome at Valmy on the 20th."),reconstruction:Vt},{id:"ev-republic-year-one",stageIds:["h1792-republic"],from:"1792-09-22",to:"1792-09-22",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["assembly-revolution"],title:J("公共文件开始使用共和国纪年","Public acts begin republican dating"),summary:J("9月22日，公共文件开始以共和国元年纪年。","On 22 September public acts begin to be dated Year I of the Republic."),detail:J("这时尚未采用完整的共和历月份制度；共和历的制定属于1793年。","The full system of republican months is not yet in place; adoption of that calendar belongs to 1793."),reconstruction:Vt},{id:"ev-vendee-rising",stageIds:["h1793-vendee"],from:"1793-03-01",to:"1793-03-31",precision:"month",anchor:[-.95,46.85],regionId:"vendee",kind:"archive",layerIds:[],sourceIds:["vendee-insurrection"],title:J("旺代地区的起事演为内战","Insurrection becomes civil war in the Vendée region"),summary:J("3月，征兵引发的反抗与宗教、政治冲突交织。","In March, resistance to recruitment intersects with religious and political conflict."),detail:J("共和国军队与天主教保王起事者在西部作战，平民也受其害。这里的“旺代”不是现代省界内完全一致的政治阵营。","Republican forces and Catholic royalist insurgents fight in the west, also harming civilians. “Vendée” does not mean one uniform political camp within the modern department."),reconstruction:J("旺代战争区域的示意锚点；3月15日为月份观察点。没有可靠边界数据，不绘制领土控制面或统一部队行军线。","Schematic regional anchor for the war; 15 March is a monthly observation. Without reliable boundaries, no control polygon or unified army route is drawn.")},{id:"ev-cholet",stageIds:["h1793-vendee"],from:"1793-10-17",to:"1793-10-17",precision:"day",anchor:[-.879,47.06],regionId:"cholet",kind:"archive",layerIds:[],sourceIds:["vendee-cholet"],title:J("绍莱：起事军失利","Cholet: insurgent defeat"),summary:J("10月17日，旺代起事军在绍莱遭受重大失败。","On 17 October the Vendéan insurgents suffer a major defeat at Cholet."),detail:J("战败后的人员移动及继续扩大的暴力不能压缩成当天的一条已完成撤退路线。","Subsequent movement and continuing violence cannot be compressed into one retreat completed on battle day."),reconstruction:Vt},{id:"ev-lyon-revolt",stageIds:["h1793-lyon"],from:"1793-05-29",to:"1793-05-29",precision:"day",anchor:mo,regionId:"lyon",kind:"archive",layerIds:[],sourceIds:["lyon-archives","lyon-gadagne"],title:J("里昂的地方政治决裂","A local political rupture in Lyon"),summary:J("5月29日，里昂的雅各宾派市政当局被推翻。","On 29 May the Jacobin municipal government in Lyon is overthrown."),detail:J("里昂的联邦主义反抗有本地政治背景，不能直接等同旺代内战或土伦的外国军事介入。","Lyon’s federalist revolt has a local political setting, distinct from the Vendée civil war or foreign military intervention at Toulon."),reconstruction:Vt},{id:"ev-lyon-siege",stageIds:["h1793-lyon"],from:"1793-08-08",to:"1793-10-08",precision:"range",anchor:mo,regionId:"lyon",kind:"archive",layerIds:[],sourceIds:["lyon-archives","lyon-gadagne"],title:J("里昂被共和国军队围攻","Republican troops besiege Lyon"),summary:J("围城从8月延续到10月，城市遭炮击并出现粮食紧张。","The siege lasts from August into October, bringing bombardment and food shortages."),detail:J("市档案馆以8月8日作为围城起点。粮道并非完全切断；不应把城市记忆中的饥荒说成每条道路均已封锁。","The city archives date the siege from 8 August. Supply routes were not entirely cut, so remembered hunger should not become a claim of complete blockade."),reconstruction:J("城市锚点。资料不足以画出连续包围线、炮兵阵位或精确控制区，因此不绘制围城多边形。","City anchor. The evidence here does not establish a continuous encirclement, battery positions, or exact control area; no siege polygon is drawn.")},{id:"ev-lyon-capitulation",stageIds:["h1793-lyon"],from:"1793-10-09",to:"1793-10-09",precision:"day",anchor:mo,regionId:"lyon",kind:"archive",layerIds:[],sourceIds:["lyon-archives"],title:J("里昂投降","Lyon capitulates"),summary:J("10月9日，里昂投降；严厉镇压随后展开。","Lyon capitulates on 9 October; severe repression follows."),detail:J("投降是围城阶段的结束，并不意味着随后的处决、拆毁和城市改名都在当日完成。","Capitulation ends the siege phase; it does not put the later executions, demolitions, and renaming on that same day."),reconstruction:Vt},{id:"ev-toulon-siege",stageIds:["h1793-toulon"],from:"1793-09-01",to:"1793-12-17",precision:"range",anchor:yl,regionId:"toulon",kind:"evolution",layerIds:["arrow-republican-toulon"],sourceIds:["toulon-siege","marine-toulon"],title:J("土伦：保王派与外国舰队","Toulon: royalists and foreign fleets"),summary:J("港口被保王派交给外国力量后，共和国军队围攻土伦。","Republican troops besiege Toulon after royalists hand the port to foreign forces."),detail:J("英国和西班牙等国的军事介入，使这里兼有地方反抗和国际战争的性质。波拿巴在围城中担任炮兵军官。","Intervention by Britain, Spain, and others connects local revolt with international war. Bonaparte serves as an artillery officer during the siege."),reconstruction:J("土伦现代参考点。示意箭头只连接马赛方向与土伦，不复原炮位、舰船位置或包围边界。","Modern Toulon reference. The schematic arrow links the Marseille direction to Toulon, without reconstructing batteries, ships, or siege boundaries.")},{id:"ev-toulon-end",stageIds:["h1793-toulon"],from:"1793-12-18",to:"1793-12-20",precision:"range",anchor:yl,regionId:"toulon",kind:"archive",layerIds:[],sourceIds:["marine-toulon","toulon-siege"],title:J("土伦围城的结束","The end of the siege of Toulon"),summary:J("12月18日至20日前后，联军撤离，港口重回共和国控制。","Around 18–20 December the coalition evacuates and the port returns to Republican control."),detail:J("撤离、军港火灾和入城并非单一瞬间；这里按数日阶段呈现，不绘制精确海上撤退路线。","Evacuation, arsenal fires, and entry into the city are not one instant. This is a multi-day phase, without an exact naval retreat route."),reconstruction:J("使用数日范围，保留各来源对撤离和入城日期的差别。19日是本阶段观察点。","A multi-day interval preserves differences between sources on evacuation and entry. The 19th is the observation date for this phase.")},{id:"ev-thermidor-arrest",stageIds:["h1794-thermidor"],from:"1794-07-27",to:"1794-07-27",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["carnavalet-revolution"],title:J("热月九日：罗伯斯庇尔被捕","9 Thermidor: Robespierre is arrested"),summary:J("7月27日，罗伯斯庇尔及盟友在政治斗争中失势。","On 27 July Robespierre and his allies lose their political position."),detail:J("这一天的逮捕与次日的处决分开显示。此后的政治转向并非在一日内完成。","The arrests and next-day executions are shown separately. The subsequent political change does not occur in a single day."),reconstruction:Vt},{id:"ev-thermidor-execution",stageIds:["h1794-thermidor"],from:"1794-07-28",to:"1794-07-28",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["carnavalet-revolution"],title:J("热月十日：处决","10 Thermidor: executions"),summary:J("7月28日，罗伯斯庇尔与多名盟友被处决。","On 28 July Robespierre and several allies are executed."),detail:J("这成为革命政治转折的标志；不等于所有紧急统治措施在当日取消。","This marks a political turning point, without implying that every emergency measure ends that day."),reconstruction:Vt},{id:"ev-directory-constitution",stageIds:["h1795-directory"],from:"1795-08-22",to:"1795-08-22",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["senate-directory"],title:J("共和三年宪法","The Constitution of Year III"),summary:J("8月22日通过的宪法设置两院与五人督政府。","The constitution adopted on 22 August establishes two chambers and a five-member Directory."),detail:J("通过宪法与新机构实际接替国民公会是不同节点。","Adopting the constitution and replacing the Convention with new institutions are different milestones."),reconstruction:Vt},{id:"ev-convention-closes",stageIds:["h1795-directory"],from:"1795-10-26",to:"1795-10-26",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["carnavalet-chronology","senate-directory"],title:J("国民公会结束，制度转入新阶段","The Convention ends; institutions enter a new phase"),summary:J("10月26日，国民公会结束，三年宪法的制度开始接替。","On 26 October the Convention ends, giving way to institutions under the Year III Constitution."),detail:J("新制度由两院和五位督政官分担权力；本节点不把宪法通过日期写成政府就职日。","The new system divides authority between two chambers and five directors; this node does not confuse constitutional adoption with inauguration."),reconstruction:Vt},{id:"ev-brumaire-paris",stageIds:["h1799-brumaire"],from:"1799-11-09",to:"1799-11-09",precision:"day",anchor:nn,regionId:"paris",kind:"archive",layerIds:[],sourceIds:["assembly-brumaire"],title:J("雾月十八日：政变开始","18 Brumaire: the coup begins"),summary:J("11月9日，元老院决定把两院迁至圣克卢，政变开始。","On 9 November the Ancients vote to transfer both assemblies to Saint-Cloud as the coup begins."),detail:J("波拿巴及其政治盟友推动更换政体。下一日的关键场景在圣克卢。","Bonaparte and his political allies seek a change of regime. The next day’s decisive setting is Saint-Cloud."),reconstruction:Vt},{id:"ev-brumaire-saint-cloud",stageIds:["h1799-brumaire"],from:"1799-11-10",to:"1799-11-10",precision:"day",anchor:[2.214,48.838],regionId:"saint-cloud",kind:"archive",layerIds:[],sourceIds:["assembly-brumaire"],title:J("雾月十九日：圣克卢","19 Brumaire: Saint-Cloud"),summary:J("11月10日，部队驱散五百人院议员，政变进入决定阶段。","On 10 November troops disperse the Five Hundred as the coup reaches its decisive phase."),detail:J("取代督政府的正式表决延续到10日至11日夜间。本图在革命十年的雾月节点收束，不延伸至拿破仑战争。","Formal votes replacing the Directory extend into the night of 10–11 November. This map closes with Brumaire and does not extend into the Napoleonic wars."),reconstruction:Vt}],Kd=[{id:"route-marseille-paris",from:"1792-07-01",to:"1792-07-30",precision:"month",kind:"route",category:"people",faction:"federes-marseillais",title:J("马赛联省军北上（示意）","Marseillais journey north (schematic)"),description:J("7月行程的起终点示意；结束于巴黎。7月1日为显示窗口边界，不代表出发日。","July journey between supported endpoints, ending at Paris. 1 July bounds the display window; it is not a departure claim."),points:[vl,[4.45,45.25],[3.25,47.3],nn],widthKm:2,sourceIds:["marseille-memorial","marseille-visit"],reconstruction:go},{id:"arrow-coalition-longwy",from:"1792-08-23",to:"1792-09-01",precision:"range",kind:"arrow",category:"military",faction:"coalition",title:J("联军：隆维阶段","Coalition: Longwy phase"),description:J("隆维失守的观察阶段；不提前连到瓦尔密。","Observation following the fall of Longwy, without extending to the later battle at Valmy."),points:[[5.98,49.66],[5.89,49.6],[5.761,49.52]],widthKm:6,sourceIds:["thil-longwy","valmy-site"],reconstruction:Hr},{id:"arrow-coalition-argonne",from:"1792-09-02",to:"1792-09-19",precision:"range",kind:"arrow",category:"military",faction:"coalition",title:J("联军：凡尔登至阿尔贡方向","Coalition: Verdun toward the Argonne"),description:J("凡尔登失守后的区域战役示意；并非整段路线在9月2日已走完。","Regional campaign after Verdun falls; the whole connector is not claimed to have been traversed on 2 September."),points:[[5.761,49.52],[5.59,49.34],[5.384,49.159],[5.16,49.2]],widthKm:6,sourceIds:["carnavalet-verdun","valmy-site","lille-campaign"],reconstruction:Hr},{id:"arrow-coalition-valmy",from:"1792-09-20",to:"1792-09-20",precision:"day",kind:"arrow",category:"military",faction:"coalition",title:J("联军接近瓦尔密（区域示意）","Coalition approach to Valmy (regional schematic)"),description:J("从阿尔贡战役背景到瓦尔密附近的示意连接；不标注精确交战线，也不表示撤退已完成。","A schematic link from the Argonne campaign toward Valmy, without an exact front or a completed retreat."),points:[[5.16,49.2],[4.96,49.28],[4.72,49.23],[4.67,49.12],[4.74,49.065]],widthKm:6,sourceIds:["valmy-site","lille-campaign","valmy-battle"],reconstruction:Hr},{id:"arrow-french-valmy",from:"1792-09-20",to:"1792-09-20",precision:"day",kind:"arrow",category:"military",faction:"french-revolutionary",title:J("法军：圣默努方向至瓦尔密","French forces: Sainte-Menehould toward Valmy"),description:J("连接法军会合地区与瓦尔密附近；代表迪穆里埃和凯勒曼的战役背景，不是马赛联省军的延长线。","Links the French concentration area with Valmy: Dumouriez and Kellermann’s campaign context, not a continuation of the Marseillais route."),points:[[4.899,49.09],[4.86,49.105],[4.81,49.095],Zd],widthKm:5,sourceIds:["valmy-campaign","valmy-battle"],reconstruction:Hr},{id:"route-royal-escape",from:"1791-06-20",to:"1791-06-21",precision:"range",kind:"route",category:"people",faction:"royal-household",title:J("王室向东逃亡（示意）","Royal flight east (schematic)"),description:J("巴黎至瓦伦的端点连线；不标注驿站或逐小时车队位置。","Paris-to-Varennes endpoint link, without post stations or hourly carriage positions."),points:[nn,[3.25,48.9],[4.25,49.1],_l],widthKm:2,sourceIds:["carnavalet-revolution","versailles-flight"],reconstruction:go},{id:"route-royal-return",from:"1791-06-22",to:"1791-06-25",precision:"range",kind:"route",category:"people",faction:"escorted-royal-household",title:J("王室被护送回程（示意）","Escorted royal return (schematic)"),description:J("瓦伦至巴黎的独立回程图形；6月25日到达巴黎。控制点的偏移仅为区分方向。","A separate Varennes-to-Paris return graphic, arriving on 25 June. Offset control points distinguish direction only."),points:[_l,[4.2,49.3],[3.2,49.18],nn],widthKm:2,sourceIds:["varennes-return","carnavalet-revolution"],reconstruction:go},{id:"arrow-republican-toulon",from:"1793-09-01",to:"1793-12-17",precision:"range",kind:"arrow",category:"military",faction:"french-republican",title:J("共和国军队接近土伦（示意）","Republican approach to Toulon (schematic)"),description:J("从马赛方向到土伦的战役连接；不是1792年联省军北上的同一支队伍。","Campaign link from the Marseille direction to Toulon; not the same formation as the fédérés going north in 1792."),points:[vl,[5.58,43.32],[5.8,43.23],yl],widthKm:5,sourceIds:["toulon-siege"],reconstruction:Hr}];function Jd(n){if(!/^\d{4}-\d{2}-\d{2}$/.test(n))return!1;const e=new Date(`${n}T00:00:00Z`);return Number.isFinite(e.getTime())&&e.toISOString().slice(0,10)===n}function my(n,e){return!Jd(e)||!pn.some(t=>t.id===n)?[]:py.filter(t=>t.stageIds.includes(n)&&t.from<=e&&e<=t.to)}function gy(n){return Jd(n)?Kd.filter(e=>e.from<=n&&n<=e.to):[]}function vy(n,e,t){const i=pn.find(s=>s.id===e);return i?[...i.legacyChapterId?jd(n,i.legacyChapterId,t).map(s=>{const a=dy(s),o=a?.kind==="regional-anchor",l={zh:o?"教学虚构场景，仅标识所属区域，不是实录街道地址。":"采用现代地点参照，历史建筑基址仍需精校。",en:o?"Teaching reconstruction: a regional anchor, not a documented street address.":"Modern location reference; the historical footprint needs further verification."};return{id:s.event_id,title:{zh:s.event_name_zh,en:s.event_name_en},summary:{zh:s.location_name_zh,en:s.location_name_en},detail:l,anchor:a?[a.lon,a.lat]:null,regionId:$l(s),kind:s.event_role==="chapter_entry"?"scene":"archive",contentId:s.event_role==="chapter_entry"?i.legacyChapterId:void 0,layerIds:[],sourceIds:[],reconstruction:l,legacy:s}}):[],...my(e,t).map(s=>({...s}))]:[]}const Qd=(n,e)=>n+"|"+e;function _y(n){if(!n||typeof n!="object")return null;const e=n,t=pn.find(s=>s.id===e.stageId);if(e.apiVersion!=="fr1789-map/1"||!t||!t.dates.includes(e.date)||typeof e.selectedEvent!="string"||typeof e.previewOpen!="boolean")return null;const i=e.camera;if(!i||![i.position,i.target].every(s=>Array.isArray(s)&&s.length===3&&s.every(Number.isFinite))||!Number.isFinite(i.zoom)||i.zoom<.75||i.zoom>10||!e.layerSwitches||typeof e.layerSwitches.military!="boolean"||typeof e.layerSwitches.people!="boolean"||!e.progress||typeof e.progress!="object"||Array.isArray(e.progress))return null;const r=new Set(pn.flatMap(s=>s.dates.map(a=>Qd(s.id,a))));return Object.entries(e.progress).some(([s,a])=>!r.has(s)||!Number.isFinite(a)||a<0||a>1)?null:JSON.parse(JSON.stringify(e))}function yy(n,e,t){if(!n||typeof n!="object")return null;const i=n,r=Yl.find(s=>s.id===i.chapterId);if(!r||i.chapterId!==t.chapterId||i.date!==t.date||!["paris","versailles"].includes(String(i.regionId)))return null;if(i.eventId!==null){if(typeof i.eventId!="string")return null;const s=jd(e,r.id,t.date).find(a=>a.event_id===i.eventId);if(!s||$l(s)!==i.regionId)return null}return{kind:"city",regionId:i.regionId,chapterId:r.id}}function xy(n){return n.flatMap((e,t)=>e.dates.map((i,r)=>({stageId:e.id,date:i,year:e.year,title:{...e.title},stageOrder:t,dateOrder:r}))).sort((e,t)=>Yu(e.year,t.year)||Yu(e.date,t.date)||e.stageOrder-t.stageOrder||e.dateOrder-t.dateOrder).map(({stageId:e,date:t,year:i,title:r})=>({stageId:e,date:t,year:i,title:r}))}function Yu(n,e){return n<e?-1:n>e?1:0}function My(n){const e=Math.max(1,Math.floor(n));return{slots:e,rangeInset:.5/e,rangeSpan:1-1/e,thumbSize:17}}function eh(n,e,t){const i=n.findIndex(s=>s.stageId===e&&s.date===t);if(i>=0)return i;const r=n.findIndex(s=>s.stageId===e);return r>=0?r:n.length?0:-1}function th(n,e){const t=Number.isNaN(e)?0:Math.round(e);return n[Math.max(0,Math.min(n.length-1,t))]}function $u(n,e,t,i){return th(n,eh(n,e,t)+i)}const Sy={zh:{timeline:"历史时间轴",years:"选择年份",events:"本年历史观察点",previous:"上一个观察点",next:"下一个观察点",play:"播放当前演变",pause:"暂停当前演变",unavailable:"当前观察点没有可播放的演变",range:"拖动选择本年的历史观察点",note:"按事件顺序排列，间距不代表实际时长。",empty:"暂无历史观察点"},en:{timeline:"Historical timeline",years:"Choose a year",events:"Historical observations in this year",previous:"Previous observation",next:"Next observation",play:"Play current evolution",pause:"Pause current evolution",unavailable:"No playable evolution at this observation",range:"Choose a historical observation in this year",note:"Events follow chronological order; spacing does not represent elapsed time.",empty:"No historical observations"}};let by=0;function Ey(n,e){const t=n.ownerDocument,i=`timeline-${++by}`,r=xy(e.stages),s=[...new Set(r.map(de=>de.year))],a=new Map(s.map(de=>[de,r.filter(k=>k.year===de)]));let o=!1,l={stageId:r[0]?.stageId??"",date:r[0]?.date??"",language:"zh",playing:!1,canPlay:!1},c="",u=-1,d=0,h=!1,p=!1;function g(de,k){const ie=t.createElement(de);return ie.className=k,ie}const v=g("section","event-timeline");v.id=i;const m=g("div","event-timeline__toolbar"),f=g("nav","event-timeline__years"),E=g("div","event-timeline__controls");function _(de,k){const ie=g("button","event-timeline__control");return ie.type="button",ie.dataset.action=de,ie.textContent=k,E.append(ie),ie}const y=_("previous","‹"),A=_("play","▶"),S=_("next","›");m.append(f,E);const w=s.map(de=>{const k=g("button","event-timeline__year");return k.type="button",k.dataset.action="year",k.dataset.year=de,k.textContent=de,f.append(k),k}),R=g("div","event-timeline__current");R.id=`${i}-current`;const M=g("span","event-timeline__current-date"),x=g("strong","event-timeline__current-title"),I=g("span","event-timeline__count");I.setAttribute("aria-hidden","true"),R.append(M,x,I);const L=g("div","event-timeline__viewport"),C=g("div","event-timeline__axis"),U=g("ol","event-timeline__events");C.append(U),L.append(C);const F=r.map((de,k)=>{const ie=g("li","event-timeline__event-item"),we=g("button","event-timeline__event");we.type="button",we.dataset.action="observation",we.dataset.index=String(k);const D=g("span","event-timeline__event-date"),Ve=g("span","event-timeline__dot");Ve.setAttribute("aria-hidden","true");const ae=g("span","event-timeline__event-title");return we.append(D,Ve,ae),ie.append(we),U.append(ie),{item:ie,button:we,date:D,title:ae,observation:de}}),z=g("label","event-timeline__sr-only");z.htmlFor=`${i}-range`;const X=g("input","event-timeline__range");X.id=`${i}-range`,X.type="range",X.min="0",X.step="1",X.setAttribute("aria-describedby",`${i}-note`);const G=g("p","event-timeline__note");G.id=`${i}-note`,C.append(z,X),v.append(m,R,L,G),n.append(v);function $(de){o||!de||e.onSelect(de.stageId,de.date)}function ne(de){const ie=de.target?.closest("button");if(!(!ie||!v.contains(ie)||ie.disabled))switch(ie.dataset.action){case"previous":$($u(r,l.stageId,l.date,-1));break;case"next":$($u(r,l.stageId,l.date,1));break;case"play":l.canPlay&&e.onPlay();break;case"year":$(a.get(ie.dataset.year??"")?.[0]);break;case"observation":$(r[Number(ie.dataset.index)]);break}}function se(){$(th(a.get(c)??[],X.valueAsNumber))}function Ee(){p=!0}function Ne(){p&&(p=!1,Re())}function ve(de,k){const ie=de.getBoundingClientRect(),we=k.getBoundingClientRect();we.left<ie.left?de.scrollLeft+=we.left-ie.left-4:we.right>ie.right&&(de.scrollLeft+=we.right-ie.right+4)}function Re(){if(o||p)return;const de=F[u];de&&ve(L,de.button);const k=w.find(ie=>ie.dataset.year===c);k&&ve(f,k)}function j(de){if(o||h&&l.stageId===de.stageId&&l.date===de.date&&l.language===de.language&&l.playing===de.playing&&l.canPlay===de.canPlay&&X.valueAsNumber===d)return;l={...de};const k=Sy[l.language],ie=eh(r,l.stageId,l.date),we=r[ie],D=we?.year??"",Ve=a.get(D)??[],ae=we?Ve.indexOf(we):0,be=ie!==u||D!==c,me=!h||D!==c;if(c=D,u=ie,d=ae,h=!0,me){const Ce=My(Ve.length);C.style.setProperty("--timeline-slots",String(Ce.slots)),C.style.setProperty("--timeline-range-inset",`${Ce.rangeInset*100}%`),C.style.setProperty("--timeline-range-span",`${Ce.rangeSpan*100}%`),C.style.setProperty("--timeline-thumb-size",`${Ce.thumbSize}px`),X.max=String(Math.max(0,Ve.length-1))}v.lang=l.language==="zh"?"zh-CN":"en",v.setAttribute("aria-label",k.timeline),f.setAttribute("aria-label",k.years),U.setAttribute("aria-label",k.events),w.forEach(Ce=>{Ce.setAttribute("aria-pressed",String(Ce.dataset.year===D))}),F.forEach(({item:Ce,button:Je,date:ct,title:P,observation:b},W)=>{Ce.hidden=b.year!==D;const K=e.formatDate(b.date,b.stageId);ct.textContent=K,P.textContent=b.title[l.language],Je.title=`${K} · ${b.title[l.language]}`,Je.setAttribute("aria-label",Je.title),W===ie?Je.setAttribute("aria-current","step"):Je.removeAttribute("aria-current")});const qe=we?e.formatDate(we.date,we.stageId):"";M.textContent=qe,x.textContent=we?.title[l.language]??k.empty,x.title=x.textContent,I.textContent=we?`${ae+1} / ${Ve.length}`:"",z.textContent=k.range,X.valueAsNumber!==ae&&(X.value=String(ae)),X.disabled=Ve.length<2,X.setAttribute("aria-valuetext",we?`${qe} · ${we.title[l.language]}`:k.empty),X.style.setProperty("--timeline-progress",`${Ve.length>1?ae/(Ve.length-1)*100:0}%`),G.textContent=k.note,y.disabled=ie<=0,S.disabled=ie<0||ie>=r.length-1,A.disabled=!l.canPlay||!we,A.textContent=l.playing?"Ⅱ":"▶",A.setAttribute("aria-pressed",String(l.playing));const Se=l.canPlay?l.playing?k.pause:k.play:k.unavailable;for(const[Ce,Je]of[[y,k.previous],[A,Se],[S,k.next]])Ce.setAttribute("aria-label",Je),Ce.title=Je;be&&we&&Re()}v.addEventListener("click",ne),X.addEventListener("input",se),X.addEventListener("pointerdown",Ee),X.addEventListener("lostpointercapture",Ne),t.addEventListener("pointerup",Ne),t.addEventListener("pointercancel",Ne),t.defaultView?.addEventListener("blur",Ne),j(l);const Q=t.defaultView?.ResizeObserver,_e=typeof Q=="function"?new Q(Re):void 0;return _e?.observe(L),{update:j,dispose(){o||(o=!0,_e?.disconnect(),v.removeEventListener("click",ne),X.removeEventListener("input",se),X.removeEventListener("pointerdown",Ee),X.removeEventListener("lostpointercapture",Ne),t.removeEventListener("pointerup",Ne),t.removeEventListener("pointercancel",Ne),t.defaultView?.removeEventListener("blur",Ne),v.remove())}}}const pt=(n,e,t)=>({path:`art/stories-${n}.webp`,column:e,row:t}),wy={ch01:pt("a",0,0),ch02:pt("a",1,0),ch03:pt("a",0,1),ch04:pt("a",1,1),"h1789-fear":pt("b",0,0),"h1791-escape":pt("b",1,0),"h1791-return":pt("b",1,0),"h1792-war":pt("b",0,1),"h1792-marseille":pt("b",1,1),"h1792-paris":pt("e",1,1),"h1792-advance":pt("b",0,1),"h1792-valmy":pt("c",0,0),"h1792-monarchy":pt("c",1,0),"h1792-republic":pt("c",1,0),"h1793-vendee":pt("c",0,1),"h1793-lyon":pt("c",1,1),"h1793-toulon":pt("d",0,0),"h1794-thermidor":pt("d",1,0),"h1795-directory":pt("d",0,1),"h1799-brumaire":pt("d",1,1)};function Ty(n,e,t="",i=!1){if(i&&n==="ch01"&&["loc-street","loc-bakery","loc-printshop"].includes(t))return{path:`chapters/ch01/act1/media/${t==="loc-printshop"?"room":"street"}-preview.webp`,column:0,row:0,single:!0,source:"demo-frame"};if(n==="ch02"&&e==="1789-06-20")return pt("e",0,0);if(n==="ch03"&&e<"1789-07-14")return pt("e",1,0);if(n==="ch04"&&e==="1789-08-26")return pt("e",0,1);if(n==="ch01"&&/print|imprimer/i.test(t))return pt("a",1,1);const r=wy[n];if(!r)throw Error(`Unknown story stage: ${n}`);return{...r}}function jl(n,e){return n.find(t=>t.id===e)??n.find(t=>t.kind==="scene")??n[0]}function Ay(n,e){const t=new AbortController;let i,r,s="",a=0,o=!1;const l=document.createElement("article");l.id="story-card",l.className="story-card",l.hidden=!0,l.innerHTML='<button class="story-enter" id="story-enter"><span class="story-picture" role="img"></span><span class="story-wash"></span><span class="story-copy"><small class="story-date"></small><strong class="story-title"></strong><span class="story-summary"></span><span class="story-cta"><i aria-hidden="true">▶</i><span></span><b aria-hidden="true">→</b></span></span></button><div class="story-toolbar"><button id="story-previous" aria-label="上一件见闻">‹</button><span id="story-count"></span><button id="story-next" aria-label="下一件见闻">›</button><button id="story-details"></button><span class="story-art-note"></span></div>';const c=document.createElementNS("http://www.w3.org/2000/svg","svg");c.id="story-connector",c.setAttribute("aria-hidden","true"),c.innerHTML='<path/><circle r="4"/>',n.append(c,l);const u=E=>l.querySelector(E),d=u(".story-picture"),h=u(".story-enter"),p=c.querySelector("path"),g=c.querySelector("circle");function v(E){if(!i||!r)return;const _=i.events.findIndex(A=>A.id===r.id),y=i.events[(_+E+i.events.length)%i.events.length];y&&e.onSelect(y)}h.addEventListener("click",()=>{r&&e.onActivate(r)},{signal:t.signal}),u("#story-details").addEventListener("click",()=>{r&&e.onDetails(r)},{signal:t.signal}),u("#story-previous").addEventListener("click",()=>v(-1),{signal:t.signal}),u("#story-next").addEventListener("click",()=>v(1),{signal:t.signal});function m(E){if(o)return;if(i=E,r=jl(E.events,E.selected),l.hidden=!r,!r){c.style.display="none";return}const _=E.language==="zh";l.dataset.event=r.id,l.dataset.kind=r.kind,u(".story-date").textContent=E.dateLabel,u(".story-title").textContent=r.title[E.language],u(".story-summary").textContent=r.summary[E.language],u(".story-cta span").textContent=E.actionLabel,h.setAttribute("aria-label",`${E.actionLabel}：${r.title[E.language]}`),d.setAttribute("aria-label",(_?"历史场景美术重建：":"Illustrated reconstruction: ")+r.title[E.language]),u("#story-count").textContent=`${E.events.indexOf(r)+1} / ${E.events.length}`,u("#story-details").textContent=_?"详情与史料":"Details & sources",u(".story-art-note").textContent=_?"场景重建":"Reconstruction",u("#story-previous").setAttribute("aria-label",_?"上一件见闻":"Previous event"),u("#story-next").setAttribute("aria-label",_?"下一件见闻":"Next event"),u("#story-previous").disabled=E.events.length<2,u("#story-next").disabled=E.events.length<2;const y=E.artwork??Ty(E.stageId,E.date,r.legacy?.location_id,E.demoFrames);if(d.style.backgroundPosition=y.single?"center":`${y.column*100}% ${y.row*100}%`,d.style.backgroundSize=y.single?"cover":"200% 200%",y.source==="demo-frame"&&(d.setAttribute("aria-label",(_?"试接版场景视频画面：":"Scene video frame from the demo: ")+r.title[E.language]),u(".story-art-note").textContent=_?"试接版场景实帧":"Demo scene frame"),y.source==="delivery-frame"&&(d.setAttribute("aria-label",(_?"本章场景预览：":"Chapter scene preview: ")+r.title[E.language]),u(".story-art-note").textContent=_?"本章场景预览":"Chapter preview"),s!==y.path){s=y.path;const A=++a;d.style.backgroundImage="none",l.classList.remove("image-ready");try{const S=e.resolve(y.path),w=new Image;w.onload=()=>{o||A!==a||(d.style.backgroundImage=`url(${JSON.stringify(S)})`,l.classList.add("image-ready"))},w.onerror=()=>{},w.src=S}catch{}}}function f(E){if(o||l.hidden||!r?.anchor||n.clientWidth<=700){c.style.display="none";return}const _=E(...r.anchor);if(!_.visible){c.style.display="none";return}const y=n.getBoundingClientRect(),A=l.getBoundingClientRect(),S=A.left-y.left,w=A.right-y.left,R=A.top-y.top,M=A.bottom-y.top;if(_.x>=S&&_.x<=w&&_.y>=R&&_.y<=M){c.style.display="none";return}const x=_.x<S?S:_.x>w?w:_.x,I=Math.max(R+18,Math.min(M-40,_.y));c.style.display="block",c.setAttribute("viewBox",`0 0 ${n.clientWidth} ${n.clientHeight}`),p.setAttribute("d",`M ${x} ${I} L ${(x+_.x)/2} ${Math.min(I,_.y)-12} L ${_.x} ${_.y}`),g.setAttribute("cx",String(_.x)),g.setAttribute("cy",String(_.y))}return{update:m,project:f,element:l,dispose(){o=!0,a++,t.abort(),l.remove(),c.remove()}}}const Wn=(n,e)=>({zh:n,en:e}),Ry={"notre-dame":{id:"notre-dame",name:Wn("巴黎 · 圣母院","Paris · Notre-Dame"),anchor:[2.3499,48.853],sheet:"landmarks",column:0,row:0,foot:469/512},versailles:{id:"versailles",name:Wn("凡尔赛宫","Palace of Versailles"),anchor:[2.1204,48.8049],sheet:"landmarks",column:1,row:0,foot:433/512},"saint-jean":{id:"saint-jean",name:Wn("马赛 · 圣让堡","Marseille · Fort Saint-Jean"),anchor:[5.361,43.295],sheet:"landmarks",column:0,row:1,foot:414/512},bastille:{id:"bastille",name:Wn("巴士底狱","The Bastille"),anchor:[2.3692,48.8533],sheet:"landmarks",column:1,row:1,foot:408/512},windmill:{id:"windmill",name:Wn("瓦尔密风车","Valmy windmill"),anchor:[4.764,49.075],sheet:"battle-props",column:0,row:1},printing:{id:"printing",name:Wn("巴黎 · 印刷坊","Paris · Print workshop"),anchor:[2.34,48.857],sheet:"battle-props",column:1,row:1,vignette:!0}};function Cy(n,e,t){if(!t||!pn.some(s=>s.id===n))return[];let i;n==="ch01"&&/print|imprimer/i.test(t.legacy?.location_id??"")?i="printing":n==="ch03"&&e>="1789-07-12"&&e<="1789-07-14"?i="bastille":n==="h1792-valmy"&&e==="1792-09-20"?i="windmill":t.regionId==="versailles"?i="versailles":t.regionId==="marseille"?i="saint-jean":t.regionId==="paris"&&(i="notre-dame");const r=i?Ry[i]:void 0;return r?[{...r,anchor:[...r.anchor],eventId:t.id}]:[]}const vo={name:Wn("巴黎","Paris"),anchor:[2.3522,48.8566]},Py={name:Wn("马赛","Marseille"),anchor:[5.3698,43.2965]},ju={name:Wn("瓦伦","Varennes"),anchor:[5.035,49.227]};function Zl(n){if(n.includes("route-marseille-paris"))return{layerId:"route-marseille-paris",start:Py,end:vo};if(n.includes("route-royal-escape"))return{layerId:"route-royal-escape",start:vo,end:ju};if(n.includes("route-royal-return"))return{layerId:"route-royal-return",start:ju,end:vo}}const Zu=(n,e,t=5)=>n.left<e.right+t&&n.right>e.left-t&&n.top<e.bottom+t&&n.bottom>e.top-t;function Ly(n,e){const t=document.createElement("div");t.id="landmark-layer";const i=document.createElementNS("http://www.w3.org/2000/svg","svg");i.classList.add("landmark-guides"),i.setAttribute("aria-hidden","true"),t.append(i);const r=document.createElement("div");r.className="journey-markers",t.append(r),n.append(t);let s=[],a,o="",l=0,c=!1,u=[];function d(p){if(c)return;a=p;const g=JSON.stringify([p.stageId,p.date,p.language,p.event?.id,p.layerIds,p.people]);if(g===o)return;o=g;const v=++l;for(const f of s)f.button.remove(),f.line.remove();s=[],r.replaceChildren(),u=[];for(const f of Cy(p.stageId,p.date,p.event)){const E=document.createElement("button");E.type="button",E.className="landmark",E.dataset.landmark=f.id,E.hidden=!0;const _=p.language==="zh"?f.vignette?"场景示意":"城市地标 · 主体示意":f.vignette?"Scene illustration":"City landmark · Illustrated";E.innerHTML='<span class="landmark-art"></span><span class="landmark-name"></span><small></small>',E.querySelector(".landmark-name").textContent=f.name[p.language],E.querySelector("small").textContent=_,E.setAttribute("aria-label",f.name[p.language]+(p.language==="zh"?"，选择当前故事":" · Select the current story")),E.title=f.name[p.language]+" · "+_;const y=E.querySelector(".landmark-art");y.style.backgroundPosition=`${f.column*100}% ${f.row*100}%`,E.onclick=()=>e.onSelect(f.eventId);const A=document.createElementNS("http://www.w3.org/2000/svg","line");A.style.display="none",i.append(A),t.append(E);const S={data:f,button:E,line:A,ready:!1};s.push(S);try{const w=e.resolve(`art/${f.sheet}.webp`),R=new Image;R.onload=()=>{c||v!==l||(y.style.backgroundImage=`url(${JSON.stringify(w)})`,S.ready=!0,e.invalidate())},R.onerror=()=>{},R.src=w}catch{}}const m=p.people?Zl(p.layerIds):void 0;if(m)for(const[f,E]of[["start",m.start],["end",m.end]]){const _=document.createElement("span");_.className="journey-endpoint "+f,_.dataset.journey=m.layerId;const y=p.language==="zh"?f==="start"?"起点":"终点":f==="start"?"FROM":"TO";_.textContent=`${y} · ${E.name[p.language]}`,r.append(_),u.push({element:_,anchor:E.anchor})}}function h(p,g,v,m=!0){if(c||!a)return[];if(t.hidden=!m,!m)return[];const f=n.getBoundingClientRect(),E=[...v],_=[];i.setAttribute("viewBox",`0 0 ${n.clientWidth} ${n.clientHeight}`);for(const y of s){const{button:A,line:S,data:w}=y,R=p(...w.anchor);if(A.hidden=!0,S.style.display="none",!y.ready||!R.visible||g.some(C=>C.visible&&Math.hypot(R.x-C.anchorX,R.y-C.anchorY)<(n.clientWidth<=700?66:82)))continue;A.hidden=!1;const M=A.offsetWidth,x=M/1.5,I=x*(w.foot??.88);let L;for(const[C,U]of[[0,0],[30,20],[-38,24],[0,38]]){A.style.left=`${R.x+C-M/2}px`,A.style.top=`${R.y+U-I}px`;const F=A.getBoundingClientRect();if(F.left>=f.left+8&&F.right<=f.right-8&&F.top>=f.top+8&&F.bottom<=f.bottom-28&&!E.some(z=>Zu(F,z))){L={dx:C,dy:U},E.push(F),_.push(F);break}}if(!L){A.hidden=!0;continue}(L.dx||L.dy)&&(S.style.display="block",S.setAttribute("x1",String(R.x)),S.setAttribute("y1",String(R.y)),S.setAttribute("x2",String(R.x+L.dx)),S.setAttribute("y2",String(R.y+L.dy)))}for(const y of u){const A=p(...y.anchor),S=y.element;if(S.hidden=!A.visible,S.hidden)continue;let w=!1;for(const[R,M]of[[12,10],[-12,10],[12,28],[-12,28],[76,8],[-76,8],[12,-24],[-12,-24],[12,52],[-12,52]]){S.style.left=`${A.x+R-(R<0?S.offsetWidth:0)}px`,S.style.top=`${A.y+M}px`;const x=S.getBoundingClientRect();if(x.left>=f.left+6&&x.right<=f.right-6&&x.top>=f.top+8&&x.bottom<=f.bottom-30&&!E.some(I=>Zu(x,I))){E.push(x),_.push(x),w=!0;break}}S.hidden=!w}return _}return{update:d,project:h,element:t,dispose(){c=!0,l++,s=[],u=[],t.remove()}}}function Iy(n){if(!Number.isInteger(n)||n<8e3||n>192e3)throw new RangeError("Cannon sample rate must be an integer from 8000 to 192000 Hz");const e=Math.round(n*1.8),t=new Float32Array(e),i=new Float32Array(e),r=_=>1-Math.exp(-2*Math.PI*_/n),s=r(3200),a=r(180),o=r(850),l=r(24);let c=17920920,u=0,d=0,h=0,p=0,g=0,v=0;const m=Math.round(.173*n),f=Math.round(.291*n);for(let _=0;_<e;_++){const y=_/n;c=Math.imul(c,1664525)+1013904223>>>0;const A=c/2147483648-1;u+=s*(A-u),d+=a*(A-d);const S=Math.sin(Math.min(1,y/.004)*Math.PI/2)**2,w=2*Math.PI*(42*y+78*.038*(1-Math.exp(-y/.038))),R=Math.sin(w)+.22*Math.sin(w*1.87);t[_]=S*(1.25*u*Math.exp(-y/.028)+.8*R*Math.exp(-y/.155)+2.4*d*Math.exp(-y/.29));const M=(_>=m?.2*t[_-m]:0)+(_>=f?.09*t[_-f]:0);h+=o*(M-h);const x=t[_]+h;p+=l*(x-p);const I=Math.min(1,(e-1-_)/(n*.12));i[_]=(x-p)*I,g+=i[_],v+=S*Math.exp(-y/.18)*I}let E=0;for(let _=0;_<e;_++){const y=_/n,A=Math.sin(Math.min(1,y/.004)*Math.PI/2)**2*Math.exp(-y/.18)*Math.min(1,(e-1-_)/(n*.12));i[_]-=g/v*A,E=Math.max(E,Math.abs(i[_]))}for(let _=0;_<e;_++)i[_]*=.82/E;return i[0]=i[e-1]=0,i}function Dy(n={}){const e=globalThis.AudioContext??globalThis.webkitAudioContext,t=n.createContext??(e?()=>new e:null);let i=!0,r=!1,s=.7,a=!1,o=!!t,l=null,c=null,u=null;const d=new Set;function h(){return{enabled:i,active:r,ready:!a&&l?.state==="running",available:o,volume:s,voices:d.size,disposed:a}}let p=JSON.stringify(h());function g(){const _=h(),y=JSON.stringify(_);y!==p&&(p=y,n.onState?.(_))}function v(_){try{_?.disconnect()}catch{}}function m(_,y=!1){if(d.delete(_)){if(_.source.onended=null,y)try{_.source.stop()}catch{}v(_.source),v(_.panner)}}function f(){for(const _ of d)m(_,!0)}function E(){if(l){l.onstatechange=null;try{l.close().catch(()=>{})}catch{}}}return{async unlock(){if(!(a||!o||!t)){if(!l)try{l=t(),c=l.createGain(),c.gain.value=.6*s,c.connect(l.destination),l.onstatechange=()=>{a||(l?.state!=="running"&&f(),l?.state==="closed"&&(o=!1),g())}}catch{o=!1,v(c),E(),g();return}try{l.state!=="running"&&await l.resume()}catch{}a||g()}},setEnabled(_){a||(i=_,i||f(),g())},setActive(_){a||(r=_,r||f(),g())},setVolume(_){a||(s=Number.isFinite(_)?Math.max(0,Math.min(1,_)):0,c&&(c.gain.value=.6*s),s||f(),g())},fire(_){if(a||!i||!r||!s||l?.state!=="running"||!c||d.size>=2)return!1;let y=null;try{if(!u){const w=Iy(l.sampleRate);u=l.createBuffer(1,w.length,l.sampleRate),u.getChannelData(0).set(w)}const A=l.createBufferSource();y={source:A,panner:null},d.add(y),A.buffer=u,l.createStereoPanner?(y.panner=l.createStereoPanner(),y.panner.pan.value=Number.isFinite(_)?Math.max(-1,Math.min(1,_)):0,A.connect(y.panner),y.panner.connect(c)):A.connect(c);const S=y;return A.onended=()=>{m(S),a||g()},A.start(),g(),!0}catch{return y&&m(y,!0),g(),!1}},dispose(){a||(a=!0,r=!1,f(),v(c),E(),u=null,g())},snapshot:h}}function Uy(n){if(n.stageId!=="h1792-valmy"||n.date!=="1792-09-20"||!n.visible||!Number.isFinite(n.progress)||n.progress<0||n.progress>1)return null;const e=n.actors.find(i=>i.id==="arrow-french-valmy"&&i.kind==="french"),t=n.actors.find(i=>i.id==="arrow-coalition-valmy"&&i.kind==="coalition");return!Ku(e)||!Ku(t)?null:{active:n.progress>=.82&&(n.playing||n.progress===1)&&n.enabled&&!n.paused,french:Ju(e,t,"french"),coalition:Ju(t,e,"coalition")}}function Ku(n){return!!n?.visible&&n.width>0&&n.height>0&&[n.x,n.y,n.anchorX,n.anchorY,n.width,n.height].every(Number.isFinite)}function Ju(n,e,t){const i=e.x===n.x?t==="french"?1:-1:e.x>n.x?1:-1,r=Math.max(66,Math.min(84,n.width*1.12)),s=r*2/3,a=Math.max(66,Math.min(84,e.width*1.12)),o=(r+a)*.5+22,l=Math.min(58,Math.max(0,(o-Math.abs(e.x-n.x))/2)),c=n.x-i*l,u=n.y+32,d=i*r*.33,h=-s*.43,g=e.x+i*l-i*a*.33-(c+d),v=Math.max(-14,Math.min(14,e.y-n.y+(s-a*2/3)*.43)),m=Math.min(1,54/Math.hypot(g,v));return{x:c,y:u,width:r,height:s,facing:i,mirror:t==="french"?i:i===1?-1:1,atlasPosition:t==="french"?"0% 0%":"100% 0%",muzzleX:d,muzzleY:h,shotX:g*m,shotY:v*m}}function Ny(n,e){const t=n.ownerDocument,i=t.defaultView,r=t.createElement("div");r.className="fr-battle-overlay",r.setAttribute("aria-hidden","true"),r.hidden=!0;const s=E("french"),a=E("coalition");r.append(s.element,a.element),n.append(r);const o=i?.matchMedia("(prefers-reduced-motion: reduce)");let l=!1,c=!1,u=!1,d=!1,h=!0,p=!1,g,v;const m=Dy({onState:()=>r.dispatchEvent(new Event("battlesoundchange"))});function f(L){if(L.animationName!=="fr-battle-flash"||!d||l||t.hidden)return;const C=L.target;if(!C.classList?.contains("fr-battle-flash"))return;const U=C.closest(".fr-battle-gun");if(!U)return;const F=U===s.element?a.element:s.element,z=U.getBoundingClientRect().x<F.getBoundingClientRect().x?-.38:.38;m.setVolume(e.soundVolume?.()??.7),m.fire(z)}r.addEventListener("animationstart",f),r.addEventListener("animationiteration",f);function E(L){const C=t.createElement("div"),U=t.createElement("div"),F=t.createElement("div");C.className=`fr-battle-gun fr-battle-gun--${L}`,C.dataset.faction=L,U.className="fr-battle-prop",F.className="fr-battle-muzzle";const z=t.createElement("i"),X=t.createElement("i"),G=t.createElement("i");z.className="fr-battle-flash",X.className="fr-battle-shot",G.className="fr-battle-glow",F.append(G,z,X);for(let $=0;$<3;$++){const ne=t.createElement("i");ne.className=`fr-battle-smoke fr-battle-smoke--${$}`,F.append(ne)}return C.append(U,F),{element:C,prop:U,lastLayout:""}}function _(L,C){const U=[C.x,C.y,C.width,C.height,C.muzzleX,C.muzzleY,C.shotX,C.shotY].map(ve=>Math.round(ve*10)/10),F=`${U.join(",")},${C.mirror}`;if(L.lastLayout===F)return;L.lastLayout=F;const[z,X,G,$,ne,se,Ee,Ne]=U;L.element.style.transform=`translate(${z}px, ${X}px)`;for(const[ve,Re]of Object.entries({"--gun-width":`${G}px`,"--gun-height":`${$}px`,"--gun-mirror":`${C.mirror}`,"--gun-facing":`${C.facing}`,"--muzzle-x":`${ne}px`,"--muzzle-y":`${se}px`,"--shot-x":`${Ee}px`,"--shot-y":`${Ne}px`}))L.element.style.setProperty(ve,Re);L.prop.style.backgroundPosition=C.atlasPosition}function y(L){d!==L&&(d=L,r.classList.toggle("is-active",L),m.setActive(L),r.dispatchEvent(new Event("battleactivitychange")))}function A(){if(!(u||l)){u=!0;try{const L=e.resolveResource("art/battle-props.webp"),C=t.createElement("img");v=C,C.decoding="async",C.onload=()=>{if(!(l||v!==C)){if(c=C.naturalWidth>0&&C.naturalHeight>0,C.onload=C.onerror=null,v=void 0,c)for(const U of[s,a])U.prop.style.backgroundImage=`url(${JSON.stringify(L)})`;S()}},C.onerror=()=>{l||v!==C||(C.onload=C.onerror=null,v=void 0,c=!1,S())},C.src=L}catch{c=!1,v&&(v.onload=v.onerror=null),v=void 0}}}function S(){if(l)return;const L=g?Uy(g):null,C=!!L&&!t.hidden&&!p&&h&&n.isConnected;L&&C&&A(),r.hidden=!C||!c,L&&C&&c&&(_(s,L.french),_(a,L.coalition)),y(!r.hidden&&!!L?.active&&!o?.matches)}function w(L){l||(g={...L,actors:L.actors.map(C=>({...C}))},m.setVolume(e.soundVolume?.()??.7),S())}const R=()=>{p=!0,S()},M=()=>{p=!1,S()};t.addEventListener("visibilitychange",S),o?.addEventListener("change",S),i?.addEventListener("pagehide",R),i?.addEventListener("pageshow",M);const x=i?.IntersectionObserver?new i.IntersectionObserver(L=>{if(l)return;const C=L.find(U=>U.target===n);C&&h!==C.isIntersecting&&(h=C.isIntersecting,S())}):void 0;x?.observe(n);function I(){l||(l=!0,m.dispose(),r.removeEventListener("animationstart",f),r.removeEventListener("animationiteration",f),d=!1,g=void 0,x?.disconnect(),t.removeEventListener("visibilitychange",S),o?.removeEventListener("change",S),i?.removeEventListener("pagehide",R),i?.removeEventListener("pageshow",M),v&&(v.onload=v.onerror=null,v.removeAttribute("src"),v=void 0),r.classList.remove("is-active"),r.hidden=!0,r.remove())}return{update:w,unlockSound:m.unlock,setSoundEnabled:m.setEnabled,soundState:m.snapshot,isActive:()=>d&&!l&&!t.hidden&&n.isConnected,element:r,dispose:I}}const Fy="modulepreload",Oy=function(n,e){return new URL(n,e).href},Qu={},nh=function(e,t,i){let r=Promise.resolve();if(t&&t.length>0){let c=function(u){return Promise.all(u.map(d=>Promise.resolve(d).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};const a=document.getElementsByTagName("link"),o=document.querySelector("meta[property=csp-nonce]"),l=o?.nonce||o?.getAttribute("nonce");r=c(t.map(u=>{if(u=Oy(u,i),u in Qu)return;Qu[u]=!0;const d=u.endsWith(".css"),h=d?'[rel="stylesheet"]':"";if(i)for(let g=a.length-1;g>=0;g--){const v=a[g];if(v.href===u&&(!d||v.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${u}"]${h}`))return;const p=document.createElement("link");if(p.rel=d?"stylesheet":Fy,d||(p.as="script"),p.crossOrigin="",p.href=u,l&&p.setAttribute("nonce",l),document.head.appendChild(p),d)return new Promise((g,v)=>{p.addEventListener("load",g),p.addEventListener("error",()=>v(new Error(`Unable to preload CSS for ${u}`)))})}))}function s(a){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=a,window.dispatchEvent(o),!o.defaultPrevented)throw a}return r.then(a=>{for(const o of a||[])o.status==="rejected"&&s(o.reason);return e().catch(s)})},xl="chapters/ch01/act1/chapter.json",xa=n=>n?.catalog?.ch01.manifest===xl;function Li(n){const e=n?.act1Demo;return e&&typeof e=="object"&&!Array.isArray(e)?e:null}function By(n){const e=Li(n)?.street;return!!e&&typeof e=="object"&&e.enteredShop===!0}function zy(n,e){return n?.catalog?.ch01.status==="available"?n:{...n,apiVersion:"fr1789-host/1",catalog:{...cs,...n?.catalog,ch01:{status:"available",manifest:xl}},restartMode:{...n?.restartMode,ch01:"surface"},async chapter(t,i){if(t.kind==="chapter"&&t.contentId==="ch01"){const{createAct1Session:r}=await nh(async()=>{const{createAct1Session:s}=await import("./session-CafD1QSe.js");return{createAct1Session:s}},[],import.meta.url);if(i.signal.aborted)throw new DOMException("Entry cancelled","AbortError");return r(t,i)}if(n?.chapter)return n.chapter(t,i);throw new Error("This chapter has no connected player")},async loadManifest(t,i){if(t!==xl&&n?.loadManifest)return n.loadManifest(t,i);const r=await fetch(e(t),{signal:i});if(!r.ok)throw new Error(`Chapter manifest HTTP ${r.status}`);return r.json()}}}const Kl="delivery/20260912/",Fi=[["delivery-ch01","index.html","第一章 · 我们的意见也要算数","Chapter 1 · Our Voices Count","1789 · 春—6月"],["delivery-ch02","chapter02.html","第二章 · 门关了，会议没有结束","Chapter 2 · The Meeting Continues","1789 · 6—7月"],["delivery-ch03","chapter03.html","第三章 · 把权利写下来","Chapter 3 · Putting Rights into Words","1789 · 8—10月"],["delivery-ch04","chapter04.html","第四章 · 我们为什么不再要国王","Chapter 4 · Why We No Longer Want a King","1791—1793"],["delivery-ch05","chapter05.html","第五章 · 共和国不能倒下","Chapter 5 · The Republic Must Stand","1793—1794"],["delivery-ch06","chapter06.html","第六章 · 革命该怎样继续？","Chapter 6 · How Should the Revolution Continue?","1794—1799"],["delivery-ch07","chapter07.html","第七章 · 将军、法典与皇帝","Chapter 7 · General, Code and Emperor","1799—1815"],["delivery-ch08","chapter08.html","第八章 · 革命留下了什么？","Chapter 8 · What Did the Revolution Leave?","1815 · 回望1789"],["ex-valmy","ex-valmy.html","特别篇 · 瓦尔密：守住阵地","Valmy · Holding the Line","1792 · 9月"],["ex-marseille","ex-marseille.html","特别篇 · 马赛：向巴黎出发","Marseille · Setting Out for Paris","1792 · 夏"]].map(([n,e,t,i,r])=>({id:n,page:e,title:{zh:t,en:i},period:r,poster:`${Kl}previews/${n}.webp`}));function ky(n){if(n.contentId==="ex-valmy"||n.contentId==="ex-marseille")return n.contentId;const e=n.contentId??n.legacy?.chapter_id;if(e==="ch01")return"delivery-ch01";if(e==="ch02")return/tennis|paume|0620|06-20/i.test(n.id+" "+JSON.stringify(n.legacy??{}))?"delivery-ch02":"delivery-ch01";if(e==="ch03")return"delivery-ch02";if(e==="ch04")return"delivery-ch03";if(/royal|war-declaration|monarchy|republic-year|longwy|verdun/.test(n.id))return"delivery-ch04";if(/marseillais-arrival/.test(n.id))return"ex-marseille";if(/vendee|cholet|lyon|toulon|robespierre|thermidor/.test(n.id))return"delivery-ch05";if(/directory|convention-closes|brumaire/.test(n.id))return"delivery-ch06"}function Qy(n,e){if(typeof n!="string"||n.length>4096||/[\\\u0000-\u0020]/.test(n))return null;try{const t=new URL(n,e),i=new URL(e);if(t.origin!==i.origin||!t.pathname.startsWith(i.pathname)||t.hash)return null;const r=t.pathname.slice(i.pathname.length),s=r.replace(/^(chapter0[2678])-entry\.html$/,"$1.html"),a=Fi.find(c=>c.page===s);if(!a&&s!=="chapters.html")return null;const o=new Set(["returnTo","returnContext","extrasEpisode","extrasStatus","extrasContext","extrasMenu"]);let l=!1;return t.searchParams.forEach((c,u)=>{(!o.has(u)||c.length>2048||t.searchParams.getAll(u).length!==1)&&(l=!0),u==="returnTo"&&!["chapter04.html","chapters.html"].includes(c)&&(l=!0),u==="extrasEpisode"&&!["ex-valmy","ex-marseille"].includes(c)&&(l=!0),u==="extrasStatus"&&!["completed","exited"].includes(c)&&(l=!0)}),l?null:{id:a?.id??"directory",page:s,query:t.search}}catch{return null}}const ci="delivery20260912",ed=new Set(["frenchRevolution.language","fr1789.extras.language"]),td="frenchRevolution.music.v1";function rn(n){return n&&typeof n=="object"&&!Array.isArray(n)?St(n):{}}function nd(n){if(n.length>180||!/^[a-zA-Z0-9.\-]+$/.test(n))return;const e=/^frenchRevolution\.chapter([1-8])\./.exec(n);if(e)return`delivery-ch0${e[1]}`;const t=/^fr1789\.extras\.(ex-marseille|ex-valmy)\.v1(?:\.|$)/.exec(n);if(t)return t[1]}function Hy(n){const e=rn(n?.[ci]);return e.started===!0||Object.keys(rn(e.values)).length>0}function ex(n,e){const t=rn(n.chapter(e).read()?.[ci]);n.chapter(e).checkpoint({[ci]:{...t,version:1,values:{},started:!1}});const i=rn(n.chapter("delivery-ch01").read()?.deliveryShared);if(typeof i.music=="string")try{const r=rn(JSON.parse(i.music)),s=e.startsWith("delivery-ch")?"ch"+Number(e.slice(-2)):e,a=rn(r.bookmarks);let o=!1;Object.hasOwn(a,s)&&(delete a[s],r.bookmarks=a,o=!0),rn(r.last).scope===s&&(delete r.last,o=!0),o&&n.chapter("delivery-ch01").checkpoint({deliveryShared:{...i,music:JSON.stringify(r)}})}catch{}}function tx(n,e){const t=rn(n.chapter(e).read()?.[ci]);n.chapter(e).checkpoint({[ci]:{...t,version:1,started:!0}})}function nx(n,e,t){const i=s=>rn(rn(n.chapter(s).read()?.[ci]).values);function r(s,a){if(ed.has(s)){if(a!==null){if(!da(a)&&a!=="zh-CN")throw Error("Unsupported language");n.settings.update({language:Un(a)}),t?.()}return}if(s===td){const u=rn(n.chapter("delivery-ch01").read()?.deliveryShared);a!==null&&St(JSON.parse(a)),n.chapter("delivery-ch01").checkpoint({deliveryShared:{...u,music:a}});return}const o=nd(s);if(!o||o!==e)throw Error("Chapter storage key is outside the active delivery");const l=rn(n.chapter(o).read()?.[ci]),c=i(o);if(a===null)delete c[s];else{if(a.length>1e6)throw Error("Chapter save exceeds limit");St(JSON.parse(a)),c[s]=a}n.chapter(o).checkpoint({[ci]:{...l,version:1,started:!0,values:c}})}return{getItem(s){if(ed.has(s))return s==="fr1789.extras.language"?Pl(n.settings.read().language):n.settings.read().language;if(s===td){const l=rn(n.chapter("delivery-ch01").read()?.deliveryShared).music;return typeof l=="string"?l:null}const a=nd(s);if(!a)return null;const o=i(a)[s];return typeof o=="string"?o:null},setItem(s,a){r(String(s),String(a))},removeItem(s){r(String(s),null)},clear(){throw Error("Only the current chapter may be reset")},key(s){return Object.keys(i(e))[s]??null},get length(){return Object.keys(i(e)).length}}}const Ml=n=>`${Kl}manifests/${n}.json`,mi=n=>Fi.some(e=>n?.catalog?.[e.id]?.manifest===Ml(e.id)&&n.catalog[e.id].status==="available");function Vy(n,e){const t=new Set(Fi.filter(s=>n?.catalog?.[s.id]?.status!=="available").map(s=>s.id)),i={...cs,...n?.catalog},r={...n?.restartMode};for(const s of t)i[s]={status:"available",manifest:Ml(s)},r[s]="surface";return{...n,apiVersion:"fr1789-host/1",catalog:i,restartMode:r,async chapter(s,a){if(s.kind==="chapter"&&t.has(s.contentId)){const{createDeliverySession:o}=await nh(async()=>{const{createDeliverySession:l}=await import("./session-_JOdV8Ha.js");return{createDeliverySession:l}},[],import.meta.url);return o(s,a)}if(n?.chapter)return n.chapter(s,a);throw Error("No connected chapter player")},async loadManifest(s,a){if(!Fi.some(l=>t.has(l.id)&&s===Ml(l.id))&&n?.loadManifest)return n.loadManifest(s,a);const o=await fetch(e(s),{signal:a});if(!o.ok)throw Error(`Chapter manifest HTTP ${o.status}`);return o.json()}}}function Gy(n,e,t,i){if(!i)return;const r=t(n);return e.find(s=>s.id===r)}function Wy(n,e,t){if(n.id==="delivery-ch01"&&t==="ch01"&&["loc-street","loc-bakery"].includes(e.legacy?.location_id??""))return Ma(n,"zh",!1).artwork}function Ma(n,e,t){const i=e==="zh",r=n.id.startsWith("ex-"),s={"1789 · 春—6月":"1789 · Spring–June","1789 · 6—7月":"1789 · June–July","1789 · 8—10月":"1789 · August–October","1815 · 回望1789":"1815 · Looking back to 1789","1792 · 9月":"1792 · September","1792 · 夏":"1792 · Summer"};return{title:n.title[e],period:i?n.period:s[n.period]??n.period,action:t?"continue":"start",label:i?t?r?"继续特别篇":"继续本章":r?"开始特别篇":"开始本章":t?"Continue":"Start",status:i?t?"已存档":"尚未开始":t?"Saved":"Not started",note:i?"按本章已保存位置继续；首次进入从开头开始。地图日期不会跳过章内剧情。":"Continue from this chapter’s saved position, or start at the beginning. The map date does not skip chapter scenes.",languageNote:i?"正文：支持七种语言":"Story: available in seven languages",artwork:{path:n.poster,column:0,row:0,single:!0,source:"delivery-frame"}}}const N=n=>document.getElementById(n);let Ke="zh",xt="ch01",Mt="",Tt="",Jl=[],ge,ot,At=Xd,Ql=null;Ke=ha(mt.settings.read().language);let aa=!0,Sl=0;const qt=new AbortController;let ec,Ri,id="",Sa,hn;const ih=window.matchMedia("(prefers-reduced-motion: reduce)");let ui=!ih.matches,mn=!1,bl=!0;function Xy(){Sa?.dispose(),hn?.dispose()}const te=(n,e)=>Ke==="zh"?n:e;N("app").innerHTML=`
  <header class="topbar"><div class="brand"><div class="eyebrow">FRENCH REVOLUTION 1789</div><h1>法国大革命1789</h1></div><div class="top-tools"><span id="save-status" class="save-status" role="status" hidden></span><span class="edition">B · TERRAIN ATLAS</span><select id="language" aria-label="语言" data-i18n-ignore>${xh()}</select><button id="fullscreen" title="全屏" aria-label="全屏">⛶</button><button id="about" title="地图资料" aria-label="地图资料">i</button></div></header>
  <main id="stage"><section id="map-area" aria-label="法国国家地形图"><div class="map-backdrop" aria-hidden="true"><img id="map-backdrop-image" alt="" draggable="false" decoding="async" fetchpriority="low"></div><canvas id="map" tabindex="0" aria-label="可旋转的法国真实高程地图"></canvas><div class="map-caption"><span class="eyebrow" id="overline">法国 · 国家地形总图</span><h2 id="map-title">山河之间，1789</h2><span id="map-subtitle">从一个国家，走近一场革命。</span></div><div id="geo-labels"></div><div id="pins"></div><div id="loading"><span class="load-mark">1789</span><p id="loading-text">读取法国高程</p></div><nav class="view-tools" aria-label="地图视角"><button id="national" class="active">全国</button><button id="alps">阿尔卑斯</button><button id="pyrenees">比利牛斯</button><button id="paris">巴黎区域</button></nav><button id="auto-rotate" class="auto-rotate" aria-pressed="false" aria-label="开始自动旋转"><span aria-hidden="true" class="auto-icon">↻</span><span id="auto-rotate-label">自动旋转</span></button><div class="map-tools"><button id="reset" aria-label="复位视角" title="复位视角">↺</button><button id="zoom-in" aria-label="放大">+</button><button id="zoom-out" aria-label="缩小">−</button><button id="pan" title="切换平移" aria-pressed="false">✥</button></div><section id="history-controls" hidden aria-label="历史图层"><button class="layer-heading" id="layer-heading" aria-expanded="false"></button><label><input id="military-layer" type="checkbox" checked><span id="military-text"></span></label><label><input id="people-layer" type="checkbox" checked><span id="people-text"></span></label><div id="legend"></div><div class="evolution-controls"><button id="play-evolution"></button><button id="replay-evolution"></button></div><progress id="evolution-progress" max="1" value="1"></progress><small id="geometry-note"></small></section><div class="map-foot"><span id="gesture">拖动旋转 · 滚轮缩放 · 右键平移</span><span id="boundary-note">现代地貌数据 · 历史国界未复原</span></div><span class="north" title="北向随地图旋转" id="north">N ↑</span></section>
  <aside id="preview" hidden aria-label="事件预览"><div class="preview-top"><span class="eyebrow" id="preview-date"></span><button id="close-preview" aria-label="关闭预览">×</button></div><div class="preview-rule"></div><span class="preview-chapter" id="preview-chapter"></span><h2 id="preview-title"></h2><p id="preview-place"></p><p class="preview-description" id="preview-description"></p><div class="preview-actions"><button id="focus-event"></button><button id="region-request"></button></div><p id="request-feedback" role="status"></p><div class="related"><span class="eyebrow" id="related-label">同一时刻</span><div id="event-list"></div></div><span class="prototype-note" id="prototype-note">总图原型 · 章节内容尚未接入</span></aside></main>
  <footer class="timeline"><div class="time-meta"><div><span class="eyebrow" id="timeline-heading">革命的开端</span><span id="date-title">1789年春</span></div><div class="phase-tools"><select id="era" aria-label="历史年代 / Historical era"></select><button id="open-events">查看本阶段事件</button><label for="date" id="phase-label">时间</label><select id="date" aria-label="时间阶段"></select></div></div><nav id="chapters" aria-label="历史阶段 / Historical stages"></nav><div class="attribution"><span>IGN · BD ALTI / Natural Earth</span><span id="prototype">独立 B 方案 · 地形总图原型</span></div></footer>
  <dialog id="credits"><button id="close-credits" aria-label="关闭地图资料">×</button><span class="eyebrow">ATLAS NOTES</span><h2>地图资料 / Map notes</h2><p>故事封面与行进人物为 AI 生成的历史场景美术重建，不是当时的影像记录。人物沿示意方向移动，不代表逐日位置或真实兵力数量。章节入口优先展示已交付的场景预览；地图中的地理锚点不代表章内播放进度。</p><p>地貌使用 IGN BD ALTI 现代裸地高程，2026-09-07 获取，全国概览采样约 283 × 271 米。几何网格约 1.1 千米，细坡面法线来自更密的高程。显示高度统一夸张 16 倍。</p><p>海岸及陆地轮廓、主要河流：Natural Earth 5.1.2。范围为现代法国本土与科西嘉；不代表 1789 年国境。现代河道不能代替精确历史水文。</p><p>事件沿用 A 方案的章节与日期。教学虚构场景仅使用区域锚点，不冒称真实街道地址。现已接入八章和两个特别篇；地图事件进入对应章节的已保存位置或开头，章节目录包含后续年代内容。原四章存档保留。</p><p>远景背景：经审阅的 AI 生成墨绿色景观插画，用于环境延伸；山脉、海岸与村落为艺术示意，不作为历史地理依据。Background: reviewed AI-generated scenic artwork, not surveyed terrain or a historical reconstruction.</p><p>Terrain: IGN BD ALTI, Open Licence 2.0. Vectors: Natural Earth, public domain. Modern coverage is not the 1789 frontier. Vertical exaggeration: 16×.</p><a href="./third-party-notices.txt" target="_blank" rel="noopener">许可与来源 / Credits & licences ↗</a></dialog><div id="toast" role="status" hidden></div><pre id="debug" hidden></pre>`;const oa=N("map-backdrop-image");oa.addEventListener("error",()=>{oa.hidden=!0},{signal:qt.signal});try{oa.src=Nn("art/revolution-landscape-ink-green.webp")}catch{oa.hidden=!0}const El=[{lon:6.55,lat:45.65,zh:"阿尔卑斯山",en:"THE ALPS",kind:"mountain"},{lon:.6,lat:42.82,zh:"比利牛斯山",en:"PYRENEES",kind:"mountain"},{lon:2.7,lat:45.18,zh:"中央高原",en:"MASSIF CENTRAL",kind:"mountain"},{lon:-3.2,lat:48.25,zh:"布列塔尼",en:"BRITTANY",kind:"land"},{lon:-3.6,lat:45.5,zh:"大西洋",en:"ATLANTIC OCEAN",kind:"sea"},{lon:5.5,lat:42.4,zh:"地中海",en:"MEDITERRANEAN SEA",kind:"sea"},{lon:8.95,lat:42.02,zh:"科西嘉",en:"CORSICA",kind:"land"},{lon:.6,lat:47.35,zh:"卢瓦尔河",en:"LOIRE",kind:"river"},{lon:4.65,lat:44.9,zh:"罗讷河",en:"RHÔNE",kind:"river"}];let wl=[],pi={military:!0,people:!0};const di={},is=()=>Qd(xt,Mt),Rn=()=>pn.find(n=>n.id===xt),gr=(n,e=xt)=>n==="1793-03-15"?te("1793年3月","March 1793"):e==="h1793-toulon"?n==="1793-09-15"?te("1793年9月至12月","Sep–Dec 1793"):te("1793年12月18—20日","18–20 Dec 1793"):e==="h1792-marseille"?te("1792年夏","Summer 1792"):e==="h1789-fear"?te("1789年夏","Summer 1789"):n||te("1789年春","Spring 1789"),Pt=()=>vy(Jl,xt,Mt),Rr=()=>{const n=new Set(Pt().flatMap(e=>e.layerIds));return gy(Mt).filter(e=>n.has(e.id))},tc=document.createElement("section");tc.id="story-timeline";document.querySelector(".timeline").prepend(tc);ec=Ey(tc,{stages:pn,onSelect:(n,e)=>Er(n,e,!0),onPlay:rh,formatDate:gr});Ri=Ay(N("map-area"),{resolve:Nn,onSelect:Hi,onActivate:ah,onDetails:dc});Sa=Ly(N("map-area"),{resolve:Nn,invalidate:()=>ge?.invalidate(),onSelect:n=>{const e=Pt().find(t=>t.id===n);e&&(Hi(e),N("story-enter").focus({preventScroll:!0}))}});hn=Ny(N("map-area"),{resolveResource:Nn,soundVolume:()=>{const n=mt.settings.read();return n.muted?0:n.volume*.7}});hn.element.addEventListener("battlesoundchange",rc,{signal:qt.signal});hn.element.addEventListener("battleactivitychange",()=>{ic(),sc()},{signal:qt.signal});N("legend").insertAdjacentHTML("beforebegin",'<strong id="journey-summary" class="journey-summary" hidden></strong>');N("legend").insertAdjacentHTML("afterend",'<label class="scene-motion-control"><input id="scene-motion" type="checkbox"><span id="scene-motion-text"></span></label>');N("scene-motion").checked=ui;N("history-controls").querySelector(".evolution-controls").insertAdjacentHTML("beforeend",'<button type="button" id="battle-sound" hidden></button>');N("battle-sound").onclick=()=>{const n=hn?.soundState();if(!n)return;const e=!n.enabled||!n.ready;hn.setSoundEnabled(e),e&&hn.unlockSound(),rc()};N("scene-motion").onchange=()=>{ui=N("scene-motion").checked,mn=!ui,ui?fn():ki()};ih.addEventListener("change",n=>{n.matches&&(ui=!1,N("scene-motion").checked=!1,ki())},{signal:qt.signal});function nc(){return!!ge?.snapshot().history.playing||!!hn?.isActive()}function ki(){mn=!0,ge?.pauseHistory(),fn()}function Cr(n=!1,e=!0){e&&xt==="h1792-valmy"&&hn?.unlockSound(),mn=!1,ge?.playHistory(n),fn()}function rh(){nc()?ki():Cr()}function ic(){const n=nc(),e=Rr().length>0,t=JSON.stringify([xt,Mt,Ke,n,e]);t!==id&&(id=t,ec?.update({stageId:xt,date:Mt,language:Ke,playing:n,canPlay:e}))}function rc(){const n=document.getElementById("battle-sound");if(!n||!hn)return;const e=hn.soundState();n.hidden=xt!=="h1792-valmy",n.disabled=!e.available,n.dataset.audioState=e.available?e.enabled?e.ready?"ready":"locked":"muted":"unavailable",n.dataset.audioVoices=String(e.voices),n.setAttribute("aria-pressed",String(e.enabled&&e.ready)),n.textContent=e.available?e.enabled?e.ready?e.volume===0?te("总音量静音","Volume muted"):te("炮声：开","Sound: on"):te("开启炮声","Enable sound"):te("炮声：关","Sound: off"):te("声音不可用","No audio"),n.title=te("独立控制炮声；点击播放或开启炮声后启用，暂停时立即停止。","Cannon sound follows the firing. Enable sound or press Play; Pause stops it.")}function sc(){const n=ge?.snapshot().history,e=Zl(Rr().map(t=>t.id));N("play-evolution").textContent=nc()?te("暂停","Pause"):(n?.progress??1)<1?te("继续","Continue"):e?te("播放行进","Play journey"):te("播放演变","Play")}const Pr=n=>Gy(n,Fi,ky,mi(At)),ac=n=>At?.catalog?.[n]?.manifest===`${Kl}manifests/${n}.json`,ba=n=>Pr(n)?.id??(ls.includes(n.contentId)?n.contentId:void 0),Oi=n=>ac(n)?Hy(mt.chapter(n).read()):!!mt.chapter(n).read(),Tl=n=>!!At?.chapter&&(At.catalog??cs)[n]?.status==="available",Dn=n=>!mi(At)&&n.contentId==="ch01"&&xa(At);function hi(n){if(Dn(n))return n.legacy?.location_id==="loc-street"||n.legacy?.location_id==="loc-printshop"&&By(mt.chapter("ch01").read());const e=ba(n);return!!e&&Tl(e)}function sh(n){const e=Pr(n);return e?ua(e.id):Dn(n)?hi(n)?Li(mt.chapter("ch01").read())?te("继续第一幕 · 试接版","Continue Act I · Chinese demo"):te("进入第一幕 · 试接版","Enter Act I · Chinese demo"):te("查看第一幕的场景路线","View the Act I scene route"):n.kind==="archive"?te("阅读故事与史料","Read story & sources"):n.kind==="evolution"?te("观看地图演变","Watch the evolution"):hi(n)?ua(n.contentId):te("故事待接入 · 查看简介","Story pending · Read introduction")}function Lr(){const n=Pt(),e=jl(n,Tt),t=e?Pr(e):void 0;Ri?.update({stageId:xt,date:Mt,language:Ke,events:n,selected:Tt,dateLabel:gr(Mt),actionLabel:e?sh(e):"",demoFrames:!mi(At)&&xa(At),artwork:t&&e?Wy(t,e,xt):void 0}),Sa?.update({stageId:xt,date:Mt,language:Ke,event:e,layerIds:Rr().map(i=>i.id),people:pi.people})}function ah(n){Tt=n.id,ge?.setAutoRotate(!1),us();const e=Pr(n),t=ba(n);e&&t&&hi(n)?ot?.enter({kind:"chapter",contentId:t,action:Oi(t)?"continue":"start"}):n.kind==="archive"?uh(n):n.kind==="evolution"?Cr(!0):t&&hi(n)?Dn(n)?cc(Li(mt.chapter("ch01").read())?"continue":"start"):ot?.enter({kind:"chapter",contentId:t,action:Oi(t)?"continue":"start"}):(dc(n),Dn(n)||uc(te("场景封面已就绪，正式故事内容尚未接入。","The scene artwork is ready; the story package is not connected yet."))),Lr(),ge?.invalidate()}N("preview-place").insertAdjacentHTML("afterend",'<select id="mobile-events" aria-label="同阶段事件 / Events at this date"></select>');N("region-request").insertAdjacentHTML("beforebegin",'<button id="primary-action"></button><button id="restart-content" hidden></button><button id="event-evolution" hidden></button><button id="content-sources" hidden></button>');N("app").insertAdjacentHTML("beforeend",'<section id="host-root" hidden aria-label="城市与章节 / City and chapter"></section><dialog id="restart-dialog" aria-labelledby="restart-title"><h2 id="restart-title"></h2><p id="restart-description"></p><div class="restart-actions"><button id="cancel-restart"></button><button id="confirm-restart"></button></div></dialog>');N("language").insertAdjacentHTML("beforebegin",'<button id="open-delivery-menu" hidden></button>');N("app").insertAdjacentHTML("beforeend",'<dialog id="delivery-menu" aria-labelledby="delivery-menu-title" aria-describedby="delivery-menu-note"><header class="delivery-menu-heading"><div><span class="eyebrow">FRENCH REVOLUTION · CHAPTERS</span><h2 id="delivery-menu-title"></h2></div><button id="close-delivery-menu" type="button">×</button></header><p id="delivery-menu-note"></p><p class="delivery-position-note" id="delivery-position-note"></p><section aria-labelledby="delivery-main-heading"><h3 id="delivery-main-heading"></h3><div id="delivery-main-chapters" class="delivery-menu-grid"></div></section><section aria-labelledby="delivery-special-heading"><h3 id="delivery-special-heading"></h3><div id="delivery-specials" class="delivery-menu-grid"></div></section></dialog>');let rs=!1,Al=!1,la=!1;function oc(){const n=mi(At);N("open-delivery-menu").hidden=!n,N("open-delivery-menu").textContent=te("章节目录","Chapters"),N("open-delivery-menu").setAttribute("aria-label",te("打开八章与两个特别篇目录","Open eight chapters and two special episodes")),N("delivery-menu-title").textContent=te("八章 · 两个特别篇","Eight chapters · Two special episodes"),N("close-delivery-menu").setAttribute("aria-label",te("关闭章节目录","Close chapter directory")),N("delivery-menu-note").textContent=te("八章与特别篇均提供七种语言正文，进入章节后沿用当前语言。地图时间轴展示1789—1799，后续章节从本目录进入。","All eight chapters and the special episodes use your selected language. The map timeline covers 1789–1799; later chapters are available here."),N("delivery-position-note").textContent=te("按本章已保存位置继续；首次进入从开头开始。地图日期不会跳过章内剧情。","Continue from each chapter’s saved position, or start at the beginning. The map date does not skip chapter scenes."),N("delivery-main-heading").textContent=te("主线章节","Main chapters"),N("delivery-special-heading").textContent=te("特别篇","Special episodes"),N("delivery-main-chapters").replaceChildren(),N("delivery-specials").replaceChildren();for(const e of Fi){const t=Ma(e,Ke,Oi(e.id)),i=document.createElement("article");i.className="delivery-menu-card",i.dataset.contentId=e.id;const r=document.createElement("img");r.alt=te("章节场景预览：","Chapter scene preview: ")+t.title,r.loading="lazy",r.decoding="async",r.addEventListener("error",()=>{r.hidden=!0},{once:!0});try{r.src=Nn(e.poster)}catch{r.hidden=!0}const s=document.createElement("div");s.className="delivery-menu-copy";const a=document.createElement("small");a.className="delivery-period",a.textContent=t.period;const o=document.createElement("h4");o.textContent=t.title;const l=document.createElement("p");l.className="delivery-language",l.textContent=t.languageNote;const c=document.createElement("span");c.className="delivery-save-state",c.dataset.saved=String(t.action==="continue"),c.textContent=t.status;const u=document.createElement("div");u.className="delivery-menu-actions";const d=document.createElement("button");if(d.type="button",d.dataset.deliveryEnter=e.id,d.textContent=t.label,d.disabled=!n||!Tl(e.id),d.setAttribute("aria-label",t.label+te("：",": ")+t.title),d.onclick=()=>qy(e,t.action),u.append(d),t.action==="continue"){const h=document.createElement("button");h.type="button",h.className="delivery-replay",h.textContent=te("重播","Replay"),h.dataset.deliveryReplay=e.id,h.disabled=!n||!Tl(e.id),h.setAttribute("aria-label",te("重播：","Replay: ")+t.title),h.onclick=()=>{rs=!0,N("delivery-menu").close(),rs=!1,fh(e.id,e.title[Ke],!1,!0)},u.append(h)}s.append(a,o,l,c,u),i.append(r,s),N(e.id.startsWith("ex-")?"delivery-specials":"delivery-main-chapters").append(i)}}function lc(){if(!mi(At)||ot?.snapshot().current||ot?.snapshot().pending)return;oc(),ge?.setAutoRotate(!1),ki(),ge?.pause(),fn();const n=N("delivery-menu");n.open||n.showModal()}function qy(n,e){rs=!0,N("delivery-menu").close(),ot?.enter({kind:"chapter",contentId:n.id,action:e}).finally(()=>{rs=!1,!ot?.snapshot().current&&!ot?.snapshot().pending&&ge?.resume()})}N("open-delivery-menu").onclick=lc;N("close-delivery-menu").onclick=()=>N("delivery-menu").close();N("delivery-menu").addEventListener("close",()=>{!rs&&!document.querySelector("dialog[open]")&&!ot?.snapshot().current&&!ot?.snapshot().pending&&(ge?.resume(),N("open-delivery-menu").focus({preventScroll:!0}))},{signal:qt.signal});window.addEventListener("fr1789:open-delivery-menu",lc,{signal:qt.signal});N("app").insertAdjacentHTML("beforeend",'<dialog id="demo-language-dialog" aria-labelledby="demo-language-title"><h2 id="demo-language-title">Act I · Chinese demo</h2><p>This local preview contains the Paris street and printshop in Chinese only. The map will remain in English. This is a partial Chapter 1 delivery.</p><div class="restart-actions"><button id="demo-language-cancel">Return to map</button><button id="demo-language-enter">Continue in Chinese</button></div></dialog>');let oh="start";function cc(n){if(Ke==="en"){oh=n;const e=N("demo-language-dialog");e.open||e.showModal()}else ot?.enter({kind:"chapter",contentId:"ch01",action:n})}N("demo-language-cancel").onclick=()=>N("demo-language-dialog").close();N("demo-language-enter").onclick=()=>{N("demo-language-dialog").close(),ot?.enter({kind:"chapter",contentId:"ch01",action:oh})};N("app").insertAdjacentHTML("beforeend",'<dialog id="archive-panel" aria-labelledby="archive-title"><header><span class="eyebrow" id="archive-eyebrow"></span><button id="archive-close" aria-label="关闭 / Close">×</button></header><h2 id="archive-title"></h2><div id="archive-body"></div><footer><button id="return-scene"></button></footer></dialog>');function lh(){Tt="",N("preview").hidden=!0,N("stage").classList.remove("has-preview")}function ch(){N("preview").hidden=!0,N("stage").classList.remove("has-preview"),Lr(),N("story-enter").focus(),us(),ge?.invalidate()}function uc(n){N("toast").textContent=n,N("toast").hidden=!1,clearTimeout(Sl),Sl=window.setTimeout(()=>{aa&&(N("toast").hidden=!0)},4e3)}function Hi(n){ge?.setAutoRotate(!1),ki(),Tt=n.id,Lr(),hc(),us(),ge?.invalidate()}function dc(n){Hi(n),N("preview").hidden=!1,N("stage").classList.add("has-preview"),N("close-preview").focus(),ge?.invalidate()}function us(){ge?.configureHistory(pi,Pt().find(n=>n.id===Tt)?.layerIds??[])}function ca(){ge?.setHistory(Rr(),di[is()]??1),us(),hh()}function Er(n,e,t=!1){const i=pn.find(a=>a.id===n);if(!i)throw Error("Unknown historical stage");const r=is();ge&&(di[r]=ge.snapshot().history.progress),xt=n,Mt=e&&i.dates.includes(e)?e:i.dates[n==="ch04"?1:0],mn=!t,lh(),ge?.setAutoRotate(!1),ca(),wr(),t&&ui&&r!==is()&&Rr().some(a=>a.kind==="route"||a.kind==="arrow")&&Cr(!0,!1);const s=new URL(location.href);s.searchParams.set("stage",xt),Mt?s.searchParams.set("date",Mt):s.searchParams.delete("date"),void s}const Yy=n=>n==="scene"?te("可进入现场","Scene episode"):n==="evolution"?te("地图演变","Map evolution"):te("史料阅读","Historical reading");function hc(){const n=Pt().find(r=>r.id===Tt);if(!n)return;const e=Pr(n),t=ba(n);if(N("preview-date").textContent=gr(Mt),N("preview-chapter").textContent=Yy(n.kind),N("preview-title").textContent=n.title[Ke],N("preview-place").textContent=n.summary[Ke],N("preview-description").textContent=n.detail[Ke],N("focus-event").textContent=te("在地图上近观","Focus on the map"),N("focus-event").disabled=!n.anchor,N("primary-action").textContent=e?ua(e.id):Dn(n)?hi(n)?sh(n):Li(mt.chapter("ch01").read())?te("继续第一幕 · 已保存的位置","Continue Act I · Saved position"):te("进入巴黎街市 · 第一幕","Enter the Paris street · Act I"):n.kind==="scene"?ua(n.contentId):n.kind==="evolution"?te("播放这段演变","Play this evolution"):te("阅读历史资料","Read historical sources"),N("restart-content").hidden=!e&&n.kind!=="scene"||!t||!hi(n)||(Dn(n)?!Li(mt.chapter("ch01").read()):!Oi(t)),N("restart-content").textContent=Dn(n)?te("重播已交付第一幕","Replay delivered Act I"):e?te("重播本章","Replay this chapter"):te("重新开始本篇","Restart this episode"),N("content-sources").hidden=!e&&n.kind!=="scene",N("content-sources").textContent=te("阅读历史资料","Read historical sources"),N("event-evolution").hidden=!e||!n.layerIds.length,N("event-evolution").textContent=te("观看地图演变","Watch map evolution"),N("region-request").hidden=!Rn().legacyChapterId||!["paris","versailles"].includes(n.regionId),N("region-request").textContent=At?.city?te("进入城市近景","Enter city view"):te("城市近景 · 待宿主","City view · Host needed"),N("request-feedback").textContent="",N("related-label").textContent=te("当前阶段","AT THIS STAGE"),N("prototype-note").textContent=n.reconstruction[Ke],Dn(n)&&(N("preview-chapter").textContent=te("第一章 · 第一幕试接版","Chapter 1 · Act I integration demo"),N("preview-description").textContent=te("已交付：巴黎街道交谈 → 街道小结 → 回印刷店 → 身份判断与小结。面包店人物在街道中交谈；印刷店需按剧情进入。本试接版为中文内容，第一章后续尚未交付。","Delivered: street conversations → street recap → printshop → identity question and recap. Meet the bakery clerk in the street, then follow the story into the printshop. Chinese content only; later parts of Chapter 1 are not delivered."),hi(n)||(N("request-feedback").textContent=Li(mt.chapter("ch01").read())?te("此处是第一幕的场景说明。继续会回到已保存的位置；重播会从街道重新开始。","This is an Act I location overview. Continue returns to your saved position; replay starts from the street."):te("请从巴黎街市开始，按剧情走到此处；不会跳过知识与对话。","Start at the Paris street and follow the story here. Conversations and learning gates remain in order."))),e){const r=Ma(e,Ke,Oi(e.id));N("preview-chapter").textContent=e.title[Ke],N("request-feedback").textContent=r.note+" "+r.languageNote}const i=N("mobile-events");i.replaceChildren(),N("event-list").replaceChildren();for(const r of Pt()){const s=document.createElement("option");s.value=r.id,s.textContent=r.title[Ke],i.append(s);const a=document.createElement("button");a.textContent=r.title[Ke],a.dataset.eventId=r.id,a.classList.toggle("selected",r.id===Tt),a.onclick=()=>Hi(r),N("event-list").append(a)}i.value=Tt}function uh(n){ge?.setAutoRotate(!1),mn=!0,ge?.pause(),fn(),N("archive-eyebrow").textContent=te("资料与重建说明","SOURCES & RECONSTRUCTION"),N("archive-title").textContent=n.title[Ke];const e=N("archive-body");e.replaceChildren();for(const t of[n.detail[Ke],n.reconstruction[Ke]]){const i=document.createElement("p");i.textContent=t,e.append(i)}for(const t of n.sourceIds){const i=hy.find(s=>s.id===t);if(!i)continue;const r=document.createElement("a");r.href=i.url,r.target="_blank",r.rel="noopener",r.textContent=i.title,e.append(r)}if(!n.sourceIds.length){const t=document.createElement("p");t.textContent=te("来源：项目原四章地点与时间映射；虚构街区仅作为教学区域锚点。","Source: the original chapter place/time index. Fictional streets are teaching anchors only."),e.append(t)}N("return-scene").textContent=te("返回地图","Return to map"),N("archive-panel").showModal()}function fc(){const n=N("archive-panel");n.open&&(n.close(),ge?.resume(),N(N("preview").hidden?"story-enter":"primary-action").focus())}function dh(){N("pins").replaceChildren(),wl=[];const n=(ge?.snapshot().camera.zoom??1)>3.5,e=[];for(const t of Pt().filter(i=>i.anchor)){let i=e.find(r=>{if(n)return t.legacy&&r[0].legacy?t.legacy.location_id===r[0].legacy.location_id:t.id===r[0].id;const s=ge?.screen(...t.anchor),a=ge?.screen(...r[0].anchor);return s&&a?Math.hypot(s.x-a.x,s.y-a.y)<130:t.regionId===r[0].regionId});i||e.push(i=[]),i.push(t)}for(const t of e){const i=t[0],r=document.createElement("button");r.className="event-pin",r.setAttribute("aria-label",i.title[Ke]);const s=t.length>1?i.regionId==="paris"?te("巴黎","Paris"):i.regionId==="versailles"?te("凡尔赛","Versailles"):i.title[Ke]:i.title[Ke];r.innerHTML='<svg class="pin-leader" aria-hidden="true"><line x1="0" y1="0" x2="20" y2="0"/></svg><span class="pin-dot"></span><span class="pin-label"><span></span><small></small></span>',r.querySelector(".pin-label>span").textContent=s,r.querySelector("small").textContent=te(`${t.length} 件见闻 ↗`,`${t.length} events ↗`),r.onclick=()=>Hi(i),N("pins").append(r),wl.push({button:r,anchor:i.anchor,rows:t})}fn()}function fn(){if(!ge)return;const n=[],e=N("map-area").getBoundingClientRect(),t=jl(Pt(),Tt);n.push(document.querySelector(".map-caption").getBoundingClientRect()),N("history-controls").hidden||n.push(N("history-controls").getBoundingClientRect()),Ri&&!Ri.element.hidden&&N("preview").hidden&&n.push(Ri.element.getBoundingClientRect());const i=ge.snapshot(),r=i.history.actors;hn?.update({stageId:xt,date:Mt,language:Ke,actors:r,progress:i.history.progress,playing:i.history.playing,enabled:ui,paused:mn,visible:bl&&!i.paused&&!document.hidden});for(const c of[".view-tools",".map-tools",".auto-rotate",".north"]){const u=document.querySelector(c);u&&u.offsetWidth&&n.push(u.getBoundingClientRect())}for(const c of r)c.visible&&n.push(new DOMRect(e.left+c.x-c.width/2,e.top+c.y-c.height,c.width,c.height+14));n.push(...Sa?.project(ge.screen,r,n,bl)??[]);for(const c of wl){const u=ge.screen(...c.anchor);c.button.hidden=!u.visible,c.button.style.left=u.x+"px",c.button.style.top=u.y+"px";const d=N("preview").hidden&&c.rows.some(f=>f.id===t?.id);c.button.dataset.storyActive=String(d);const h=c.button.querySelector(".pin-label");if(d)continue;const p=c.anchor[0]>3.5&&c.rows.some(f=>f.layerIds.some(E=>Kd.find(_=>_.id===E)?.category==="military")),g=h.offsetWidth,v=Math.max(8-u.x,Math.min(e.width-g-8-u.x,p?-(g+20):20));h.style.left=v+"px",c.button.querySelector("line").setAttribute("x2",String(v<0?v+g:v));let m=0;for(const f of p?[-75,75,-130,130,0]:[0,-58,58,-116,116]){h.style.transform=`translateY(${f}px)`;const E=h.getBoundingClientRect();if(E.top>=e.top+8&&E.bottom<=e.bottom-35&&!n.some(_=>E.left<_.right+8&&E.right>_.left-8&&E.top<_.bottom+6&&E.bottom>_.top-6)){m=f;break}}h.style.transform=`translateY(${m}px)`,c.button.querySelector("line").setAttribute("y2",String(m)),u.visible&&n.push(h.getBoundingClientRect())}for(let c=0;c<El.length;c++){const u=El[c],d=N("geo-"+c);if(!d)continue;const h=ge.screen(u.lon,u.lat,u.kind==="mountain"?.035:.005);d.style.left=h.x+"px",d.style.top=h.y+"px",d.hidden=!h.visible||h.y>e.height-60||h.y<35;const p=d.getBoundingClientRect();!d.hidden&&n.some(g=>p.left<g.right+12&&p.right>g.left-12&&p.top<g.bottom+8&&p.bottom>g.top-8)?d.hidden=!0:d.hidden||n.push(p)}const s=ge.snapshot(),a=s.camera.position,o=s.camera.target,l=Math.atan2(a[0]-o[0],a[2]-o[2]);N("north").style.transform=`rotate(${l}rad)`,pc(s.autoRotate),N("evolution-progress").value=s.history.progress,N("play-evolution").textContent=s.history.playing?te("暂停","Pause"):s.history.progress>=1?te("播放演变","Play"):te("继续","Continue"),di[is()]=s.history.progress,Ri?.project(ge.screen),sc(),ic(),new URLSearchParams(location.search).has("debug")&&(N("debug").hidden=!1,N("debug").textContent=JSON.stringify({LOD:s.level,triangles:s.triangles,calls:s.drawCalls,frames:s.totalFrames,DPR:s.viewport.dpr,zoom:s.camera.zoom.toFixed(2),history:s.history.audit},null,2))}function pc(n=ge?.snapshot().autoRotate??!1){const e=te(n?"停止旋转":"自动旋转",n?"Stop rotation":"Auto rotate");N("auto-rotate-label").textContent=e,N("auto-rotate").setAttribute("aria-pressed",String(n)),N("auto-rotate").setAttribute("aria-label",e)}function hh(){rc();const n=Rr();N("history-controls").hidden=!n.length,N("layer-heading").textContent=te("地图图层","MAP LAYERS")+" · "+n.length,N("military-text").textContent=te("军事态势","Military situation"),N("people-text").textContent=te("人员与传播","People & circulation"),N("replay-evolution").textContent=te("重播","Replay"),N("geometry-note").textContent=te("方向/范围示意 · 非逐站路线或精确战线","Schematic directions/areas, not surveyed routes or front lines"),N("scene-motion-text").textContent=te("自动演示与场景动效","Automatic scene motion"),N("scene-motion").checked=ui;const e=Zl(n.map(t=>t.id));N("journey-summary").hidden=!e,e&&(N("journey-summary").textContent=`${e.start.name[Ke]} → ${e.end.name[Ke]}`),N("legend").replaceChildren();for(const t of n){const i=document.createElement("div"),r=document.createElement("i");r.style.background="#"+gl(t.faction).toString(16).padStart(6,"0"),i.append(r,document.createTextNode(t.title[Ke])),N("legend").append(i)}N("military-layer").checked=pi.military,N("people-layer").checked=pi.people,sc()}function wr(){oc(),mc(),document.documentElement.lang=Pl(mt.settings.read().language),document.querySelector("h1").textContent=te("法国大革命1789","French Revolution 1789"),N("language").value=mt.settings.read().language,N("overline").textContent=te("法国 · 国家地形总图","FRANCE · TERRAIN ATLAS"),N("map-title").textContent=te("山河之间，"+Rn().year,Rn().year==="1789"?"A land on the verge":"A country in revolution"),N("map-subtitle").textContent=te("从一个国家，走近一场革命。","A country through a decade of revolution."),pc();for(const[i,r,s]of[["national","全国","France"],["alps","阿尔卑斯","The Alps"],["pyrenees","比利牛斯","Pyrenees"],["paris","巴黎区域","Paris region"]])N(i).textContent=te(r,s);N("gesture").textContent=te("拖动旋转 · 滚轮缩放 · 右键平移","Drag to rotate · Scroll to zoom · Right-drag to pan"),N("boundary-note").textContent=te("现代地貌裁切 · 不代表所选年代疆界","Modern terrain crop · Not the selected historical frontier"),N("timeline-heading").textContent=te("革命的历程","THE REVOLUTION"),N("date-title").textContent=gr(Mt),N("phase-label").textContent=te("时间","Date"),N("prototype").textContent=te("全国历史地图 · 1789—1799","Historical atlas · 1789–1799"),N("open-events").textContent=te(`本阶段 ${Pt().length} 件见闻`,`Explore ${Pt().length} events`);const n=N("era");n.replaceChildren();for(const i of[...new Set(pn.map(r=>r.year))]){const r=document.createElement("option");r.value=i,r.textContent=i,n.append(r)}n.value=Rn().year;const e=N("date");e.replaceChildren();for(const i of Rn().dates){const r=document.createElement("option");r.value=i,r.textContent=gr(i),e.append(r)}e.value=Mt,N("chapters").replaceChildren();const t=pn.filter(i=>i.year===Rn().year);N("chapters").classList.toggle("extended",t.length>4||!Rn().legacyChapterId);for(const i of t){const r=document.createElement("button");r.dataset.chapter=i.id,r.dataset.stage=i.id,r.setAttribute("aria-pressed",String(i.id===xt));const s=Yl.findIndex(a=>a.id===i.id);r.innerHTML='<span class="chapter-number"></span><span class="chapter-copy"><span></span><small></small></span>',r.querySelector(".chapter-number").textContent=s>=0?"0"+(s+1):"·",r.querySelector(".chapter-copy>span").textContent=i.title[Ke],r.querySelector("small").textContent=s>=0?["SPRING 1789","MAY — JUNE 1789","JULY 1789","AUGUST 1789"][s]:gr(i.dates[0],i.id),r.onclick=()=>{Er(i.id),N("chapters").querySelector(`[data-stage="${xt}"]`)?.scrollIntoView({block:"nearest",inline:"nearest"})},N("chapters").append(r)}N("geo-labels").replaceChildren(),El.forEach((i,r)=>{const s=document.createElement("span");s.id="geo-"+r,s.className="geo-label "+i.kind,s.innerHTML=`${te(i.zh,i.en)}${Ke==="zh"?`<small>${i.en}</small>`:""}`,N("geo-labels").append(s)}),Lr(),dh(),hc(),hh(),ic(),ge?.invalidate()}N("layer-heading").onclick=()=>{const n=N("history-controls").classList.toggle("expanded");N("layer-heading").setAttribute("aria-expanded",String(n)),ge?.invalidate()};bh(mt,()=>{Ke=ha(mt.settings.read().language),wr()});N("close-preview").onclick=ch;N("era").onchange=()=>Er(pn.find(n=>n.year===N("era").value).id);N("date").onchange=()=>Er(xt,N("date").value);N("open-events").onclick=()=>{const n=Pt()[0];n&&Hi(n)};N("mobile-events").onchange=()=>{const n=Pt().find(e=>e.id===N("mobile-events").value);n&&Hi(n)};N("focus-event").onclick=()=>{const n=Pt().find(e=>e.id===Tt);n?.anchor&&ge?.focus(...n.anchor,7)};N("primary-action").onclick=()=>{const n=Pt().find(e=>e.id===Tt);n&&(Dn(n)&&!hi(n)?cc(Li(mt.chapter("ch01").read())?"continue":"start"):ah(n))};N("content-sources").onclick=()=>{const n=Pt().find(e=>e.id===Tt);n&&uh(n)};N("event-evolution").onclick=()=>Cr(!0);function fh(n,e,t=!1,i=!1){Ql=n,Al=i,la=!1,mn=!0,ge?.pause(),fn(),N("restart-title").textContent=t?te("重播已交付的第一幕","Replay the delivered Act I"):te("重新开始：","Restart: ")+e,N("restart-description").textContent=ac(n)?te("只重置本章新版内容的进度，从本章开头重新体验。旧版存档、其他章节、地图视角、语言和音量设置都会保留。","Only this chapter’s new delivery progress will restart. Legacy saves, other chapters, map view, language and volume settings are preserved."):t?te("将重新体验巴黎街道与印刷店，只清除本试接版的两段进度。第一章其他内容、其他章节、地图和设置都会保留。","This restarts the delivered street and printshop only. Other Chapter 1 content, other chapters, map state and settings are preserved."):te("将清除本篇进度，从开头重新体验。其他章节、语言和音量设置会保留。","This resets progress for this episode and starts at the beginning. Other chapters, language and volume settings are preserved."),N("cancel-restart").textContent=te("取消","Cancel"),N("confirm-restart").textContent=t?te("确认重播第一幕","Replay Act I"):te("确认重播本章","Replay this chapter"),N("restart-dialog").showModal()}N("restart-content").onclick=()=>{const n=Pt().find(t=>t.id===Tt);if(!n)return;const e=ba(n);e&&fh(e,Pr(n)?.title[Ke]??n.title[Ke],Dn(n))};N("cancel-restart").onclick=()=>N("restart-dialog").close();N("confirm-restart").onclick=()=>{const n=Ql;la=!0,N("restart-dialog").close(),n==="ch01"&&!mi(At)&&xa(At)?cc("restart"):n&&ot?.enter({kind:"chapter",contentId:n,action:"restart"})};N("restart-dialog").addEventListener("close",()=>{Ql=null,Al&&!la?lc():!la&&!ot?.snapshot().current&&!ot?.snapshot().pending&&ge?.resume(),Al=!1},{signal:qt.signal});N("region-request").onclick=()=>{const n=Pt().find(e=>e.id===Tt);n&&window.dispatchEvent(new CustomEvent("fr1789:region-request",{detail:{regionId:n.regionId,chapterId:Rn().legacyChapterId??null,eventId:n.id,date:Mt}}))};window.addEventListener("fr1789:region-request",n=>{const e=yy(n.detail,Jl,{chapterId:Rn().legacyChapterId??"",date:Mt});e&&ot?.enter(e)},{signal:qt.signal});N("reset").onclick=()=>ge?.reset();N("national").onclick=()=>ge?.reset();N("alps").onclick=()=>ge?.focus(6.5,45.6,3.2);N("pyrenees").onclick=()=>ge?.focus(.5,42.85,3.2);N("paris").onclick=()=>ge?.focus(2.3,48.84,6);N("zoom-in").onclick=()=>ge?.zoomBy(1.25);N("zoom-out").onclick=()=>ge?.zoomBy(.8);N("pan").onclick=()=>{const n=N("pan").getAttribute("aria-pressed")!=="true";N("pan").setAttribute("aria-pressed",String(n)),ge?.setMode(n?"pan":"rotate")};N("auto-rotate").onclick=()=>{ki(),ge?.setAutoRotate(!ge.snapshot().autoRotate),pc()};for(const n of["military","people"])N(n+"-layer").onchange=()=>{pi[n]=N(n+"-layer").checked,us(),Lr()};N("play-evolution").onclick=rh;N("replay-evolution").onclick=()=>Cr(!0);N("fullscreen").onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch{uc(te("当前容器未开放全屏权限。","Fullscreen is unavailable in this container."))}};N("about").onclick=()=>{ge?.setAutoRotate(!1),mn=!0,ge?.pause(),fn(),N("credits").showModal()};N("close-credits").onclick=()=>N("credits").close();N("credits").addEventListener("close",()=>ge?.resume(),{signal:qt.signal});N("archive-close").onclick=fc;N("return-scene").onclick=fc;N("archive-panel").addEventListener("cancel",n=>{n.preventDefault(),fc()},{signal:qt.signal});document.addEventListener("keydown",n=>{n.key==="Escape"&&!document.querySelector("dialog[open]")&&!N("preview").hidden&&ch()},{signal:qt.signal});document.addEventListener("fullscreenchange",()=>{const n=!!document.fullscreenElement;N("fullscreen").setAttribute("aria-label",te(n?"退出全屏":"全屏",n?"Exit fullscreen":"Fullscreen")),ge?.resize()},{signal:qt.signal});new URLSearchParams(location.search).has("debug")&&(document.body.insertAdjacentHTML("beforeend",'<label id="debug-controls">地形夸张 <select id="exaggeration"><option>8</option><option>12</option><option selected>16</option><option>20</option></select> ×</label>'),N("exaggeration").onchange=()=>ge?.setExaggeration(Number(N("exaggeration").value)));function mc(){const n=mt.mode==="session";N("save-status").hidden=!n,N("save-status").textContent=te("本次会话保存","Saved for this session"),N("save-status").title=te("本地存储不可用，关闭或刷新页面后进度可能丢失。","Local storage is unavailable. Progress may be lost after closing or reloading this page.")}function ua(n){if(!n||!ls.includes(n)||(At?.catalog??cs)[n]?.status!=="available")return te("进入现场 · 待交付","Enter scene · Awaiting content");if(!At?.chapter)return te("进入现场 · 待宿主","Enter scene · Host needed");const e=mi(At)?Fi.find(t=>t.id===n):void 0;if(e){const t=Ma(e,Ke,Oi(e.id));return t.label+(t.action==="continue"?te(" · 已保存位置"," · Saved position"):"")}return Oi(n)?te("继续本篇","Continue episode"):te("进入现场","Enter scene")}function Rl(){const n=ge.snapshot();di[is()]=n.history.progress;const e={apiVersion:"fr1789-map/1",stageId:xt,date:Mt,selectedEvent:Tt,previewOpen:!N("preview").hidden,camera:n.camera,layerSwitches:{...pi},progress:{...di}};return mt.map.write(e),mc(),e}function gc(){ge&&aa&&!ot?.snapshot().current&&!ot?.snapshot().pending&&Rl()}function _o(n){const e=_y(n);if(!(!e||!ge)){mn=!0,ge.setAutoRotate(!1),xt=e.stageId,Mt=e.date,lh(),Tt=Pt().some(t=>t.id===e.selectedEvent)?e.selectedEvent:"",pi={...e.layerSwitches};for(const t of Object.keys(di))delete di[t];if(Object.assign(di,e.progress),Ke=ha(mt.settings.read().language),ca(),wr(),e.previewOpen){const t=Pt().find(i=>i.id===Tt);t&&dc(t)}ge.restoreCamera(e.camera),ge.pauseHistory()}}function $y(n){bl=n,mn=!0,fn(),N("app").classList.toggle("host-active",!n);for(const t of["stage","chapters","story-timeline"])N(t).inert=!n;N("host-root").hidden=n;const e=ot?.snapshot().pending??ot?.snapshot().current;if(N("host-root").classList.toggle("act1-fullscreen",!n&&!mi(At)&&xa(At)&&e?.kind==="chapter"),N("host-root").classList.toggle("delivery-fullscreen",!n&&e?.kind==="chapter"&&ac(e.contentId)),n&&(Ke=ha(mt.settings.read().language),wr()),!n&&ot?.snapshot().status==="loading"){if(!N("host-root").querySelector("[data-host-loading]")){const t=document.createElement("div");t.dataset.hostLoading="true",t.className="host-loading";const i=document.createElement("p");i.textContent=te("正在准备现场…","Preparing the scene…");const r=document.createElement("button");r.textContent=te("取消并返回总览","Cancel and return to overview"),r.onclick=()=>ot?.returnToOverview(),t.append(i,r),N("host-root").append(t)}}else N("host-root").querySelector("[data-host-loading]")?.remove(),ge?.resize(),n&&N(N("preview").hidden?"story-enter":"close-preview").focus({preventScroll:!0})}function jy(n){ot?.snapshot().pending||N("host-root").querySelector("[data-host-loading]")?.remove(),mc();const t=n.status==="entered"?te("已进入。","Entered."):n.status==="missing-content"?te("该内容包尚未交付。地图与历史资料可以独立观看。","This content package has not been delivered. The map and historical sources remain available."):n.status==="no-host"?te("尚无对应宿主，城市接口或公共播放器待接入。","No corresponding host is connected. City interfaces or the shared player are still needed."):n.status==="load-error"?te("资源加载或进入失败，可重试；已保留原进度。","Loading or entry failed. Retry is available; previous progress is preserved."):te("已取消进入。","Entry cancelled.");N("request-feedback").textContent=t,N("preview").hidden&&["load-error","missing-content","no-host"].includes(n.status)&&uc(t),window.dispatchEvent(new CustomEvent("fr1789:host-result",{detail:{apiVersion:"fr1789-host/1",...n}}))}function rd(n){ot.connect(n),At=n,hc(),Lr(),oc()}window.addEventListener("pagehide",gc,{signal:qt.signal});document.addEventListener("visibilitychange",()=>{document.hidden?(gc(),ot?.pause()):ot?.resume()},{signal:qt.signal});async function Zy(){try{const n=await fetch(ya("data/events.csv"));if(!n.ok)throw Error("事件索引加载失败");if(Jl=uy(await n.text()),wr(),ge=await cy(N("map"),s=>N("loading-text").textContent=s),!aa){ge.dispose();return}N("loading").hidden=!0;let e=0;ge.onUpdate(()=>{const s=ge.snapshot().camera.zoom;Math.abs(s-e)>.5&&(e=s,dh()),fn()}),wr(),ot=z0({map:{capture:Rl,pause:()=>{mn=!0,ge.setAutoRotate(!1),ge.pause(),fn()},resume:()=>ge.resume(),restore:_o,show:$y},store:mt,resolver:Nn,root:N("host-root"),onResult:jy}),rd(Vy(zy(Xd,Nn),Nn)),_o(mt.map.read());const t=new URLSearchParams(location.search).get("stage"),i=pn.find(s=>s.id===t),r=new URLSearchParams(location.search).get("date");if(i){const s=r&&i.dates.includes(r)?r:i.id===xt?Mt:i.dates[i.id==="ch04"?1:0];xt!==i.id||Mt!==s?Er(i.id,s):ca()}else ca();Object.assign(window,{terrainMapB:{snapshot:()=>ge.snapshot(),focus:(s,a,o)=>ge.focus(s,a,o),reset:()=>ge.reset(),pause:()=>{mn=!0,ge.pause(),fn()},resume:()=>ge.resume(),dispose:()=>{gc(),aa=!1,clearTimeout(Sl),qt.abort(),ec?.dispose(),Ri?.dispose(),Xy(),ot.dispose(),ge.dispose()},state:()=>({chapterId:Rn().legacyChapterId??"",stageId:xt,date:Mt,eventId:Tt,language:mt.settings.read().language,layerSwitches:{...pi}}),selectStage:Er,capture:Rl,restore:_o,registerHost:rd,host:ot,store:mt,setAutoRotate:s=>ge.setAutoRotate(s),setContours:s=>ge.setContours(s),setExaggeration:s=>ge.setExaggeration(s),restoreCamera:ge.restoreCamera,playEvolution:Cr,pauseEvolution:ki}})}catch(n){N("loading-text").textContent=te("地图加载失败，请刷新重试：","Map failed to load. Please reload: ")+String(n),console.error(n)}}Zy();export{Kt as B,ga as C,Kn as E,Wt as L,ma as M,yn as P,Jy as R,jt as S,Bt as T,O as V,M0 as W,tp as a,It as b,Lo as c,ze as d,Ky as e,Fi as f,Kl as g,nx as h,ha as i,Qy as j,tx as m,ex as r};
