// Read the existing public chapter snapshots; no changes to story decisions or saves.
export function readMusicContext(){
 let scope,node,sceneId='',stage='',phase='',mediaId='',page=0,time=0,dialogue=false,paused=false,overlay=false,ready=false,keepMusic=false;
 const body=document.body,view=body.dataset.state||'';
 if(window.franceAct){const a=window.franceAct.inspect();scope='ch1';node=a.state;const cont=node.startsWith('continuation-');sceneId=node.startsWith('street-')?'street':cont?(a.continuation.currentScene||a.continuation.scene):'printshop';stage=cont?a.continuation.stage:'';phase=cont&&(a.continuation.arrivalStarted||['hall','clergy','exit'].includes(sceneId)||['arrival','history','summary','recap','suspense','complete'].includes(stage))?'assembly':'opening';mediaId=a.activeMedia||'';paused=!!a.paused;dialogue=/(person|book|father|noble|clergy|dialogue)$/.test(node);ready=true;}
 else if(window.chapterTwo){const a=window.chapterTwo.inspect();scope='ch2';node=a.node;sceneId=a.scene;mediaId=a.media||'';page=a.page;paused=!!a.paused;dialogue=a.state==='dialogue';time=a.videos.find(v=>v.key===a.media)?.time||0;ready=true;}
 else if(window.chapterThree){const a=window.chapterThree.inspect();scope='ch3';node=a.state.node;mediaId=a.media||'';page=a.state.page;dialogue=!!a.state.dialogue;time=a.video?.time||0;paused=!!a.paused;ready=true;}
 else if(window.chapterAct){const a=window.chapterAct.inspect(),p=a.progress;scope='ch'+a.chapter;node=p.node;keepMusic=scope==='ch7'&&a.overlay==='code-note';sceneId=String(p.scene);mediaId=a.media||'';page=p.page||0;dialogue=!!p.dialogue||!!p.person||a.state==='dialogue';paused=!!(p.paused||a.paused);overlay=!!a.overlay||a.state==='journal';time=a.caption?.elapsed??a.video?.time??0;if(scope==='ch8'&&node==='complete')time=p.clocks.ending||0;ready=true;}
 else if(window.extras){const a=window.extras.inspect();scope=a.id;node=a.node;page=a.state?.page||0;dialogue=!!a.state?.dialogue;paused=!!a.state?.paused;time=a.caption?.elapsed||0;overlay=['journal','archive','sources'].includes(a.view);ready=true;}
 if(!ready)return null;
 // Opening conversations and inset characters also use the shared speaker panel.
 dialogue=dialogue||[...document.querySelectorAll('.dialogue:not(.question) .speaker')].some(e=>e.checkVisibility());
 const modal=[...document.querySelectorAll('dialog[open],#ui .confirm')].some(e=>e.id!=='music-settings');
 const error=view==='error'||[...document.querySelectorAll('#error')].some(e=>!e.hidden&&e.checkVisibility());
 return {scope,node,sceneId,stage,phase,mediaId,page,time,dialogue,musicPaused:paused||error||document.hidden||(!keepMusic&&(overlay||modal)),paused:paused||overlay||modal||error||document.hidden,overlay:overlay||modal,error,view};
}
export function resolveMusic(config,context){
 if(!context)return null;
 const rule=config.rules.find(r=>r.scope===context.scope&&(!r.phase||r.phase===context.phase)&&(!r.nodes||r.nodes.includes(context.node))&&(!r.sceneIds||r.sceneIds.includes(context.sceneId))&&(!r.stages||r.stages.includes(context.stage))&&(!r.pages||r.pages.includes(context.page)));
 if(!rule)return null;const cue={...rule.cue,sceneId:rule.sceneId};
 for(const point of cue.volumeTimeline||[])if(context.time>=point.at){cue.volume=point.volume;if(point.fade!==undefined)cue.fadeIn=cue.fadeOut=point.fade;}
 cue.ducked=false;
 return cue;
}
export function resolveAmbience(config,context){
 if(!context)return null;
 const rule=config.ambience?.rules.find(r=>r.scope===context.scope&&(!r.mediaIds||r.mediaIds.includes(context.mediaId))&&(!r.nodes||r.nodes.includes(context.node)));
 return rule?{...config.ambience.clips[rule.clipId],clipId:rule.clipId}:null;
}
