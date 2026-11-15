// This channel carries a short classroom acknowledgement, never login cookies,
// launch tickets or the server lease token. Authorization remains on the server.
export function isClassroomRequest(event,frame,courseId){
  const data=event.data;
  if(!frame||event.source!==frame.contentWindow||!data||data.type!=='xiaobai:classroom-access'||data.version!==1||data.state!=='request'||data.courseId!==courseId||!/^[-\w]{24}$/.test(data.deliveryId)||typeof data.requestId!=='string'||data.requestId.length>80||!data.requestId.startsWith(data.deliveryId+':'))return false;
  return true;
}
export function classroomReply(event,{frame,courseId,expiresAt,active=true,now=Date.now()}){
  if(!isClassroomRequest(event,frame,courseId))return false;
  const data=event.data;
  const ttlMs=active&&Number.isFinite(Number(expiresAt))&&Number.isFinite(now)?Math.max(0,Math.min(600000,Number(expiresAt)-now)):0;
  // Most lessons have an opaque sandbox origin, which requires '*'. Only the
  // exact currently mounted WindowProxy receives this non-secret response.
  event.source.postMessage({type:data.type,version:1,courseId,deliveryId:data.deliveryId,requestId:data.requestId,state:ttlMs>0?'active':'blocked',ttlMs:Number.isFinite(ttlMs)?ttlMs:0},'*');
  return true;
}
