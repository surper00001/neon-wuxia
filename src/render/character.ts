import * as THREE from 'three';
import type { EnemyKind, Fighter, Player, Weapon } from '../types';
import { buildHero, type HeroDetails } from './hero';

export class CharacterView {
  root = new THREE.Group();
  torso = new THREE.Group();
  leftArm = new THREE.Group();
  rightArm = new THREE.Group();
  leftLeg = new THREE.Group();
  rightLeg = new THREE.Group();
  weapons = new Map<Weapon, THREE.Group>();
  private robes: THREE.Mesh[]=[];
  private scarf: THREE.Mesh;
  private metal: THREE.MeshStandardMaterial;
  private glow: THREE.MeshStandardMaterial;
  private restColor: THREE.Color;
  private isEnemy: boolean;
  private stride = 0;
  private hero: HeroDetails | null = null;
  private torsoHeight = 1.13;
  constructor(kind: 'player' | EnemyKind) {
    this.isEnemy=kind!=='player';
    const boss=kind==='boss';
    const accent=this.isEnemy?(boss?0xff5e5e:0xffa477):0x73f8dc;
    this.metal=new THREE.MeshStandardMaterial({color:this.isEnemy?0x31333c:0x243941,metalness:.8,roughness:.34});
    this.restColor=this.metal.color.clone();
    this.glow=new THREE.MeshStandardMaterial({color:accent,emissive:accent,emissiveIntensity:1.8});
    const cloth=new THREE.MeshStandardMaterial({color:this.isEnemy?0x302d37:0x101c26,roughness:.84,side:THREE.DoubleSide});
    const gray=new THREE.MeshStandardMaterial({color:0x6c7d81,metalness:.75,roughness:.27});
    const leather=new THREE.MeshStandardMaterial({color:0x0d141d,roughness:.7});
    if(!this.isEnemy) {
      this.hero=buildHero({root:this.root,torso:this.torso,leftArm:this.leftArm,rightArm:this.rightArm,
        leftLeg:this.leftLeg,rightLeg:this.rightLeg,metal:this.metal,glow:this.glow});
      this.scarf=this.hero.scarf;this.robes=this.hero.robes;this.torsoHeight=this.hero.torsoHeight;
      this.restColor=this.metal.color.clone();
      this.buildWeapons(gray,leather);
      this.setWeapon('sword');
      // Enemy-only materials are not attached to this rig.
      cloth.dispose();
      return;
    }
    const mask=new THREE.MeshStandardMaterial({color:this.isEnemy?0x626a73:0xc8d9cf,metalness:.4,roughness:.35});
    this.root.add(this.torso);
    this.torso.position.y=1.13;
    // Tapered cuirass, layered breastplate, waist and suspended lamellar plates.
    this.mesh(new THREE.CylinderGeometry(.31,.25,.69,8),this.metal,0,.28,0,this.torso);
    this.mesh(new THREE.BoxGeometry(.48,.34,.12),gray,0,.39,.28,this.torso).rotation.x=-.16;
    this.mesh(new THREE.BoxGeometry(.27,.24,.035),cloth,0,.42,.36,this.torso);
    this.mesh(new THREE.BoxGeometry(.04,.26,.04),this.glow,0,.41,.39,this.torso);
    this.mesh(new THREE.CylinderGeometry(.3,.29,.12,8),leather,0,-.13,0,this.torso);
    this.mesh(new THREE.BoxGeometry(.16,.13,.07),gray,0,-.13,.3,this.torso);
    for(let side of [-1,1]) {
      this.mesh(new THREE.BoxGeometry(.11,.16,.14),gray,side*.26,-.2,.18,this.torso);
      const robe=new THREE.Mesh(new THREE.PlaneGeometry(.35,.88,3,5),cloth);
      robe.position.set(side*.25,-.55,-.13);robe.rotation.y=side*.4;robe.rotation.x=.2;this.torso.add(robe);this.robes.push(robe);
      for(let i=0;i<3;i++) {
        const plate=this.mesh(new THREE.BoxGeometry(.19,.16,.12),this.metal,side*.31,-.23-i*.14,.04,this.torso);plate.rotation.z=side*.2;
      }
    }
    const head=new THREE.Group();head.position.y=.91;this.torso.add(head);
    this.mesh(new THREE.CylinderGeometry(.19,.17,.36,10),leather,0,0,0,head);
    const face=this.mesh(new THREE.SphereGeometry(.23,12,10,0,Math.PI),mask,0,.015,.065,head);face.scale.set(.8,1,.67);
    this.mesh(new THREE.BoxGeometry(.28,.036,.045),leather,0,.07,.224,head);
    for(let side of [-1,1]) this.mesh(new THREE.BoxGeometry(.075,.018,.025),this.glow,side*.075,.075,.25,head);
    this.mesh(new THREE.CylinderGeometry(.055,.045,.13,8),leather,0,.26,-.05,head);
    this.mesh(new THREE.SphereGeometry(.09,8,6),leather,0,.34,-.05,head);
    if(!this.isEnemy) {
      const hat=this.mesh(new THREE.ConeGeometry(.59,.16,24),this.metal,0,.24,0,head);
      hat.rotation.z=-.07;
      const rim=this.mesh(new THREE.TorusGeometry(.57,.012,4,40),this.glow,0,.166,0,head);rim.rotation.x=Math.PI/2;
      // Shoulder-mounted exosuit battery and emissive spine.
      this.mesh(new THREE.BoxGeometry(.25,.42,.12),this.metal,0,.4,-.3,this.torso);
      this.mesh(new THREE.BoxGeometry(.06,.29,.03),this.glow,0,.4,-.38,this.torso);
    } else {
      for(let side of [-1,1]) {
        const horn=this.mesh(new THREE.ConeGeometry(.06,.26,5),gray,side*.2,.26,.02,head);horn.rotation.z=-side*.45;
      }
    }
    const scarfMat=new THREE.MeshStandardMaterial({color:this.isEnemy?0x783831:0xcc6e42,roughness:.85,side:THREE.DoubleSide});
    this.mesh(new THREE.TorusGeometry(.23,.075,6,16),scarfMat,0,.72,0,this.torso).rotation.x=Math.PI/2;
    this.scarf=new THREE.Mesh(new THREE.PlaneGeometry(.2,1.3,3,9),scarfMat);this.scarf.position.set(-.1,.23,-.4);this.scarf.rotation.x=-.25;this.torso.add(this.scarf);
    for(let side of [-1,1]) {
      const arm=side<0?this.leftArm:this.rightArm;arm.position.set(side*.39,.57,0);this.torso.add(arm);
      const pad=this.mesh(new THREE.SphereGeometry(.24,8,6,0,Math.PI*2,0,Math.PI*.7),this.metal,side*.04,-.07,0,arm);pad.scale.set(1.05,.6,1.1);
      this.mesh(new THREE.CapsuleGeometry(.105,.29,3,8),cloth,side*.02,-.24,0,arm);
      this.mesh(new THREE.CylinderGeometry(.14,.11,.3,8),this.metal,side*.02,-.5,.04,arm).rotation.x=-.1;
      this.mesh(new THREE.BoxGeometry(.04,.23,.045),this.glow,side*.02,-.5,.17,arm);
      this.mesh(new THREE.SphereGeometry(.1,8,6),leather,side*.02,-.71,.07,arm);
      const leg=side<0?this.leftLeg:this.rightLeg;leg.position.set(side*.18,1.03,0);this.root.add(leg);
      this.mesh(new THREE.CapsuleGeometry(.13,.26,3,8),cloth,0,-.22,0,leg);
      this.mesh(new THREE.SphereGeometry(.14,8,6),this.metal,0,-.48,.035,leg);
      this.mesh(new THREE.CylinderGeometry(.135,.09,.36,8),this.metal,0,-.68,0,leg);
      this.mesh(new THREE.BoxGeometry(.045,.26,.03),gray,0,-.68,.125,leg);
      this.mesh(new THREE.BoxGeometry(.22,.16,.4),leather,0,-.94,.075,leg);
    }
    this.buildWeapons(gray,leather);
    // Visible sheathed katana diagonally across the back.
    const sheath=this.mesh(new THREE.BoxGeometry(.09,1.22,.09),leather,-.04,.08,-.42,this.torso);sheath.rotation.z=-.52;
    this.mesh(new THREE.BoxGeometry(.11,.24,.11),gray,.27,.7,-.43,this.torso).rotation.z=-.52;
    if(boss) this.root.scale.setScalar(1.42);
    this.setWeapon(kind==='gunner'?'pistol':kind==='boss'?'blade':'sword');
  }
  private mesh(g: THREE.BufferGeometry,m: THREE.Material,x: number,y: number,z: number,parent: THREE.Object3D) {
    const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;
  }
  private buildWeapons(gray: THREE.Material,leather: THREE.Material) {
    for(let weapon of ['sword','blade'] as Weapon[]) {
      const group=new THREE.Group();group.position.set(.03,-.7,.08);this.rightArm.add(group);
      this.mesh(new THREE.CylinderGeometry(.035,.04,.25,8),leather,0,-.1,0,group);
      this.mesh(new THREE.BoxGeometry(.29,.045,.13),gray,0,-.25,0,group);
      const shape=new THREE.Shape();
      if(weapon==='sword'){shape.moveTo(-.055,0);shape.lineTo(.055,0);shape.lineTo(.04,-1.05);shape.lineTo(0,-1.23);shape.lineTo(-.04,-1.05);}
      else{shape.moveTo(-.05,0);shape.lineTo(.09,0);shape.quadraticCurveTo(.13,-.65,.37,-1.18);shape.quadraticCurveTo(-.06,-.87,-.05,0);}
      const blade=this.mesh(new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),gray,0,-.27,0,group);
      const edge=blade.clone();edge.material=this.glow;edge.scale.set(.4,1.01,1.3);edge.position.z=.01;edge.castShadow=false;group.add(edge);
      this.weapons.set(weapon,group);
    }
    const pistol=new THREE.Group();pistol.position.set(.02,-.7,.09);this.rightArm.add(pistol);
    this.mesh(new THREE.BoxGeometry(.11,.28,.11),leather,0,-.02,0,pistol).rotation.x=-.2;
    this.mesh(new THREE.BoxGeometry(.16,.13,.46),this.metal,0,.1,.18,pistol);
    this.mesh(new THREE.BoxGeometry(.05,.045,.25),this.glow,0,.18,.23,pistol);
    this.mesh(new THREE.CylinderGeometry(.05,.05,.21,10),gray,0,.1,.48,pistol).rotation.x=Math.PI/2;
    this.mesh(new THREE.TorusGeometry(.05,.012,5,12),this.glow,0,.1,.595,pistol);
    this.weapons.set('pistol',pistol);
  }
  setWeapon(weapon: Weapon) { this.weapons.forEach((g,k)=>g.visible=k===weapon); }
  update(dt: number,time: number,state: Player | Fighter,speed: number) {
    this.root.position.copy(state.position);
    this.root.rotation.y=state.yaw;
    const player='weapon' in state?state:null;
    const fighter='kind' in state?state:null;
    if(player)this.setWeapon(player.weapon);
    this.stride+=dt*speed*1.5;
    const moving=Math.min(speed/5,1);
    this.leftLeg.rotation.x=Math.sin(this.stride)*moving*.72;
    this.rightLeg.rotation.x=-Math.sin(this.stride)*moving*.72;
    this.leftArm.rotation.set(Math.sin(this.stride)*moving*.3,0,-.1);
    this.rightArm.rotation.set(-Math.sin(this.stride)*moving*.3,0,.1);
    this.torso.rotation.set(Math.sin(time*2)*.014,0,Math.sin(this.stride)*moving*.03);
    this.torso.position.y=this.torsoHeight+Math.abs(Math.sin(this.stride))*moving*.04;
    if(player && !player.grounded) {
      this.leftLeg.rotation.x=-.55;this.rightLeg.rotation.x=.45;
      this.leftArm.rotation.z=-.5;this.rightArm.rotation.z=.5;
    }
    let progress=-1,heavy=false,step=0;
    if(player&&player.attackTimer>0){progress=1-player.attackTimer/player.attackDuration;heavy=player.attackHeavy;step=player.attackStep;}
    if(fighter&&fighter.state==='attack'){progress=1-fighter.timer/fighter.attackTime;heavy=fighter.kind==='boss';step=fighter.attackSerial%3;}
    if(progress>=0) {
      const swing=Math.sin(Math.min(progress,1)*Math.PI);
      this.rightArm.rotation.x=-1.8+swing*1.8;
      this.rightArm.rotation.z=(step%2?-1:1)*(1.3-swing*2.8);
      this.rightArm.rotation.y=swing*.6;
      this.torso.rotation.y=(step%2?-1:1)*swing*(heavy?1.1:.65);
      this.leftArm.rotation.x=-.65;this.leftArm.rotation.z=-.3;
      if(heavy)this.torso.rotation.x=-.18*swing;
    }
    if(player?.block){this.rightArm.rotation.set(-1.9,0,-.95);this.leftArm.rotation.set(-1.5,0,-.3);}
    if(player?.weapon==='pistol'||fighter?.kind==='gunner') {
      this.rightArm.rotation.set(-Math.PI/2,0,-.07);
      this.leftArm.rotation.set(-1.4,0,-.5);
      if(player?.reload)this.rightArm.rotation.x=-.65;
    }
    if(player?.hook){this.leftArm.rotation.set(-2.4,0,-.4);this.torso.rotation.x=-.2;}
    if(player&&player.dashTimer>0){this.torso.rotation.x=-.5;this.leftArm.rotation.x=1;this.rightArm.rotation.x=1;this.leftLeg.rotation.x=-.8;this.rightLeg.rotation.x=.9;}
    if(fighter?.state==='windup'){this.rightArm.rotation.set(-2.5,0,.5);this.leftArm.rotation.x=-.9;}
    if(fighter?.state==='stunned'){this.torso.rotation.x=-.3;this.rightArm.rotation.z=.5;}
    if(fighter?.state==='dead'){
      this.root.rotation.z=Math.min((2.5-fighter.timer)*4,Math.PI/2);
      this.root.position.y-=Math.min((2.5-fighter.timer)*2,.55);
      this.root.scale.multiplyScalar(1-dt*.25);
    }
    this.scarf.rotation.x=-.25-speed*.035+Math.sin(time*5)*.12;
    this.scarf.rotation.z=Math.sin(time*4)*.12;
    this.robes.forEach((r,i)=>{r.rotation.x=.2+speed*.045+Math.sin(time*5+i)*.07;});
    if(this.hero) {
      this.hero.hair.rotation.x=Math.sin(time*2.6)*.04+Math.min(speed,20)*.012;
      this.hero.hair.rotation.z=Math.sin(time*2)*.045;
      this.hero.ribbons.forEach((r,i)=>{r.rotation.x=Math.sin(time*3+i)*.1+speed*.015;r.rotation.z=Math.sin(time*2.4+i)*.07;});
      this.scarf.rotation.x=-.05-speed*.015+Math.sin(time*3)*.06;
      this.scarf.rotation.z=-.12+Math.sin(time*2)*.06;
    }
    if(fighter&&fighter.hitFlash>0)this.metal.color.set(0xeecaaa);else this.metal.color.copy(this.restColor);
  }
  dispose() {
    this.root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
    const materials=new Set<THREE.Material>();
    this.root.traverse(o=>{if(o instanceof THREE.Mesh){if(Array.isArray(o.material))o.material.forEach(m=>materials.add(m));else materials.add(o.material);}});
    materials.forEach(m=>m.dispose());
    this.root.removeFromParent();
  }
}
