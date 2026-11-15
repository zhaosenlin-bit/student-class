import * as THREE from '../../vendor/three.module.js';

export class SceneManager {
  constructor(container, performance) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x17120e, .027);
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
    this.camera.position.set(10, 11, 13);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: performance.antialias, alpha:true, powerPreference:'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = performance.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pixelRatio = performance.pixelRatio;
    container.appendChild(this.renderer.domElement);
    this.mixers = [];
    this.#environment();
    this.resize();
    addEventListener('resize',()=>this.resize());
  }
  #environment() {
    const hemi = new THREE.HemisphereLight(0xffedcf,0x39271c,1.25);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffddb0,3.2); key.position.set(6,12,7); key.castShadow=true; key.shadow.mapSize.set(512,512);key.shadow.camera.left=key.shadow.camera.bottom=-12;key.shadow.camera.right=key.shadow.camera.top=12;key.shadow.camera.near=.5;key.shadow.camera.far=35;
    const rim = new THREE.DirectionalLight(0xaac7cf,1.2); rim.position.set(-9,6,-5);
    this.scene.add(key,rim);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(48,1,40),new THREE.MeshStandardMaterial({color:0x4b2d1b,roughness:.72,metalness:.03}));
    desk.position.y=-.55; desk.receiveShadow=true; this.scene.add(desk);
    const room = new THREE.Mesh(new THREE.CylinderGeometry(34,34,18,32,1,true),new THREE.MeshStandardMaterial({color:0x211711,roughness:1,side:THREE.BackSide}));room.position.y=8.4;this.scene.add(room);
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(11,20),new THREE.MeshStandardMaterial({color:0x273127,roughness:1}));
    runner.rotation.x=-Math.PI/2; runner.position.y=.01; runner.receiveShadow=true; this.scene.add(runner);
  }
  resize(){ const {clientWidth:w,clientHeight:h}=this.container; this.camera.aspect=w/h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w,h,false); this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.pixelRatio)); }
  render(){ this.renderer.render(this.scene,this.camera); }
  setQuality(settings){ this.pixelRatio=settings.pixelRatio;this.renderer.shadowMap.enabled=settings.shadows; this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.pixelRatio)); }
}
