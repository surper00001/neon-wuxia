import * as THREE from 'three';
import type { GameEvent, Player } from '../types';

interface Particle {position: THREE.Vector3;velocity: THREE.Vector3;life: number;maxLife: number;color: THREE.Color;size: number}
interface Transient {object: THREE.Object3D;life: number;maxLife: number;expand: number;spin: number}
export class Effects {
  private particles: Particle[]=[];
  private transients: Transient[]=[];
  private batch: THREE.InstancedMesh;
  private dummy=new THREE.Object3D();
  private rope: THREE.Line;
  private ropeData=new Float32Array(6);
  constructor(private scene: THREE.Scene) {
    this.batch=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,4,3),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),700);
    this.batch.count=0;this.batch.frustumCulled=false;scene.add(this.batch);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.ropeData,3));
    this.rope=new THREE.Line(g,new THREE.LineBasicMaterial({color:0x90ffe4,transparent:true,opacity:.95}));this.rope.frustumCulled=false;this.rope.visible=false;scene.add(this.rope);
  }
  private material(color: number,opacity=.9){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false});}
  private add(object: THREE.Object3D,life: number,expand=0,spin=0) {this.scene.add(object);this.transients.push({object,life,maxLife:life,expand,spin});}
  private burst(position: THREE.Vector3,count: number,color: number,force=5) {
    for(let i=0;i<count&&this.particles.length<700;i++) {
      const life=.3+Math.random()*.5;
      this.particles.push({position:position.clone(),velocity:new THREE.Vector3((Math.random()-.5)*force,Math.random()*force,(Math.random()-.5)*force),
        life,maxLife:life,color:new THREE.Color(color),size:1+Math.random()*1.4});
    }
  }
  handle(e: GameEvent) {
    if(!e.position)return;
    const pos=e.position;
    switch(e.type) {
      case'slash': {
        const arc=new THREE.Mesh(new THREE.TorusGeometry(e.heavy?3.3:2,.04,4,40,Math.PI*1.25),this.material(e.color??0x87ffdc));
        arc.position.copy(pos);arc.position.add(new THREE.Vector3(Math.sin(e.yaw??0),0,Math.cos(e.yaw??0)).multiplyScalar(.6));
        arc.rotation.set(Math.PI/2+(e.heavy?.05:.45),e.yaw??0,Math.random()*.7);
        this.add(arc,.22,1.5,2);
        const wide=new THREE.Mesh(new THREE.RingGeometry(e.heavy?2.6:1.5,e.heavy?3.2:1.95,40,1,0,Math.PI*1.3),this.material(e.color??0x87ffdc,.15));
        wide.position.copy(arc.position);wide.rotation.copy(arc.rotation);this.add(wide,.18,1.7,2);break;
      }
      case'hit':this.burst(pos,e.heavy?40:18,e.color??0xffc38c,e.heavy?11:7);break;
      case'parry': {
        this.burst(pos,30,0xc5ffed,8);
        const r=new THREE.Mesh(new THREE.TorusGeometry(.5,.03,4,40),this.material(0xa4ffe5));r.position.copy(pos);this.add(r,.25,5);break;
      }
      case'shot':case'enemyShot': {
        const end=e.target??pos.clone();
        const g=new THREE.BufferGeometry().setFromPoints([pos,end]);
        const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:e.color??0xffc080,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false}));
        this.add(line,.09);
        const flash=new THREE.Mesh(new THREE.IcosahedronGeometry(.15),this.material(e.color??0xffc080));flash.position.copy(pos);this.add(flash,.07);
        this.burst(pos,5,e.color??0xffc080,2);break;
      }
      case'dash':this.burst(pos.clone().add(new THREE.Vector3(0,.7,0)),24,0x64ebd5,4);this.groundRing(pos,0x60e7d0,.35,8);break;
      case'jump':this.groundRing(pos,e.color??0x7bd7c4,.35,e.heavy?5:2);this.burst(pos,8,0x7bd7c4,3);break;
      case'death':this.burst(pos,45,e.color??0xffb280,10);this.groundRing(pos,0xe78e62,.5,6);break;
      case'hook':this.burst(pos.clone().add(new THREE.Vector3(0,1.3,0)),12,0x80ffe6,3);break;
    }
  }
  private groundRing(p: THREE.Vector3,color: number,life: number,expand: number) {
    const r=new THREE.Mesh(new THREE.TorusGeometry(.4,.025,4,40),this.material(color,.6));r.rotation.x=Math.PI/2;r.position.copy(p);r.position.y+=.1;this.add(r,life,expand);
  }
  update(dt: number,p: Player) {
    this.particles=this.particles.filter(a=>a.life>0);
    this.particles.forEach((a,i)=>{
      a.life-=dt;a.position.addScaledVector(a.velocity,dt);a.velocity.y-=dt*10;
      this.dummy.position.copy(a.position);this.dummy.scale.setScalar(Math.max(0,a.life/a.maxLife)*a.size);this.dummy.updateMatrix();this.batch.setMatrixAt(i,this.dummy.matrix);this.batch.setColorAt(i,a.color);
    });
    this.batch.count=this.particles.length;this.batch.instanceMatrix.needsUpdate=true;if(this.batch.instanceColor)this.batch.instanceColor.needsUpdate=true;
    this.transients=this.transients.filter(t=>{
      t.life-=dt;
      if(t.life<=0){t.object.removeFromParent();const o=t.object as THREE.Mesh;o.geometry.dispose();(o.material as THREE.Material).dispose();return false;}
      const m=(t.object as THREE.Mesh).material as THREE.MeshBasicMaterial;m.opacity=Math.max(0,t.life/t.maxLife)*.8;
      if(t.expand)t.object.scale.addScalar(dt*t.expand);if(t.spin)t.object.rotation.z+=dt*t.spin;return true;
    });
    this.rope.visible=!!p.hook;
    if(p.hook) {
      this.ropeData.set([p.position.x-.25,p.position.y+1.7,p.position.z,p.hook.position.x,p.hook.position.y,p.hook.position.z]);
      this.rope.geometry.attributes.position.needsUpdate=true;
    }
  }
  reset() {
    this.particles=[];
    this.transients.forEach(t=>{t.object.removeFromParent();(t.object as THREE.Mesh).geometry.dispose();((t.object as THREE.Mesh).material as THREE.Material).dispose();});
    this.transients=[];this.rope.visible=false;this.batch.count=0;
  }
}
