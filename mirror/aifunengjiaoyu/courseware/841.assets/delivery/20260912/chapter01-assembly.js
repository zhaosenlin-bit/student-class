// Later chapter-one scenes use the same media cache, cylinder, camera and UI as the printshop.
const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
export class AssemblyAct{
 constructor(owner,data){this.o=owner;this.h=owner.host;this.data=data;}
 get p(){return this.o.progress;}
 departure(){
  this.o.rememberDirection();this.o.setState('departure');this.o.save();
  const box=this.h.panel('dialogue');box.append(el('div','意见页','speaker'),el('p','街坊的要求和刚读到的思想，已经写在这张意见页上。'));
  this.h.actions(box,[this.h.button('去三级会议现场发表意见',()=>this.h.run(()=>this.arrival()),true)]);
 }
 async transition(lines,label,next,extraClass='',backdrop){
  this.o.rememberDirection();this.o.setState('transition');this.h.pauseMedia();
  const panel=this.h.panel('chapter-transition visual-transition '+extraClass);await this.backdrop(backdrop);panel.dataset.backdrop=backdrop;
  const content=el('div',undefined,'history-lines');content.setAttribute('aria-live','polite');panel.append(content);
  lines.forEach((line,i)=>{const p=el('p',line,'transition-line');p.style.setProperty('--line-delay',(.55+i*.95)+'s');content.append(p);});
  const button=this.h.button(label,()=>{if(button.disabled)return;button.disabled=true;panel.classList.add('leaving');this.o.timer=setTimeout(()=>this.h.run(next),matchMedia('(prefers-reduced-motion: reduce)').matches?0:380);},true);button.disabled=true;
  this.h.actions(panel,[button]);this.o.timer=setTimeout(()=>{if(panel.isConnected)button.disabled=false;},matchMedia('(prefers-reduced-motion: reduce)').matches?80:lines.length*950+1000);
  return panel;
 }
 async backdrop(key){this.h.pauseMedia();const direction=this.o.currentScene?this.h.room.direction():this.p.transitionDirection||this.h.room.direction();this.o.currentScene=null;await this.h.activate(key,direction);this.p.transitionDirection=this.h.room.direction();this.o.save();}
 async arrival(){this.p.arrivalStarted=true;await this.transition(this.data.arrival,'进入会场',()=>this.hall(),'meeting-arrival',this.data.transitionBackdrops.arrival);this.p.stage='arrival';this.o.save();}
 async hall(){
  await this.o.scene('hall');this.o.setState('explore');this.o.caption('hall');document.querySelector('#ui').replaceChildren();this.refreshHall();this.o.save();
  this.h.hint(this.p.nobleHeard?'拖动画面寻找附近的教士代表，试着争取他的支持。':'拖动画面，点击左侧站着发言的贵族代表。',8000);
 }
 refreshHall(){
  const items=this.data.scenes.hall.items.filter(i=>i.id!=='clergy'||(this.p.nobleHeard&&this.p.estatesGeneralVideoComplete));
  this.h.room.setHotspots(items,{noble:this.p.nobleHeard,clergy:this.p.clergyDialogueComplete});
 }
 mediaEnded(scene){
  // Loop completion unlocks interaction. Only the exit clip fades into its own history overlay.
  if(scene==='hall'&&this.o.currentScene==='hall'&&this.h.state()==='continuation-explore')this.refreshHall();
  if(scene==='clergy'&&this.h.state()==='continuation-clergy')this.refreshReply();
  if(scene==='exit'&&this.h.state()==='continuation-exit')this.exitHold();
 }
 pick(id){if(id==='noble')this.noble();else if(id==='clergy'&&this.p.nobleHeard&&this.p.estatesGeneralVideoComplete)this.h.run(()=>this.clergy());}
 noble(){
  this.o.rememberDirection();this.o.setState('noble');this.o.save();
  this.h.showLine(this.data.nobleLine,'继续',()=>this.h.showLine(this.data.thought,'看看周围的代表',()=>{this.p.nobleHeard=true;this.o.save();this.h.run(()=>this.hall());}),this.data.notice);
 }
 async clergy(){
  this.p.clergyStarted=true;await this.o.scene('clergy');this.o.caption('clergy');this.clergyLine(Math.min(this.p.clergyStep,this.data.clergyRounds.length-1));
 }
 clergyLine(index){
  this.o.setState('clergy');this.p.clergyStep=index;this.o.save();
  const round=this.data.clergyRounds[index],box=this.h.panel('dialogue clergy-dialogue');
  box.append(el('div','教士代表','speaker'));
  if(round.pause)box.append(el('small',round.pause,'clergy-pause'));
  if(round.line)box.append(el('p',round.line));else box.append(el('p','一名尚在犹豫的基层教士代表。','clergy-introduction'));
  const last=index===this.data.clergyRounds.length-1,reply=this.h.button(round.reply,()=>{
   if(!last){this.clergyLine(index+1);return;}
   if(!this.p.clergyVideoComplete)return;
   this.p.clergyDialogueComplete=true;this.o.save();this.h.run(()=>this.exit());
  });reply.classList.add('player-reply');reply.dataset.playerReply='';reply.dataset.ready='false';reply.setAttribute('aria-hidden','true');reply.disabled=true;
  if(last)reply.dataset.clergyFinish='';
  this.h.actions(box,[reply]);box.append(el('small',this.data.notice,'reconstruction-note'));
  const reveal=()=>{if(!box.isConnected||this.o.resetting)return;reply.dataset.ready='true';reply.removeAttribute('aria-hidden');this.refreshReply();};
  if(index===0)reveal();else this.o.timer=setTimeout(reveal,this.data.replyDelayMs);
 }
 refreshReply(){const reply=document.querySelector('[data-player-reply]');if(reply)reply.disabled=reply.dataset.ready!=='true'||(reply.hasAttribute('data-clergy-finish')&&!this.p.clergyVideoComplete);}
 exitHold(){
  if(this.h.state()!=='continuation-exit'||!this.p.exitVideoComplete)return;
  // Hold the actual last presented frame before laying text and a dim scrim over the same view.
  const box=this.h.panel('exit-hold'),b=this.h.button('查看会议进展',()=>this.h.run(()=>this.history(0)));b.dataset.exitContinue='';this.h.actions(box,[b]);
  this.o.timer=setTimeout(()=>{if(this.h.state()==='continuation-exit'&&!this.o.resetting&&!document.querySelector('#ui .confirm')&&document.querySelector('#error').hidden)this.h.run(()=>this.history(0));},1000);
 }
 async exit(){
  this.o.rememberDirection();
  if(this.data.scenes.exit.available){
   await this.o.scene('exit');this.o.setState('exit');this.o.caption('exit');this.o.save();document.querySelector('#ui').replaceChildren();
   if(this.p.exitVideoComplete)this.exitHold();return;
  }
  this.o.setState('exit-pending');this.h.pauseMedia();this.o.save();
  const box=this.h.panel('dialogue exit-pending');box.append(el('div','离开会场','speaker'),el('p','谈话结束。接下来，看看会议争议怎样发展。'),el('small','离场短片待补充','pending-scene'));
  this.h.actions(box,[this.h.button('继续历史过渡',()=>this.h.run(()=>this.history(0)),true)]);
 }
 async history(index=0){
  index=Math.min(index,this.data.history.length-1);this.p.historyStep=index;
  await this.transition(this.data.history[index],index===this.data.history.length-1?'整理本章所学':'继续',()=>{
   if(index<this.data.history.length-1)return this.history(index+1);
   this.p.nationalAssemblyHistoryComplete=true;this.o.save();this.summary();
  },'national-assembly-history',this.data.transitionBackdrops.history[index]);this.p.stage='history';this.o.save();
 }
 summary(){
  this.o.setState('summary');this.h.pauseMedia();this.o.save();const s=this.data.summary,box=this.h.panel('parchment chapter-one-summary');box.setAttribute('role','region');box.setAttribute('aria-label',s.title);
  box.append(el('small',s.title,'paper-byline'),el('h2',s.subtitle));
  const grid=el('div',undefined,'chapter-memory-grid');
  s.nodes.forEach((node,index)=>{
   const card=el('section',undefined,'chapter-memory');card.append(el('small',String(index+1).padStart(2,'0')+' · '+node.memory,'memory-label'),el('h3',node.title));
   node.lines.forEach(text=>card.append(el('p',text)));const terms=el('div',undefined,'memory-keywords');node.keywords.forEach(text=>terms.append(el('mark',text,'knowledge-highlight')));card.append(terms);grid.append(card);
  });box.append(grid);this.h.actions(box,[this.h.button('本章要记住',()=>this.recap(),true)]);
 }
 recap(){
  this.o.setState('recap');this.h.pauseMedia();this.o.save();const box=this.h.panel('parchment chapter-one-recap');box.append(el('h2','本章要记住：'));
  this.data.summary.recap.forEach(text=>box.append(el('p',text)));
  this.h.actions(box,[this.h.button('回看五个节点',()=>this.summary()),this.h.button('继续',()=>{this.p.chapter1SummaryViewed=true;this.p.suspenseStep=0;this.o.save();box.classList.add('leaving');this.o.timer=setTimeout(()=>this.h.run(()=>this.suspense(0)),380);},true)]);
 }
 async suspense(index=0){
  index=Math.min(index,this.data.suspense.length-1);this.p.suspenseStep=index;
  await this.transition(this.data.suspense[index],'继续',()=>index===0?this.suspense(1):this.chapterDoor(),'closed-door',this.data.transitionBackdrops.suspense);this.p.stage='suspense';this.o.save();
 }
 async chapterDoor(){
  this.o.setState('transition');this.h.pauseMedia();this.p.chapter1Complete=true;this.p.stage='complete';this.o.save();
  await this.backdrop(this.data.transitionBackdrops.suspense);const n=this.data.nextChapter,box=this.h.panel('chapter-transition visual-transition chapter-door');box.append(el('small',n.label),el('h2',n.title));
  this.h.actions(box,[this.h.button('进入第二章',()=>window.frDelivery.navigate(n.url),true)]);
 }
 async completed(){
  this.o.setState('complete');this.h.pauseMedia();await this.backdrop(this.data.transitionBackdrops.suspense);const box=this.h.panel('chapter-transition visual-transition chapter-door');box.append(el('small','第一章已完成'),el('h2','从生活危机，到要求政治改变'));
  this.h.actions(box,[this.h.button('重看第一章',()=>this.h.resetChapter()),this.h.button('继续第二章',()=>window.frDelivery.navigate(this.data.nextChapter.url),true)]);
 }
}
