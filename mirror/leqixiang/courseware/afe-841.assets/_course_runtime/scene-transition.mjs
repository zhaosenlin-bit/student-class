// A brief synchronous/cached transition must not flash a loading overlay.
// Real waits still surface; this does not change fetching, access or errors.
export function createSceneLoadingNotice(element,{schedule=setTimeout,cancel=clearTimeout,delay=180}={}){
 let timer=null,epoch=0;
 function stop(){epoch++;if(timer!==null)cancel(timer);timer=null;element.hidden=true;}
 return {start(){stop();const ticket=epoch;timer=schedule(()=>{if(ticket===epoch){timer=null;element.hidden=false;}},delay);},stop};
}

// Reusing a currently playing decoded frame needs no new play/frame handshake.
// Paused, ended, seeking and unready media retain the original readiness path.
export function hasPlayingFrame(video){return !!video&&!video.paused&&!video.ended&&!video.seeking&&video.readyState>=2;}
