// Fixed classroom interaction kernel. Model authority stays in the parent host.
import {connectResource} from './resource-client-v1.mjs';
// A fresh cache key prevents an older cached v1 helper (without hitTest) from
// breaking the new viewer while preserving existing lessons' import paths.
import {verifyAsset,createAnchors} from './anchors-v1.mjs?viewer=1';

export function fitCamera(THREE,camera,controls,bounds,direction=new THREE.Vector3(0,0,1)) {
  if(!camera.isPerspectiveCamera||bounds.isEmpty()||![...bounds.min.toArray(),...bounds.max.toArray(),camera.aspect,camera.fov].every(Number.isFinite)||camera.aspect<=0||camera.fov<=0||camera.fov>=175)throw Error('模型范围或镜头参数无效');
  const center=bounds.getCenter(new THREE.Vector3()),radius=Math.max(bounds.getSize(new THREE.Vector3()).length()/2,1e-6);
  const vertical=THREE.MathUtils.degToRad(camera.fov)/2,horizontal=Math.atan(Math.tan(vertical)*camera.aspect);
  const distance=radius/Math.sin(Math.min(vertical,horizontal))*1.12;
  if(!Number.isFinite(distance)||!direction.toArray().every(Number.isFinite)||direction.lengthSq()===0)throw Error('模型镜头无法拟合');
  camera.zoom=1;camera.near=Math.max(radius*.001,1e-8);camera.far=distance*3+radius*4;
  camera.position.copy(center).add(direction.clone().normalize().multiplyScalar(distance));
  controls.target.copy(center);controls.minDistance=radius*1.05;controls.maxDistance=distance*3;
  camera.lookAt(center);camera.updateProjectionMatrix();camera.updateMatrixWorld();controls.update();
  return {center:center.toArray(),radius,distance};
}

