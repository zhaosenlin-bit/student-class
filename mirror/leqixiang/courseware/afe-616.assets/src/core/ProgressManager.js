const defaults={intro:{author:false,categories:false,chapters:false},bookOpened:false,currentPage:'cover',currentChapterId:'shuowen',unlocked:['shuowen'],bookmark:false,bookmarks:[],doubts:[],quizProgress:{},shuowen:{sceneRaised:false,order:false,classify:false,question:false},zhouyi:{sceneRaised:false,matches:{},match:false,question:false}};
const genericChapterDefault={sceneRaised:false,activities:{},drafts:{},interaction:false,question:false};
export class ProgressManager {
  constructor(){ try{ this.data=this.#merge(defaults,JSON.parse(localStorage.getItem('jdc-progress')||'{}')); }catch{this.data=structuredClone(defaults);}if(this.data.shuowen?.question&&!this.data.unlocked.includes('zhouyi'))this.data.unlocked.push('zhouyi');if(this.data.bookmark&&this.data.shuowen?.question&&!this.data.bookmarks.includes('shuowen'))this.data.bookmarks.push('shuowen');this.save(); }
  #merge(a,b){ const out=structuredClone(a); for(const k in b) out[k]=b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])?this.#merge(out[k]||{},b[k]):b[k]; return out; }
  save(){ localStorage.setItem('jdc-progress',JSON.stringify(this.data)); }
  ensureChapter(id,seed=genericChapterDefault){this.data[id]=this.#merge(seed,this.data[id]&&typeof this.data[id]==='object'?this.data[id]:{});this.save();return this.data[id];}
  set(path,value=true){ const p=path.split('.'); let o=this.data; while(p.length>1){const key=p.shift();if(!o[key]||typeof o[key]!=='object')o[key]={};o=o[key];}o[p[0]]=value; this.save();document.dispatchEvent(new CustomEvent('jdc-progress')); }
  introCount(){ return Object.values(this.data.intro).filter(Boolean).length; }
  introComplete(){ return this.introCount()===3; }
  completedChapters(){return Object.entries(this.data).filter(([,v])=>v&&typeof v==='object'&&v.question===true).map(([id])=>id);}
  recordQuiz(chapterId,questionId,correct){this.data.quizProgress[chapterId]||={answered:{},completed:false};this.data.quizProgress[chapterId].answered[questionId]={correct,at:new Date().toISOString()};this.save();}
  completeQuiz(chapterId){this.data.quizProgress[chapterId]||={answered:{}};this.data.quizProgress[chapterId].completed=true;this.save();}
  unlock(id){if(!id||this.data.unlocked.includes(id))return;this.data.unlocked.push(id);this.save();document.dispatchEvent(new CustomEvent('jdc-progress'));}
  addBookmark(id){if(!this.data.bookmarks.includes(id))this.data.bookmarks.push(id);this.data.bookmark=this.data.bookmarks.length>0;this.save();document.dispatchEvent(new CustomEvent('jdc-progress'));}
  addDoubt(chapterId,question){if(this.data.doubts.some(item=>item.questionId===question.id))return;this.data.doubts.push({chapterId,questionId:question.id,question:question.question,answer:question.answer,analysis:question.analysis,createdAt:new Date().toISOString()});this.save();document.dispatchEvent(new CustomEvent('jdc-progress'));}
  restartChapter(id='shuowen'){this.data[id]=defaults[id]?structuredClone(defaults[id]):structuredClone(genericChapterDefault);delete this.data.quizProgress[id];this.data.doubts=this.data.doubts.filter(item=>item.chapterId!==id);this.data.bookmarks=this.data.bookmarks.filter(chapterId=>chapterId!==id);this.data.bookmark=this.data.bookmarks.length>0;this.data.currentPage='chapter';this.data.currentChapterId=id;this.save();document.dispatchEvent(new CustomEvent('jdc-progress')); }
  resetAll(){this.data=structuredClone(defaults);this.save();document.dispatchEvent(new CustomEvent('jdc-progress'));}
}
