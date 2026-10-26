import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CharacterView } from './character';
import type { Player } from '../types';

export class CharacterGallery {
  private renderer: THREE.WebGLRenderer|null=null;
  private observer: ResizeObserver|null=null;
  private controls: OrbitControls|null=null;
  private character: CharacterView|null=null;
  open(host: HTMLElement) {
    if(this.renderer)return;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    this.renderer=renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    host.append(renderer.domElement);
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(32,1,.05,30);
    camera.position.set(2,1.75,4.8);
    const orbit=new OrbitControls(camera,renderer.domElement);this.controls=orbit;
    orbit.target.set(0,1.16,0);orbit.enableDamping=true;orbit.dampingFactor=.07;orbit.autoRotate=true;orbit.autoRotateSpeed=.7;
    orbit.minDistance=.62;orbit.maxDistance=7;orbit.maxPolarAngle=Math.PI*.83;orbit.minPolarAngle=.18;
    scene.add(new THREE.HemisphereLight(0xe6f1ed,0x36454a,2.6));
    function light(color:number,power:number,x:number,y:number,z:number) {
      const l=new THREE.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);return l;
    }
    const key=light(0xffecd7,3.5,3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-3,right:3,top:4,bottom:-3,near:.1,far:15});
    light(0x8aced9,2.1,-3,3,-2);light(0xe4e9dc,1.3,-2,2,3);
    const character=new CharacterView('player');this.character=character;scene.add(character.root);
    const podium=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.05,.12,64),new THREE.MeshStandardMaterial({color:0x172c33,roughness:.55,metalness:.3}));
    podium.position.y=-.065;podium.receiveShadow=true;scene.add(podium);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.97,.008,5,80),new THREE.MeshBasicMaterial({color:0x8ca88b}));rim.rotation.x=Math.PI/2;rim.position.y=-.005;scene.add(rim);
    const state={position:new THREE.Vector3(),yaw:0,weapon:'sword',grounded:true,attackTimer:0,attackDuration:.5,block:false,dashTimer:0,hook:null} as Player;
    let previous=0,time=0;
    renderer.setAnimationLoop(now=>{
      const dt=Math.min((now-previous)/1000||.016,.05);previous=now;time+=dt;
      character.update(dt,time,state,0);orbit.update();renderer.render(scene,camera);
    });
    function resize() {const w=host.clientWidth,h=host.clientHeight;if(w===0||h===0)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
    this.observer=new ResizeObserver(resize);this.observer.observe(host);resize();
    // Dragging explicitly takes over from the automatic turntable.
    renderer.domElement.addEventListener('pointerdown',()=>orbit.autoRotate=false);
    host.onkeydown=e=>{if(e.code==='KeyV'){camera.position.set(0,2.05,.79);orbit.target.set(0,2.05,0);orbit.autoRotate=false;orbit.update();}};
    host.tabIndex=0;
    host.setAttribute('aria-label','三维角色鉴赏。拖动旋转，滚轮缩放，按 V 查看面部。');
    const close=()=>{
      scene.traverse(o=>{
        if(o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());
        }
      });
    };
    this.cleanupScene=close;
  }
  private cleanupScene=()=>{};
  close(host: HTMLElement) {
    this.observer?.disconnect();this.observer=null;
    this.renderer?.setAnimationLoop(null);this.controls?.dispose();this.controls=null;
    this.cleanupScene();this.cleanupScene=()=>{};
    this.character?.root.removeFromParent();this.character=null;
    this.renderer?.dispose();this.renderer?.forceContextLoss();this.renderer?.domElement.remove();this.renderer=null;
    host.onkeydown=null;
  }
}
