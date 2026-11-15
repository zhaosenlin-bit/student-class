// Static teaching plates. The existing cylinder and its direction remain intact underneath.
export class VotingDemo {
 constructor(host,data){this.h=host;this.data=data;this.mode=null;this.phase='intro';this.index=0;this.asset=null;}
 async start(){const asset=await this.h.prepare('voteInitialImage');this.h.pause();this.h.setState('voting');this.asset=asset;this.mode=null;this.phase='intro';this.index=0;this.render();}
 async choose(mode){const asset=await this.h.prepare(this.data.modes[mode].media);this.asset=asset;this.mode=mode;this.phase='rule';this.index=0;this.render();}
 next(){const p=this.h.progress();
  if(this.phase==='rule'){if(this.index<this.data.modes[this.mode].lines.length){this.index++;}else{p[this.mode]=true;this.h.save();if(p.estate&&p.person&&!p.complete){this.phase='conclusion';this.index=0;}else this.phase='choose';}}
  else if(this.phase==='conclusion'){if(this.index<this.data.conclusion.length)this.index++;else{p.complete=true;this.h.finish();return;}}
  this.render();
 }
 render(){const h=this.h,d=this.data,progress=h.progress(),shell=h.panel('voting-shell');
  const figure=document.createElement('figure');figure.className='voting-figure';const img=this.asset.image;img.alt=this.mode?d.modes[this.mode].alt:'桌面上的三堆纸片，第三等级一堆明显最多；纸片数量为课堂示意。';figure.append(img);shell.append(figure);
  const box=document.createElement('div');box.className='dialogue voting-dialogue';shell.append(box);
  let line=['皮埃尔','选择一种计票方式，看看结果。'],label='',keywords=[],next=()=>this.next();
  if(this.phase==='rule'){const mode=d.modes[this.mode];line=this.index<mode.lines.length?mode.lines[this.index]:['我了解到',mode.knowledge];label=this.index<mode.lines.length?'继续':'看完此规则';keywords=mode.knowledgeKeywords||[];}
  if(this.phase==='choose'){line=['皮埃尔',progress.estate&&progress.person?'两种方式都可以再次查看。':'还可以看看另一种方式。'];if(progress.complete){label='返回场景';next=()=>h.finish();}}
  if(this.phase==='conclusion'){line=this.index<d.conclusion.length?d.conclusion[this.index]:['我了解到',d.knowledge];label=this.index<d.conclusion.length?'继续':'返回场景';keywords=d.knowledgeKeywords||[];}
  const speaker=document.createElement('div');speaker.className='speaker';speaker.textContent=line[0];const text=document.createElement('p');h.renderDialogueText(text,line[1],line[0]==='我了解到',keywords);box.append(speaker,text);
  const buttons=Object.entries(d.modes).map(([key,value])=>{const b=h.button(value.label,()=>h.run(()=>this.choose(key)));b.dataset.vote=key;b.setAttribute('aria-pressed',String(key===this.mode));b.title=progress[key]?'已看完，可重复查看':'点击查看';return b;});
  const controls=h.actions(box,buttons);controls.classList.add('vote-controls');if(label){const advance=h.button(label,next,true);advance.dataset.voteNext='true';controls.append(advance);}
  const note=document.createElement('small');note.className='vote-note';note.textContent=d.note;box.append(note);
 }
 inspect(){return {mode:this.mode,phase:this.phase,index:this.index,image:this.asset?.key};}
}
