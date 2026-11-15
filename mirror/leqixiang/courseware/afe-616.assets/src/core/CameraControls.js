import * as THREE from '../../vendor/three.module.js';

// 桌面观察镜头：水平无限旋转，垂直方向使用带回弹的软限制。
export class CameraControls {
  constructor(camera,canvas){
    this.camera=camera;this.canvas=canvas;this.target=new THREE.Vector3(0,.7,0);
    this.radius=this.desiredRadius=19;this.theta=this.desiredTheta=.65;this.phi=this.desiredPhi=.86;
    this.minPolarAngle=.28;this.maxPolarAngle=1.31;this.minDistance=10.5;this.maxDistance=26;
    this.enabled=true;this.reading=false;this.down=null;this.onClick=()=>{};this.vTheta=0;this.savedView=null;
    canvas.addEventListener('pointerdown',e=>this.#down(e));canvas.addEventListener('pointermove',e=>this.#move(e));canvas.addEventListener('pointerup',e=>this.#up(e));canvas.addEventListener('pointercancel',()=>this.#cancel());
    canvas.addEventListener('wheel',e=>{e.preventDefault();if(!this.enabled||this.reading)return;this.desiredRadius=THREE.MathUtils.clamp(this.desiredRadius+e.deltaY*.012,this.minDistance,this.maxDistance);},{passive:false});
  }
  #down(e){if(!this.enabled||this.reading||this.transition)return;this.canvas.setPointerCapture(e.pointerId);this.down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,t:performance.now()};this.vTheta=0;}
  #move(e){if(!this.down||!this.enabled)return;const dx=e.clientX-this.down.lx,dy=e.clientY-this.down.ly;this.down.lx=e.clientX;this.down.ly=e.clientY;if(Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>4)this.down.drag=true;this.vTheta=-dx*.0055;this.desiredTheta+=this.vTheta;const raw=this.desiredPhi-dy*.0045;this.desiredPhi=this.#softPolar(raw);}
  #up(e){if(!this.down)return;const click=!this.down.drag&&performance.now()-this.down.t<450;this.down=null;this.desiredPhi=THREE.MathUtils.clamp(this.desiredPhi,this.minPolarAngle,this.maxPolarAngle);if(click)this.onClick(e);}
  #cancel(){this.down=null;this.desiredPhi=THREE.MathUtils.clamp(this.desiredPhi,this.minPolarAngle,this.maxPolarAngle);}
  #softPolar(value){const overshoot=.11;if(value<this.minPolarAngle)return Math.max(this.minPolarAngle-overshoot,this.minPolarAngle-(this.minPolarAngle-value)*.18);if(value>this.maxPolarAngle)return Math.min(this.maxPolarAngle+overshoot,this.maxPolarAngle+(value-this.maxPolarAngle)*.18);const edge=.13;if(value<this.minPolarAngle+edge)return this.minPolarAngle+(value-this.minPolarAngle)*.72;if(value>this.maxPolarAngle-edge)return this.maxPolarAngle-(this.maxPolarAngle-value)*.72;return value;}
  focusOpenBook(){this.reading=false;this.#transition({theta:0,phi:.48,radius:18,target:new THREE.Vector3(0,.8,0),fov:38},850);}
  enterReading(){if(this.reading)return;this.savedView={theta:this.theta,phi:this.phi,radius:this.radius,target:this.target.clone(),fov:this.camera.fov};this.reading=true;this.#transition({theta:0,phi:.22,radius:16.8,target:new THREE.Vector3(0,.85,0),fov:30},700);}
  exitReading(){if(!this.reading)return;this.reading=false;this.#transition(this.savedView||{theta:0,phi:.48,radius:18,target:new THREE.Vector3(0,.8,0),fov:38},700);this.savedView=null;}
  #transition(to,duration){this.transition={from:{theta:this.theta,phi:this.phi,radius:this.radius,target:this.target.clone(),fov:this.camera.fov},to,start:performance.now(),duration};this.desiredTheta=to.theta;this.desiredPhi=to.phi;this.desiredRadius=to.radius;}
  update(){
    if(this.transition){const t=Math.min(1,(performance.now()-this.transition.start)/this.transition.duration),p=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,{from,to}=this.transition;this.theta=THREE.MathUtils.lerp(from.theta,to.theta,p);this.phi=THREE.MathUtils.lerp(from.phi,to.phi,p);this.radius=THREE.MathUtils.lerp(from.radius,to.radius,p);this.target.lerpVectors(from.target,to.target,p);this.camera.fov=THREE.MathUtils.lerp(from.fov,to.fov,p);this.camera.updateProjectionMatrix();if(t===1)this.transition=null;
    }else{if(!this.down&&!this.reading){this.desiredTheta+=this.vTheta;this.vTheta*=.86;this.desiredPhi=THREE.MathUtils.lerp(this.desiredPhi,THREE.MathUtils.clamp(this.desiredPhi,this.minPolarAngle,this.maxPolarAngle),.16);}this.theta=THREE.MathUtils.lerp(this.theta,this.desiredTheta,.16);this.phi=THREE.MathUtils.lerp(this.phi,this.desiredPhi,.18);this.radius=THREE.MathUtils.lerp(this.radius,this.desiredRadius,.14);}
    const s=Math.sin(this.phi);this.camera.position.set(this.target.x+this.radius*s*Math.sin(this.theta),this.target.y+this.radius*Math.cos(this.phi),this.target.z+this.radius*s*Math.cos(this.theta));this.camera.position.y=Math.max(2.25,this.camera.position.y);this.camera.lookAt(this.target);
  }
}
