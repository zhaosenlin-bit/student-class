import * as THREE from '../../vendor/three.module.js';

export class PageTurner {
  constructor(material){
    const geo=new THREE.PlaneGeometry(6,8,24,5);geo.rotateX(-Math.PI/2);geo.translate(3,0,0);
    this.base=Float32Array.from(geo.attributes.position.array);this.group=new THREE.Group();this.group.visible=false;
    this.mesh=new THREE.Mesh(geo,material);this.mesh.position.y=1.155;this.mesh.castShadow=true;this.mesh.receiveShadow=true;
    const underMaterial=material.clone();underMaterial.color.multiplyScalar(.9);const underGeo=geo.clone();this.underside=new THREE.Mesh(underGeo,underMaterial);this.underside.position.y=1.115;this.underside.castShadow=true;
    this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(6,8),new THREE.MeshBasicMaterial({color:0x24170d,transparent:true,opacity:0,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.shadow.position.set(3,1.13,0);
    this.group.add(this.shadow,this.underside,this.mesh);this.busy=false;this.dragging=false;this.progress=0;this.direction=1;this.onProgress=()=>{};
  }
  startDrag(direction=1){if(this.busy)return false;this.busy=true;this.dragging=true;this.direction=direction;this.progress=0;this.group.visible=true;this.#deform(0);return true;}
  dragTo(progress){if(!this.dragging)return;this.progress=THREE.MathUtils.clamp(progress,0,.98);this.#deform(this.progress);this.onProgress(this.progress);}
  endDrag(){if(!this.dragging)return Promise.resolve(false);this.dragging=false;const target=this.progress>=.5?1:0,distance=Math.abs(target-this.progress);return new Promise(resolve=>{this.anim={from:this.progress,to:target,start:performance.now(),duration:320+distance*430,resolve};});}
  turn(direction=1){if(!this.startDrag(direction))return Promise.resolve(false);this.dragging=false;return new Promise(resolve=>{this.anim={from:0,to:1,start:performance.now(),duration:920,resolve};});}
  #deform(progress){const p=THREE.MathUtils.clamp(progress,0,1),top=this.mesh.geometry.attributes.position.array,under=this.underside.geometry.attributes.position.array,sign=this.direction;for(let i=0;i<top.length;i+=3){const sourceX=this.base[i],z=this.base[i+2],u=sourceX/6,bx=sign*sourceX,angle=sign*p*Math.PI*(.72+.28*u),curl=Math.sin(u*Math.PI)*Math.sin(p*Math.PI),x=Math.cos(angle)*bx,y=Math.abs(Math.sin(angle)*bx)*.72+curl*.72,zz=z+sign*(u-.5)*curl*.22;top[i]=under[i]=x;top[i+1]=under[i+1]=y;top[i+2]=under[i+2]=zz;}for(const geometry of [this.mesh.geometry,this.underside.geometry]){geometry.attributes.position.needsUpdate=true;geometry.computeVertexNormals();}this.shadow.position.x=sign*3;this.shadow.material.opacity=.2*Math.sin(p*Math.PI);}
  update(){if(!this.anim)return;const t=Math.min(1,(performance.now()-this.anim.start)/this.anim.duration),ease=1-Math.pow(1-t,3);this.progress=THREE.MathUtils.lerp(this.anim.from,this.anim.to,ease);this.#deform(this.progress);this.onProgress(this.progress);if(t===1){const completed=this.anim.to===1,resolve=this.anim.resolve;this.anim=null;this.busy=false;this.group.visible=false;this.progress=0;this.onProgress(completed?1:0);resolve(completed);}}
}
