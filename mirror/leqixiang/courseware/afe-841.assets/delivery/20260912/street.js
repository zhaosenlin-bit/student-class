// Street prelude uses the existing single room renderer and dialogue/UI helpers.
const KEY='frenchRevolution.chapter1.street.v1';
const initial=()=>({introComplete:false,heard:{farmer:false,woman:false,clerk:false},completed:false,summarySeen:false,enteredShop:false,direction:{yaw:0,pitch:0}});
export class StreetAct{
 constructor(host,data,hotspots){this.host=host;this.data=data;this.hotspots=hotspots;this.progress=initial();this.sequence=0;this.prologueIndex=0;this.resetting=false;this.playStarts=0;this.playEnds=0;this.load();if(!this.progress.introComplete)this.progress.direction={...data.initialDirection};}
 load(){try{const p=JSON.parse(localStorage.getItem(KEY));if(!p)return;for(const k of ['introComplete','summarySeen','enteredShop'])this.progress[k]=p[k]===true;
  for(const id of Object.keys(this.progress.heard))this.progress.heard[id]=p.heard?.[id]===true;
  if(Number.isFinite(p.direction?.yaw)&&Number.isFinite(p.direction?.pitch))this.progress.direction=p.direction;
  this.progress.completed=p.completed===true&&this.unlocked();if(!this.progress.introComplete)this.progress=initial();if(!this.progress.completed)this.progress.enteredShop=false;
 }catch{this.progress=initial();}}
 save(){if(this.resetting)return;try{localStorage.setItem(KEY,JSON.stringify(this.progress));}catch{this.host.hint('浏览器无法保存街道进度，本次体验仍可继续。');}}
 active(){return this.host.state().startsWith('street-');}
 unlocked(){return this.progress.heard.clerk&&Object.values(this.progress.heard).filter(Boolean).length>=2;}
 direction(d){if(this.active()&&this.host.state()!=='street-prologue'){this.progress.direction=d;this.save();}}
 async start(){this.host.room.setDirection(this.progress.direction);if(this.progress.introComplete){await this.explore();if(this.progress.completed&&this.progress.summarySeen)this.summary();}else this.prologue();}
 prologue(){const h=this.host;h.setState('street-prologue');const lines=document.querySelector('#prologue-lines');lines.replaceChildren();const p=document.createElement('p');p.textContent=this.data.prologue[this.prologueIndex];lines.append(p);
  const entry=document.querySelector('#enter');entry.disabled=false;entry.textContent=this.prologueIndex===this.data.prologue.length-1?'进入街道':'继续';
  entry.onclick=()=>{if(entry.disabled)return;if(this.prologueIndex===this.data.prologue.length-1){h.run(()=>this.playIntro());return;}entry.disabled=true;
   const transition=p.animate([{opacity:1},{opacity:0}],{duration:450,fill:'forwards'});transition.finished.then(()=>{this.prologueIndex++;this.prologue();});};
  h.prepare('streetVideo').catch(()=>{});
 }
 async playIntro(){const h=this.host;h.setUserPaused(false);await this.explore();this.playStarts++;h.hint('拖动画面查看，点击人物交谈。左边拿报纸的人也在议论法国的局势。',7500);
 }
 async explore(){const h=this.host;await h.activate('streetVideo');this.progress.introComplete=true;h.setState('street-explore');document.querySelector('#ui').replaceChildren();this.currentPerson=null;this.refreshHotspots();this.direction(h.room.direction());}
 refreshHotspots(){const items=this.hotspots.items.filter(x=>x.id!=='street-exit'||this.unlocked());this.host.room.setHotspots(items,this.progress.heard);}
 pick(id){if(this.host.state()!=='street-explore')return;if(id==='street-exit'){if(this.unlocked())this.thought();return;}
  if(!this.data.people[id])return;this.currentPerson=id;this.sequence=0;this.host.setState('street-person');this.line();
 }
 line(){const h=this.host,record=this.data.people[this.currentPerson],i=this.sequence;
  h.showLine(record.lines[i],'继续',()=>{if(i<record.lines.length-1){this.sequence++;this.line();}else{
   // Seeing the opening/question does not grant credit. Confirm the knowledge panel to finish.
   h.showLine(['我了解到',record.knowledge],'返回街道',()=>{this.progress.heard[this.currentPerson]=true;this.save();h.run(()=>this.explore());});
  }},`${i+1} / ${record.lines.length}`);
 }
 thought(){if(this.unlocked())this.summary();}
 summary(){if(!this.unlocked())return;const h=this.host,s=this.data.summary;this.progress.completed=true;this.progress.summarySeen=true;this.save();h.setState('street-summary');
  const p=h.panel('summary street-summary'),title=document.createElement('h2');title.textContent=s.title;p.append(title);const grid=document.createElement('div');grid.className='summary-grid';p.append(grid);
  s.sections.forEach((item,i)=>{const section=document.createElement('section'),heading=document.createElement('h3'),text=document.createElement('p');heading.textContent=`${i+1}. ${item.title}`;text.textContent=item.text;section.append(heading,text);grid.append(section);});
  const connection=document.createElement('p');connection.className='connection';connection.textContent=s.connection;p.append(connection);
  h.actions(p,[h.button('返回街道',()=>h.run(()=>this.explore())),h.button('回印刷店',()=>h.run(async()=>{await h.startIntro();this.progress.enteredShop=true;this.save();}),true)]);
 }
 clearProgress(){this.resetting=true;localStorage.removeItem(KEY);}
 inspect(){return {...this.progress,unlocked:this.unlocked(),playStarts:this.playStarts,playEnds:this.playEnds};}
}
