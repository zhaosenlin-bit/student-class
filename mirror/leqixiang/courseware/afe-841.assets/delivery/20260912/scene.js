import {FrameGate} from './performance.mjs';
/* Adapted from Ruijin app.js: configurePanoramaTexture, setupThree,
 * imagePointToWorld, projectImagePoint, setupInteraction and renderLoop.
 * Same local Three.js revision, inner cylinder and YXZ center camera.
 */
const T=window.THREE, DEG=Math.PI/180;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export class CylinderRoom {
 constructor(viewport,config,onPick,onDirection){
  window.frDelivery.registerRoom(this);this.viewport=viewport;this.canvas=document.querySelector('#panorama');this.config=config;
  this.radius=config.radius;this.arc=config.arcDegrees*DEG;this.yaw=0;this.pitch=0;
  this.height=this.radius*this.arc/(16/9);this.onPick=onPick;this.onDirection=onDirection;
  this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0x090908,1);
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(config.baseVerticalFovDegrees,1,.1,50);
  this.camera.rotation.order='YXZ';this.camera.position.set(0,0,0);
  this.material=new T.MeshBasicMaterial({side:T.BackSide,toneMapped:false});
  this.material.onBeforeCompile=shader=>{
   if(!this.material.map?.isVideoTexture)return;
   const anchor='#include <map_fragment>';
   if(!shader.fragmentShader.includes(anchor))throw Error('VIDEO_COLOR_SHADER');
   shader.fragmentShader=shader.fragmentShader.replace(anchor,anchor+'\n'+
    'diffuseColor.rgb = mix(pow(diffuseColor.rgb * 0.9478672986 + vec3(0.0521327014), vec3(2.4)), diffuseColor.rgb * 0.0773993808, vec3(lessThanEqual(diffuseColor.rgb, vec3(0.04045))));');
  };
  this.material.customProgramCacheKey=()=>this.material.map?.isVideoTexture?'course-video-srgb-v1':'course-still-srgb-v1';
  this.mesh=new T.Mesh(this.geometry(),this.material);this.scene.add(this.mesh);
  this.raycaster=new T.Raycaster();this.hotspots=[];this.enabled=false;this.suspended=false;
  this._frameGate=new FrameGate();this._hotspotVersion=0;this._viewSize=[0,0];window.frDelivery.registerLifecycle({dispose:()=>this._frameGate.dispose()});
  this.resize=()=>{const w=viewport.clientWidth,h=viewport.clientHeight;this._viewSize=[w,h];this.renderer.setSize(w,h,false);this.camera.aspect=w/Math.max(h,1);
   this.camera.fov=Math.min(config.baseVerticalFovDegrees,2*Math.atan(Math.tan(112*DEG/2)/this.camera.aspect)/DEG);
   this.camera.updateProjectionMatrix();this.constrain();};
  this.observer=new ResizeObserver(this.resize);this.observer.observe(viewport);document.addEventListener('fullscreenchange',this.resize);
  this.setupInteraction();this.resize();
  // Flat media owns the visible frame. Do not redraw the hidden panorama behind it.
  const frame=()=>{const work=this._frameGate.sample({visible:!this.flat&&!this.canvas.hidden&&!document.hidden,video:this._activeMedia?.video||null,pose:[this.yaw,this.pitch,this.camera.fov,this.camera.aspect,...this._viewSize,this.material.map],overlay:[this.enabled,this.suspended,this._hotspotVersion]});if(work.draw){this.updateCamera();this.renderer.render(this.scene,this.camera);}if(work.project)this.projectHotspots();this.handle=requestAnimationFrame(frame);};this.handle=requestAnimationFrame(frame);
 }
 geometry(){return new T.CylinderGeometry(this.radius,this.radius,this.height,112,1,true,Math.PI-this.arc/2,this.arc);}
 configureTexture(texture){texture.colorSpace=texture.isVideoTexture?T.NoColorSpace:T.SRGBColorSpace;texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;
  texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());texture.generateMipmaps=false;
  texture.wrapS=T.RepeatWrapping;texture.repeat.x=-1;texture.offset.x=1;texture.needsUpdate=true;return texture;}
 setMedia(asset){
  this._activeMedia=asset;this._frameGate.dirty=true;
  if(this.material.map===asset.texture&&this.canvas.dataset.background===asset.key)return;
  const nextHeight=this.radius*this.arc/asset.aspect;
  this.renderer.initTexture(asset.texture); // Upload decoded media before replacing the visible map.
  if(Math.abs(nextHeight-this.height)>.00001){this.height=nextHeight;const old=this.mesh.geometry;this.mesh.geometry=this.geometry();old.dispose();}
  this.material.map=asset.texture;this.material.needsUpdate=true;this.canvas.dataset.background=asset.key;
  this.canvas.dataset.backgroundTexture=asset.video?'VideoTexture':'Texture';this.constrain();
  this.updateCamera();this.renderer.render(this.scene,this.camera);
 }
 updateCamera(){this.camera.rotation.x=this.pitch;this.camera.rotation.y=-this.yaw;this.camera.updateMatrixWorld();}
 direction(){return {yaw:this.yaw,pitch:this.pitch};}
 setDirection(d){this.yaw=Number.isFinite(d?.yaw)?d.yaw:0;this.pitch=Number.isFinite(d?.pitch)?d.pitch:0;this.constrain();}
 extents(pitch){
  const v=Math.tan(this.camera.fov*DEG/2),h=v*this.camera.aspect,rot=new T.Euler(pitch,0,0,'YXZ');let horizontal=0,vertical=0;
  for(const x of [-h,0,h])for(const y of [-v,v]){const r=new T.Vector3(x,y,-1).applyEuler(rot);horizontal=Math.max(horizontal,Math.abs(Math.atan2(r.x,-r.z)));vertical=Math.max(vertical,Math.abs(r.y)/Math.hypot(r.x,r.z));}
  return {horizontal,vertical};
 }
 constrain(){
  // Actual frustum rays, including pitch and aspect. Never allow the frustum beyond cylinder edges.
  let lo=0,hi=this.config.pitchLimitDegrees*DEG;const slope=this.height/(2*this.radius)-.015;
  for(let i=0;i<20;i++){const m=(lo+hi)/2;if(this.extents(m).vertical<slope)lo=m;else hi=m;}
  this.pitch=clamp(this.pitch,-lo,lo);this.yawLimit=Math.max(0,this.arc/2-this.extents(this.pitch).horizontal-this.config.edgeGuardDegrees*DEG);
  this.yaw=clamp(this.yaw,-this.yawLimit,this.yawLimit);this.updateCamera();
 }
 imagePointToWorld(u,v){const geometryU=1-u,theta=Math.PI-this.arc/2+geometryU*this.arc;
  return new T.Vector3(this.radius*Math.sin(theta),(.5-v)*this.height,this.radius*Math.cos(theta));}
 project(u,v){const world=this.imagePointToWorld(u,v),direction=new T.Vector3();this.camera.getWorldDirection(direction);const p=world.clone().project(this.camera);
  return {x:(p.x*.5+.5)*this._viewSize[0],y:(.5-p.y*.5)*this._viewSize[1],visible:world.clone().normalize().dot(direction)>0&&Math.abs(p.x)<.96&&Math.abs(p.y)<.94&&p.z>-1&&p.z<1};}
 setHotspots(items,seen){this._hotspotVersion++;this.hotspots=items;const layer=document.querySelector('#hotspots');layer.replaceChildren();for(const item of items){
  const el=document.createElement('button');el.className='hotspot';el.dataset.hotspot=item.id;el.textContent=item.label;
  if(seen[item.id]){const badge=document.createElement('span');badge.className='seen';badge.textContent='已交谈';el.append(badge);}
  el.setAttribute('aria-label',item.label+(seen[item.id]?'，已交谈':''));
  el.addEventListener('click',e=>{if(e.detail===0&&this.enabled&&!this.suspended)this.onPick(item.id);});item.element=el;layer.append(el);}}
 projectHotspots(){for(const item of this.hotspots){const p=this.project(item.u,item.v);item.element.hidden=!this.enabled||this.suspended||!p.visible;item.element.style.left=p.x+'px';item.element.style.top=p.y+'px';}}
 uvAt(x,y){const rect=this.canvas.getBoundingClientRect();this.raycaster.setFromCamera(new T.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),this.camera);
  const hit=this.raycaster.intersectObject(this.mesh)[0];return hit?{u:1-hit.uv.x,v:1-hit.uv.y}:null;}
 setupInteraction(){const v=this.viewport;
  v.addEventListener('pointerdown',e=>{if(this.flat||this.suspended||e.button!==0||e.target.closest('[data-ui]')||this.drag)return;
   this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,origin:this.direction(),moved:false,hotspot:e.target.closest('[data-hotspot]')?.dataset.hotspot};v.setPointerCapture(e.pointerId);});
  v.addEventListener('pointermove',e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;
   if(Math.hypot(dx,dy)>6)d.moved=true;if(!d.moved)return;v.classList.add('dragging');this.yaw=d.origin.yaw-dx*.00145;this.pitch=d.origin.pitch+dy*.0012;this.constrain();});
  v.addEventListener('pointerup',e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;
   const isClick=!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<=6;this.clearDrag();this.onDirection(this.direction());
   if(!isClick||!this.enabled||this.suspended)return;const uv=this.uvAt(e.clientX,e.clientY);
   if(this.calibrationPick&&uv){this.calibrationPick(uv);return;}
   const item=this.hotspots.find(h=>h.id===d.hotspot)||this.hotspots.find(h=>uv&&uv.u>=h.bounds.left&&uv.u<=h.bounds.right&&uv.v>=h.bounds.top&&uv.v<=h.bounds.bottom);
   if(item)this.onPick(item.id);
  });
  for(const name of ['pointercancel','lostpointercapture','pointerleave'])v.addEventListener(name,()=>{this.clearDrag();this.onDirection(this.direction());});
  window.addEventListener('blur',()=>this.clearDrag());
 }
 clearDrag(){const d=this.drag;this.drag=null;this.viewport.classList.remove('dragging');if(d&&this.viewport.hasPointerCapture(d.id))this.viewport.releasePointerCapture(d.id);}
 diagnostics(){return {performance:{...this._frameGate.stats},cameraPosition:this.camera.position.toArray(),direction:this.direction(),yawLimit:this.yawLimit,height:this.height,arc:this.arc,frustum:this.extents(this.pitch),textures:this.renderer.info.memory.textures,geometry:this.mesh.geometry.type,background:this.canvas.dataset.background};}
}
