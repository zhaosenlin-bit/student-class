export const normalize=s=>String(s).replace(/\s+/g,'').trim();
const han=/\p{Script=Han}/u;
export async function loadEnglishCatalog(catalog,names,load){
 const groups=await Promise.all(names.map(load)),next=new Map();
 for(const group of groups){
  if(!group||Array.isArray(group)||typeof group!=='object')throw Error('Invalid English catalog');
  for(const [zh,en] of Object.entries(group)){if(typeof en!=='string'||!en.trim())throw Error('Invalid English translation');next.set(normalize(zh),en);}
 }
 catalog.clear();for(const [zh,en] of next)catalog.set(zh,en);
}
export function createEnglish(catalog){
function translate(source,depth=0){
 if(depth>12)return String(source);
 const english=value=>translate(value,depth+1);
 const s=String(source),key=normalize(s);if(!han.test(s))return s;
 if(catalog.has(key))return catalog.get(key);
 // Chapter numbers, counters and labels are composed by the authored flows.
 let chapter=s.match(/^第([1-8一二三四五六七八])章(?=$|[ ·｜：])(.*)$/s);
 if(chapter){const number='一二三四五六七八'.indexOf(chapter[1])+1||Number(chapter[1]);return 'Chapter '+number+english(chapter[2]).replace(/^\s*[｜：]\s*/, ' · ');}
 let count=s.match(/^已回顾\s*(\d+\s*\/\s*\d+)$/);if(count)return 'Reviewed: '+count[1];
 count=s.match(/^已交谈\s*(\d+\s*\/\s*\d+)$/);if(count)return 'Conversations: '+count[1];
 count=s.match(/^(\d+\s*\/\s*\d+)\s*份材料已回顾$/);if(count)return count[1]+' documents reviewed';
 chapter=s.match(/^(回顾|旧材料 · |记忆 · )第([1-8])章(.*)$/s);
 if(chapter)return (chapter[1]==='回顾'?'Review ':chapter[1].startsWith('旧材料')?'Documents · ':'Memory · ')+'Chapter '+chapter[2]+english(chapter[3]).replace(/^：/, ': ');
 // Only known UI compositions are assembled. Prose is translated as a whole.
 let match=s.match(/^([ABC][.．、]?\s*|\d+[.．、]\s*)(.+)$/s);
 if(match&&catalog.has(normalize(match[2])))return match[1]+english(match[2]);
 match=s.match(/^(.*)(，已读|，已交谈)$/s);
 if(match)return english(match[1])+english(match[2]);
 match=s.match(/^已连接\s*(\d+\s*\/\s*\d+)$/);
 if(match)return 'Connections: '+match[1];
 match=s.match(/^对应正确。(.*)$/s);
 if(match)return 'Correct match. '+english(match[1]);
 match=s.match(/^(原声音轨无法加载：|原声音轨播放中断：)(.*)$/s);
 if(match)return english(match[1])+match[2];
 match=s.match(/^为什么会走到“(.+)”？$/s);
 if(match)return `Why did this lead to “${english(match[1])}”?`;
 match=s.match(/^从“(.+)”出发，点击下一格，想一想它为什么发生。$/s);
 if(match)return `Start with “${english(match[1])}”. Click the next scene and think about why it happened.`;
 match=s.match(/^(.*?)《(.+)》$/s);
 if(match)return (match[1]?english(match[1])+' · ':'')+english(match[2]);
 match=s.match(/^(\d{4})年$/);if(match)return match[1];
 match=s.match(/^(\d{4})年(\d{1,2})月(?:(\d{1,2})日)?$/);
 if(match){const month=['January','February','March','April','May','June','July','August','September','October','November','December'][Number(match[2])-1];if(month)return (match[3]?Number(match[3])+' ':'')+month+' '+match[1];}
 match=s.match(/^(\d{4})年(\d{1,2})月至(\d{1,2})月$/);
 if(match)return english(match[1]+'年'+match[2]+'月').replace(' '+match[1],'')+'–'+english(match[1]+'年'+match[3]+'月');
 match=s.match(/^(\d{4})[—–-](\d{4})年$/);if(match)return match[1]+'–'+match[2];
 for(const prefix of ['第一章 · ','理解关系 · ','进门原声：','缺少素材配置：','素材加载超时：','视频缺失或无法解码：','视频播放中断或解码失败：','图片缺失或无法解码：','无法清除本章存档，请重试：','无法进入全屏：','配置加载失败：','缺少素材：','视频加载超时：','视频无法加载：','视频播放中断：','图片无法加载：','定格画面无法加载：','无法读取视频：','章节配置读取失败：','找不到媒体配置：','视频加载失败：','找不到剧情节点：','不支持的章节节点：','尚不支持的节点类型：','章节加载失败：','第七章暂时无法打开：']){
  if(s.startsWith(prefix)&&s!==prefix)return english(prefix)+english(s.slice(prefix.length));
 }
 // Translate separately authored sentences and labels; never replace isolated words in prose.
 for(const separator of ['\n',' → ',' · ','｜','：'])if(s.includes(separator))return s.split(separator).map(english).join(separator==='｜'?' · ':separator==='：'?': ':separator);
 const sentences=s.match(/[^。！？]+[。！？]|[^。！？]+$/g);
 if(sentences?.length>1&&sentences.every(part=>!han.test(part)||catalog.has(normalize(part))))return sentences.map(english).join(' ');
 return s;
}
return source=>translate(source);
}