export async function createCourseViewer({THREE,GLTFLoader,OrbitControls,element,resourceId,onSelect=()=>{},onStatus=()=>{}}) {
  if(!element?.ownerDocument||!THREE||!GLTFLoader||!OrbitControls)throw Error('模型显示组件参数不完整');
  const doc=element.ownerDocument,view=doc.defaultView;
  if(element.querySelector('[data-txl-viewer]'))throw Error('此显示区域已经有模型');
  const stage=doc.createElement('div');stage.dataset.txlViewer='1';
  stage.style.cssText='position:relative;width:100%;height:100%;min-height:240px;overflow:hidden;isolation:isolate';
  const notice=doc.createElement('div');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  notice.style.cssText='position:absolute;left:16px;bottom:16px;right:16px;z-index:2;font:13px/1.6 system-ui;color:var(--txl-status,#536274);pointer-events:none';
  const label=doc.createElement('div');label.hidden=true;
  label.style.cssText='position:absolute;left:0;top:0;z-index:1;pointer-events:none;font:600 14px/1.6 system-ui;padding:5px 10px;border:1px solid var(--txl-border,#ccd6dc);border-radius:8px;background:var(--txl-label-bg,#fff);color:var(--txl-label-color,#253443);max-width:90%;box-sizing:border-box;overflow-wrap:anywhere';
  stage.append(label,notice);element.append(stage);
  let client,gltf,anchors,resource,renderer,controls,observer,frame=0,closed=false,editing=false,selected=null,saving=false,baseline='',bounds,pointer=null,fitted=false,contextLost=false;
  const layers=new Set();let previousFrame=null;
  const state=()=>({selected,editing,saving,version:resource?.version||null,dirty:!!anchors&&anchors.exportData()!==baseline});
  const status=(type,message)=>{if(closed)return;notice.textContent=message;notice.dataset.state=type;onStatus({type,message,state:state()});};
  const ensure=()=>{if(closed||contextLost)throw Error('模型显示已关闭，请重新打开课件');};
  function dispose(){
    if(closed)return;closed=true;view.cancelAnimationFrame(frame);observer?.disconnect();controls?.dispose();anchors?.dispose();client?.dispose();
    for(const layer of [...layers])layer.dispose();
    const geometries=new Set(),materials=new Set(),textures=new Set();
    gltf?.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer?.dispose();stage.remove();
  }
  try {
    status('loading','正在读取模型');client=await connectResource(resourceId);
    const loaded=await client.load();resource=loaded.resource;
    status('verifying','正在核对模型版本');const verified=await verifyAsset(loaded.bytes,resource.manifest.sha256);
    const modelLoader=new GLTFLoader();
    // Library GLBs contain their own images. Use the existing img-src blob:
    // permission instead of ImageBitmapLoader's fetch(blob:), which the
    // production connect-src intentionally blocks. Keep the opaque sandbox.
    modelLoader.register(parser=>{
      parser.textureLoader=new THREE.TextureLoader(parser.options.manager)
        .setCrossOrigin(parser.options.crossOrigin).setRequestHeader(parser.options.requestHeader);
      return {name:'TXL_embedded_image_loader'};
    });
    gltf=await modelLoader.parseAsync(loaded.bytes,'');
    status('binding','正在连接结构与标注');anchors=await createAnchors(THREE,gltf,resource.manifest,verified);
    if(resource.anchors)anchors.importData(JSON.stringify(resource.anchors));baseline=anchors.exportData();
    const scene=new THREE.Scene();scene.add(gltf.scene);
    // Preserve the original node transforms, materials and textures. Fit the
    // camera to world bounds instead of translating and then scaling the root.
    gltf.scene.updateWorldMatrix(true,true);bounds=new THREE.Box3().setFromObject(gltf.scene);
    // Teacher-created overlays share the model's world coordinates and render
    // loop. They cannot change resource identity, model transforms or anchors.
    function addTeachingLayer({object,update=()=>{},playing=true}={}){
      ensure();
      if(!object?.isObject3D||object.parent||typeof update!=='function'||typeof playing!=='boolean'||layers.size>=16)throw Error('教学动画图层参数无效');
      let elapsed=0,removed=false;
      const owned={object,tick(delta){if(removed||!playing)return;elapsed+=delta;try{update({elapsed,delta});}catch(e){playing=false;status('animation-error','教学动画暂时停止，请调整动画实现');}},
        dispose(){if(removed)return;removed=true;layers.delete(owned);object.removeFromParent();const geometries=new Set(),materials=new Set();object.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
      const active=()=>{ensure();if(removed)throw Error('教学动画图层已移除');};
      scene.add(object);layers.add(owned);
      try{update({elapsed:0,delta:0});}catch(e){owned.dispose();throw e;}
      return Object.freeze({play(){active();playing=true;},pause(){active();playing=false;},reset(){active();playing=false;elapsed=0;update({elapsed:0,delta:0});},setVisible(value){active();if(typeof value!=='boolean')throw Error('显示状态无效');object.visible=value;},dispose:owned.dispose});
    }
    function addParticleFlow({points,color=0xffcc55,count=36,duration=4,size,depthTest=true,playing=true}={}){
      // Default overlays must remain visible at classroom projection size.
      // Explicit lesson sizes retain their existing world-unit semantics.
      ensure();const radius=bounds.getSize(new THREE.Vector3()).length();size=size??radius*.018;
      if(!Array.isArray(points)||points.length<2||points.length>64||points.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))||
        !Number.isInteger(count)||count<1||count>200||!Number.isFinite(duration)||duration<.2||duration>120||!Number.isFinite(size)||size<=0||size>radius*.1||typeof depthTest!=='boolean')throw Error('粒子流动参数无效');
      const vectors=points.map(p=>new THREE.Vector3(...p));
      if(!vectors.some(v=>v.distanceToSquared(vectors[0])>1e-12))throw Error('粒子路径不能重合');
      const curve=new THREE.CatmullRomCurve3(vectors,false,'centripetal'),positions=new Float32Array(count*3);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      const material=new THREE.PointsMaterial({color,size,sizeAttenuation:true,depthTest,depthWrite:false,transparent:true,opacity:.95});
      const object=new THREE.Points(geometry,material);object.frustumCulled=false;
      try{return addTeachingLayer({object,playing,update:({elapsed})=>{for(let i=0;i<count;i++)curve.getPoint((elapsed/duration+i/count)%1).toArray(positions,i*3);geometry.attributes.position.needsUpdate=true;}});}
      catch(e){geometry.dispose();material.dispose();throw e;}
    }
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(view.devicePixelRatio||1,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    const canvas=renderer.domElement;canvas.style.cssText='display:block;width:100%;height:100%;position:absolute;inset:0;touch-action:none';
    canvas.setAttribute('aria-label','三维模型，拖动旋转、滚轮缩放；也可使用结构目录选择');stage.prepend(canvas);
    scene.add(new THREE.HemisphereLight(0xffffff,0x647080,2));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(1,2,3);scene.add(light);
    const camera=new THREE.PerspectiveCamera(45,1,.01,1000);controls=new OrbitControls(camera,canvas);controls.enableDamping=true;
    function resize(){
      const r=stage.getBoundingClientRect();if(r.width<=0||r.height<=0)return;
      const direction=fitted?camera.position.clone().sub(controls.target):new THREE.Vector3(0,0,1);
      renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;fitCamera(THREE,camera,controls,bounds,direction);fitted=true;
    }
    observer=new view.ResizeObserver(resize);observer.observe(stage);resize();
    function select(key){ensure();const part=anchors.list().find(p=>p.key===key);if(!part)throw Error('当前模型没有这个结构');selected=key;anchors.highlight(key);label.textContent=part.label;label.hidden=false;onSelect({...part});status('selected','已选择'+part.label+(editing?'，请点该结构表面调整标注':'，可旋转观察'));}
    canvas.addEventListener('pointerdown',e=>{if(e.button===0&&e.isPrimary!==false)pointer={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};else pointer=null;});
    canvas.addEventListener('pointermove',e=>{if(pointer?.id===e.pointerId&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>6)pointer.moved=true;});
    canvas.addEventListener('pointercancel',()=>{pointer=null;});
    canvas.addEventListener('pointerleave',()=>{pointer=null;});
    canvas.addEventListener('pointerup',e=>{
      const click=pointer&&pointer.id===e.pointerId&&!pointer.moved&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)<=6;pointer=null;if(!click||closed||contextLost)return;
      if(editing){if(anchors.pick(selected,e,camera,canvas))status('adjusted','标注位置已调整，请保存');else status('miss','未点中所选结构，请退出调整并旋转至结构露出');}
      else {const key=anchors.hitTest(e,camera,canvas);if(key)select(key);else status('miss','这里没有已映射结构，可从目录选择');}
    });
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;view.cancelAnimationFrame(frame);status('error','显示资源已中断，请重新打开课件；未保存的调整尚未保存');});
    await client.setSnapshotProvider(()=>{ensure();if(saving)throw Error('标注正在保存，请稍后再保存课件');return {anchors:JSON.parse(anchors.exportData()),version:resource.version};},updated=>{
      if(closed)return;Object.assign(resource,updated);baseline=JSON.stringify(updated.anchors,null,2);status('saved',state().dirty?'已保存此前标注，当前调整还未保存':'标注已保存');
    });
    function render(time){if(closed||contextLost)return;const delta=Number.isFinite(time)&&previousFrame!==null?Math.max(0,Math.min((time-previousFrame)/1000,.1)):0;if(Number.isFinite(time))previousFrame=time;for(const layer of layers)layer.tick(delta);controls.update();if(selected){const point=anchors.project(selected,camera,canvas);label.hidden=!point.visible;if(point.visible){const r=canvas.getBoundingClientRect();label.style.transform=`translate(${Math.max(0,Math.min(point.x+12,r.width-label.offsetWidth))}px,${Math.max(0,Math.min(point.y+12,r.height-label.offsetHeight))}px)`;}}renderer.render(scene,camera);frame=view.requestAnimationFrame(render);}
    render();status('ready','拖动旋转，点选结构；调整标注需先选择结构');
    return Object.freeze({parts:()=>anchors.list(),select,addTeachingLayer,addParticleFlow,
      getSceneContext(){ensure();return {scene,model:gltf.scene,camera,controls,renderer,animations:gltf.animations||[]};},
      getModelBounds(){ensure();return {min:bounds.min.toArray(),max:bounds.max.toArray(),center:bounds.getCenter(new THREE.Vector3()).toArray(),size:bounds.getSize(new THREE.Vector3()).toArray()};},
      getPartPosition(key){ensure();return anchors.world(key).toArray();},
      setEditing(value){ensure();if(typeof value!=='boolean')throw Error('标注调整状态无效');if(value&&!selected)throw Error('请先选择要调整的结构');editing=value;controls.enableRotate=!value;controls.enablePan=!value;pointer=null;status(value?'editing':'ready',value?'请点所选结构的表面，调整标注位置':'已退出标注调整，可拖动旋转');},
      resetView(){ensure();controls.reset();fitCamera(THREE,camera,controls,bounds);status('ready','已恢复整体视角，标注位置保留');},
      resetAnchors(){ensure();anchors.reset();if(selected)anchors.highlight(selected);status('adjusted','已恢复默认标注，请保存');},
      async saveAnnotations(){ensure();if(saving)throw Error('标注正在保存');saving=true;const snapshot=anchors.exportData();status('saving','正在保存标注');try{const saved=await client.save(JSON.parse(snapshot),resource.version);ensure();Object.assign(resource,saved.resource);baseline=snapshot;saving=false;status('saved',state().dirty?'已保存此前标注，当前调整还未保存':'标注已保存');return state();}catch(e){saving=false;status('error',e.message);throw e;}},
      getState:state,dispose});
  } catch(e) {
    status('error',e.message);dispose();
    const error=doc.createElement('p');error.setAttribute('role','alert');error.textContent='模型未能打开：'+e.message;element.append(error);throw e;
  }
}
