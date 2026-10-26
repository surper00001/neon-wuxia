import { Vector3, Ray, Sphere } from 'three';
import type { Anchor, Fighter, GameEvent, InputState, Mode, Player, Weapon } from '../types';
import type { Motor } from '../physics/motor';

const UP = new Vector3(0,1,0);
export class Game {
  mode: Mode='menu';
  player: Player={
    position:new Vector3(0,0,12),velocity:new Vector3(),yaw:Math.PI,hp:100,energy:100,weapon:'sword',
    grounded:true,jumps:0,attackTimer:0,attackDuration:.5,attackStep:0,attackHeavy:false,attackHits:new Set(),
    queuedAttack:false,dashTimer:0,dashDirection:new Vector3(),dashCooldown:0,block:false,blockTime:0,
    invulnerable:0,ammo:12,reload:0,fireCooldown:0,hook:null,hookCooldown:0,lockId:null
  };
  enemies: Fighter[]=[];
  events: GameEvent[]=[];
  wave=0;
  waveKills=0;
  waveTotal=0;
  kills=0;
  score=0;
  combo=0;
  maxCombo=0;
  comboTimer=0;
  elapsed=0;
  waveDelay=0;
  cameraYaw=0;
  cameraPitch=.24;
  aimDirection=new Vector3(0,0,-1);
  aimOrigin=new Vector3();
  hookCandidate: Anchor|null=null;
  private nextId=1;
  private moveDirection=new Vector3();
  private shotWarning=false;
  constructor(public motor: Motor,public anchors: Anchor[]) {}
  start() {
    const p=this.player;
    Object.assign(p,{hp:100,energy:100,weapon:'sword',grounded:true,jumps:0,attackTimer:0,attackStep:0,attackHeavy:false,queuedAttack:false,
      dashTimer:0,dashCooldown:0,block:false,blockTime:0,invulnerable:0,ammo:12,reload:0,fireCooldown:0,hook:null,hookCooldown:0,lockId:null});
    p.position.set(0,0,12);p.velocity.set(0,0,0);p.yaw=Math.PI;p.attackHits.clear();
    this.motor.reset(p.position);
    this.enemies=[];this.events=[];this.wave=0;this.kills=0;this.score=0;this.combo=0;this.maxCombo=0;this.elapsed=0;this.comboTimer=0;
    this.waveDelay=1.8;this.cameraYaw=0;this.cameraPitch=.24;this.mode='playing';this.shotWarning=false;
    this.emit({type:'toast',text:'断月行动 · 清除天台守卫'});
  }
  emit(e: GameEvent) {this.events.push(e);}
  setWeapon(weapon: Weapon) {
    if(this.mode!=='playing')return;
    const p=this.player;if(p.attackTimer>0||p.reload>0)return;
    p.weapon=weapon;p.block=false;
    this.emit({type:'toast',text:weapon==='sword'?'流光剑 · 三段连斩':weapon==='blade'?'断雨刀 · 破甲重斩':'寂鸣枪 · 右键瞄准'});
  }
  update(dt: number,input: InputState) {
    if(this.mode!=='playing')return;
    const p=this.player;this.elapsed+=dt;
    if(this.comboTimer>0)this.comboTimer-=dt;else this.combo=0;
    if(this.waveDelay>0) {
      this.waveDelay-=dt;
      if(this.waveDelay<=0)this.nextWave();
    }
    p.energy=Math.min(100,p.energy+dt*(p.block?5:20));
    p.invulnerable=Math.max(0,p.invulnerable-dt);
    p.dashCooldown=Math.max(0,p.dashCooldown-dt);
    p.hookCooldown=Math.max(0,p.hookCooldown-dt);
    p.fireCooldown=Math.max(0,p.fireCooldown-dt);
    if(p.reload>0){p.reload-=dt;if(p.reload<=0){p.ammo=12;this.emit({type:'reload'});}}
    if(input.pressed.has('Digit1'))this.setWeapon('sword');
    if(input.pressed.has('Digit2'))this.setWeapon('blade');
    if(input.pressed.has('Digit3'))this.setWeapon('pistol');
    if(input.pressed.has('Tab'))this.toggleLock();
    const locked=this.enemies.find(e=>e.id===p.lockId&&e.hp>0);
    if(p.lockId&&!locked)p.lockId=null;
    if(locked && locked.position.distanceTo(p.position)<40) {
      const d=locked.position.clone().sub(p.position);
      const targetYaw=Math.atan2(-d.x,-d.z);
      this.cameraYaw=this.angleLerp(this.cameraYaw,targetYaw,Math.min(1,dt*5));
    }
    const forward=new Vector3(-Math.sin(this.cameraYaw),0,-Math.cos(this.cameraYaw));
    const right=new Vector3(Math.cos(this.cameraYaw),0,-Math.sin(this.cameraYaw));
    this.moveDirection.set(0,0,0);
    if(input.keys.has('KeyW'))this.moveDirection.add(forward);
    if(input.keys.has('KeyS'))this.moveDirection.sub(forward);
    if(input.keys.has('KeyD'))this.moveDirection.add(right);
    if(input.keys.has('KeyA'))this.moveDirection.sub(right);
    this.moveDirection.normalize();
    const wasBlocking=p.block;
    p.block=(input.keys.has('KeyE')||(input.secondary&&p.weapon!=='pistol'))&&p.attackTimer<=0&&p.dashTimer<=0&&p.energy>5;
    p.blockTime=p.block?(wasBlocking?p.blockTime+dt:0):0;
    this.findAnchor();
    if(input.pressed.has('KeyF'))this.hook();
    if(input.pressed.has('KeyR')&&p.weapon==='pistol'&&p.reload<=0&&p.ammo<12)this.reload();
    if(input.pressed.has('Space'))this.jump();
    if((input.pressed.has('ShiftLeft')||input.pressed.has('ShiftRight'))&&p.dashCooldown<=0&&p.energy>=20) {
      p.energy-=20;p.dashTimer=.23;p.dashCooldown=.72;p.invulnerable=.34;p.block=false;p.attackTimer=0;p.queuedAttack=false;
      p.dashDirection.copy(this.moveDirection.lengthSq()>0?this.moveDirection:forward);p.yaw=Math.atan2(p.dashDirection.x,p.dashDirection.z);
      this.emit({type:'dash',position:p.position.clone(),yaw:p.yaw});
    }
    if(input.primaryPressed&&p.weapon!=='pistol'&&!p.block) {
      if(p.attackTimer>.05&&p.attackTimer<p.attackDuration*.7)p.queuedAttack=true;
      else if(p.attackTimer<=0)this.attack(false);
    }
    if(input.pressed.has('KeyQ')&&p.weapon!=='pistol'&&p.attackTimer<=0&&!p.block)this.attack(true);
    if(p.weapon==='pistol'&&input.primary&&p.fireCooldown<=0&&p.reload<=0&&!p.block)this.fire();
    if(p.attackTimer>0) {
      const before=1-p.attackTimer/p.attackDuration;
      p.attackTimer=Math.max(0,p.attackTimer-dt);
      const progress=1-p.attackTimer/p.attackDuration;
      if(progress>.23&&progress<.76)this.meleeHits();
      if(before<.25&&progress>=.25)this.emit({type:'slash',position:p.position.clone().addScaledVector(UP,1.2),yaw:p.yaw,heavy:p.attackHeavy,color:p.weapon==='sword'?0x83ffdc:0xffad6e});
      if(p.attackTimer<=0&&p.queuedAttack){p.queuedAttack=false;this.attack(false);}
    }
    this.movePlayer(dt,locked);
    this.updateEnemies(dt);
    if(p.position.y<-12) {p.hp-=20;p.hook=null;p.velocity.set(0,0,0);p.position.set(0,1,12);this.motor.reset(p.position);p.invulnerable=1.2;this.emit({type:'hurt'});this.emit({type:'toast',text:'坠落 · 已返回断月台，损失 20 生命'});}
    if(p.hp<=0)this.finish(false);
  }
  private angleLerp(a: number,b: number,t: number) {return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;}
  private movePlayer(dt: number,locked?: Fighter) {
    const p=this.player,moving=this.moveDirection.lengthSq()>0;
    const speed=p.block?3:p.attackTimer>0?3.5:8.7;
    if(!p.hook) {
      p.velocity.x+=(this.moveDirection.x*speed-p.velocity.x)*Math.min(1,dt*(p.grounded?17:7));
      p.velocity.z+=(this.moveDirection.z*speed-p.velocity.z)*Math.min(1,dt*(p.grounded?17:7));
    }
    if(moving&&p.attackTimer<=0&&!p.block&&p.weapon!=='pistol')p.yaw=this.angleLerp(p.yaw,Math.atan2(this.moveDirection.x,this.moveDirection.z),Math.min(1,dt*17));
    if(p.weapon==='pistol'||p.block)p.yaw=this.angleLerp(p.yaw,this.cameraYaw+Math.PI,Math.min(1,dt*18));
    if(locked&&p.attackTimer<=0){const d=locked.position.clone().sub(p.position);p.yaw=this.angleLerp(p.yaw,Math.atan2(d.x,d.z),Math.min(1,dt*10));}
    p.velocity.y=Math.max(-38,p.velocity.y-dt*26);
    if(p.grounded&&p.velocity.y<0)p.velocity.y=-2;
    if(p.hook) {
      const d=p.hook.position.clone().sub(p.position.clone().addScaledVector(UP,1));
      const length=d.length();d.normalize();
      // Acceleration and momentum create a physical pull, followed by a release jump.
      p.velocity.lerp(d.multiplyScalar(24),Math.min(1,dt*7));
      p.yaw=Math.atan2(p.velocity.x,p.velocity.z);
      if(length<2.1){p.hook=null;p.velocity.y=8;p.jumps=1;p.hookCooldown=.35;}
    }
    if(p.dashTimer>0) {
      p.dashTimer-=dt;p.velocity.x=p.dashDirection.x*26;p.velocity.z=p.dashDirection.z*26;
      if(!p.grounded)p.velocity.y=Math.max(p.velocity.y,0);
    }
    const wasGrounded=p.grounded;
    const intendedY=p.velocity.y;
    const beforeY=p.position.y;
    p.grounded=this.motor.move(p.velocity.clone().multiplyScalar(dt),p.position);
    if(p.grounded){p.jumps=0;if(!wasGrounded&&intendedY<0)this.emit({type:'jump',position:p.position.clone(),color:0x74c8be});}
    if(intendedY>0 && p.position.y-beforeY<intendedY*dt*.2)p.velocity.y=0;
  }
  private jump() {
    const p=this.player;if(p.jumps>=2||p.block)return;
    p.hook=null;p.velocity.y=p.jumps===0?10.5:11.8;p.jumps++;p.grounded=false;
    this.emit({type:'jump',position:p.position.clone(),heavy:p.jumps===2});
  }
  private attack(heavy: boolean) {
    const p=this.player;if(p.dashTimer>0||p.hook)return;
    if(heavy&&p.energy<30){this.emit({type:'toast',text:'内息不足'});return;}
    if(heavy)p.energy-=30;
    const nearest=this.closestEnemy(5);
    if(nearest){const d=nearest.position.clone().sub(p.position);p.yaw=Math.atan2(d.x,d.z);}
    p.attackStep=(p.attackStep+1)%3;p.attackHeavy=heavy;
    p.attackDuration=heavy?.8:p.weapon==='sword'?.43:.56;p.attackTimer=p.attackDuration;p.attackHits.clear();p.block=false;
    this.emit({type:'slash',heavy});
  }
  private meleeHits() {
    const p=this.player,range=p.attackHeavy?4.8:p.weapon==='sword'?3.7:3.4;
    const forward=new Vector3(Math.sin(p.yaw),0,Math.cos(p.yaw));
    for(const e of this.enemies) {
      if(e.hp<=0||p.attackHits.has(e.id))continue;
      const d=e.position.clone().sub(p.position),distance=Math.hypot(d.x,d.z);
      if(distance>range||Math.abs(d.y)>3||(!p.attackHeavy&&d.normalize().dot(forward)<-.25))continue;
      if(this.motor.blocked(p.position.clone().addScaledVector(UP,1.2),e.position.clone().addScaledVector(UP,1.2)))continue;
      p.attackHits.add(e.id);
      const damage=p.attackHeavy?76:p.weapon==='blade'?37:p.attackStep===0?42:28;
      this.hitEnemy(e,damage,p.attackHeavy);
      if(e.kind!=='boss'){const push=e.position.clone().sub(p.position).setY(0).normalize().multiplyScalar(p.attackHeavy?1.5:.45);e.position.add(push);}
    }
  }
  private fire() {
    const p=this.player;
    if(p.ammo<=0){if(!this.shotWarning){this.emit({type:'toast',text:'弹匣已空 · R 换弹'});this.shotWarning=true;}this.reload();return;}
    this.shotWarning=false;p.ammo--;p.fireCooldown=.22;
    const muzzle=p.position.clone().addScaledVector(UP,1.55).add(new Vector3(Math.sin(p.yaw)*.55,0,Math.cos(p.yaw)*.55));
    const ray=new Ray(this.aimOrigin.clone(),this.aimDirection.clone());
    let target:Fighter|undefined,nearest=1000,hitPoint:Vector3|null=null;
    for(const e of this.enemies) {
      if(e.hp<=0)continue;
      const center=e.position.clone().addScaledVector(UP,e.kind==='boss'?1.5:1.2);
      const intersection=ray.intersectSphere(new Sphere(center,e.kind==='boss'?1.3:.85),new Vector3());
      if(intersection){const dist=intersection.distanceTo(this.aimOrigin);if(dist<nearest&&!this.motor.blocked(muzzle,center)){nearest=dist;target=e;hitPoint=intersection;}}
    }
    // Modest aim assistance only for enemies already under the crosshair.
    if(!target) {
      let best=.988;
      for(const e of this.enemies) {
        if(e.hp<=0)continue;
        const center=e.position.clone().addScaledVector(UP,1.35),d=center.clone().sub(this.aimOrigin);
        const dot=d.normalize().dot(this.aimDirection);
        if(dot>best&&!this.motor.blocked(muzzle,center)){best=dot;target=e;hitPoint=center;}
      }
    }
    const end=hitPoint??this.aimOrigin.clone().addScaledVector(this.aimDirection,65);
    this.emit({type:'shot',position:muzzle,target:end,color:0xf4cb87});
    if(target)this.hitEnemy(target,25,false);
  }
  private reload() {this.player.reload=1.25;this.emit({type:'reload'});this.emit({type:'toast',text:'装填弹匣…'});}
  private hitEnemy(e: Fighter,damage: number,heavy: boolean) {
    e.hp=Math.max(0,e.hp-damage);e.hitFlash=.12;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.comboTimer=4;
    this.score+=Math.round(damage*(1+Math.min(this.combo,30)*.035));
    this.emit({type:'hit',position:e.position.clone().addScaledVector(UP,1.2),heavy,color:0xffce8f});
    if(e.hp<=0) {
      e.state='dead';e.timer=2.5;this.kills++;this.waveKills++;this.score+=e.kind==='boss'?2000:250;
      this.player.energy=Math.min(100,this.player.energy+12);
      if(this.player.lockId===e.id)this.player.lockId=null;
      this.emit({type:'death',position:e.position.clone().addScaledVector(UP,1),color:e.kind==='boss'?0xff786d:0x6ee3d1});
      if(this.enemies.every(a=>a.hp<=0)) {
        if(this.wave===4){this.finish(true);}
        else{this.waveDelay=3;this.player.hp=Math.min(100,this.player.hp+25);this.emit({type:'toast',text:'天台已清 · 生命恢复，准备下一波'});}
      }
    } else if(e.kind!=='boss'||heavy) {e.state='stunned';e.timer=heavy?.9:.33;}
  }
  private nextWave() {
    this.wave++;this.waveKills=0;
    const kinds: ('swordsman'|'gunner'|'boss')[]=this.wave===1?['swordsman','swordsman','swordsman','swordsman','gunner']:
      this.wave===2?['swordsman','swordsman','swordsman','swordsman','gunner','gunner']:
      this.wave===3?['swordsman','swordsman','swordsman','swordsman','swordsman','gunner','gunner']:['boss','swordsman','gunner'];
    this.waveTotal=kinds.length;
    kinds.forEach((kind,i)=>{
      const a=i/kinds.length*Math.PI*2,r=kind==='boss'?10:12;
      const hp=kind==='boss'?480:kind==='gunner'?70:84+(this.wave-1)*12;
      const position=new Vector3(Math.sin(a)*r,.13,Math.cos(a)*r-5);
      this.enemies.push({id:this.nextId++,kind,position,yaw:0,hp,maxHp:hp,state:'chase',timer:0,attackTime:.5,attackSerial:0,speed:kind==='boss'?4.3:kind==='gunner'?3.3:3.6+this.wave*.25,hitFlash:0,cooldown:1+i*.22,strafe:i%2?1:-1});
    });
    this.emit({type:'wave',text:this.wave===4?'天枢降临 · 斩断旧秩序':`第${['','一','二','三'][this.wave]}波 · 守卫来袭`});
  }
  private updateEnemies(dt: number) {
    const p=this.player;
    for(const e of this.enemies) {
      e.hitFlash=Math.max(0,e.hitFlash-dt);e.cooldown=Math.max(0,e.cooldown-dt);
      if(e.state==='dead'){e.timer-=dt;continue;}
      const d=p.position.clone().sub(e.position),flat=d.clone().setY(0),distance=flat.length();flat.normalize();
      e.yaw=this.angleLerp(e.yaw,Math.atan2(flat.x,flat.z),Math.min(1,dt*7));
      if(e.state==='stunned'||e.state==='recover') {
        e.timer-=dt;if(e.timer<=0)e.state='chase';continue;
      }
      if(e.state==='windup') {
        e.timer-=dt;
        if(e.timer<=0){
          e.state='attack';e.attackTime=e.kind==='boss'?.7:.48;e.timer=e.attackTime;e.attackSerial++;
          if(e.kind==='gunner') {
            const from=e.position.clone().addScaledVector(UP,1.65),end=p.position.clone().addScaledVector(UP,1.15);
            this.emit({type:'enemyShot',position:from,target:end,color:0xff735d});
            if(distance<28&&Math.abs(d.y)<12&&!this.motor.blocked(from,end))this.hurt(11,e);
            e.state='recover';e.timer=.75;
          } else this.emit({type:'slash',position:e.position.clone().addScaledVector(UP,1.2),yaw:e.yaw,color:e.kind==='boss'?0xff6868:0xffb184,heavy:e.kind==='boss'});
        }
        continue;
      }
      if(e.state==='attack') {
        const previous=e.timer;e.timer-=dt;
        if(e.kind!=='boss'&&e.timer>e.attackTime*.5)e.position.addScaledVector(flat,dt*3.5);
        if(previous>e.attackTime*.45&&e.timer<=e.attackTime*.45) {
          const range=e.kind==='boss'?5.5:3;
          if(distance<range&&Math.abs(d.y)<2.8&&!this.motor.blocked(e.position.clone().addScaledVector(UP,1.2),p.position.clone().addScaledVector(UP,1.2)))this.hurt(e.kind==='boss'?28:16,e);
        }
        if(e.timer<=0){e.state='recover';e.timer=e.kind==='boss'?.7:.65;}
        continue;
      }
      // Only engage from the main roof; elevated traversal provides a real escape.
      const gunner=e.kind==='gunner',attackRange=gunner?19:e.kind==='boss'?4.6:2.45;
      const sameHeight=Math.abs(d.y)<(gunner?12:2);
      if(distance<attackRange&&e.cooldown<=0&&sameHeight&&(!gunner||!this.motor.blocked(e.position.clone().addScaledVector(UP,1.65),p.position.clone().addScaledVector(UP,1.15)))) {
        e.state='windup';e.timer=gunner?.85:e.kind==='boss'?.95:.62;e.cooldown=e.kind==='boss'?1.8:1.55;continue;
      }
      const movement=flat.clone();
      if(gunner&&distance<10)movement.multiplyScalar(-.45);
      else if(distance<attackRange*.8)movement.set(0,0,0);
      if(gunner){movement.x+=flat.z*e.strafe*.35;movement.z-=flat.x*e.strafe*.35;}
      for(const other of this.enemies) {
        if(other.id===e.id||other.hp<=0)continue;
        const away=e.position.clone().sub(other.position).setY(0),len=away.length();if(len>0&&len<1.2)movement.addScaledVector(away.normalize(),(1.2-len)*1.4);
      }
      // Avoid the two mechanical covers and rear gate columns.
      for(const obstacle of [{x:-13,z:8,r:2.5},{x:13,z:8,r:2.5},{x:-8,z:-20,r:1.5},{x:8,z:-20,r:1.5}]) {
        const away=e.position.clone().sub(new Vector3(obstacle.x,0,obstacle.z)).setY(0),len=away.length();
        if(len<obstacle.r&&len>.01)movement.addScaledVector(away.normalize(),(obstacle.r-len)*2);
      }
      e.position.addScaledVector(movement,dt*e.speed);e.position.x=Math.max(-18.5,Math.min(18.5,e.position.x));e.position.z=Math.max(-23,Math.min(23,e.position.z));
    }
    this.enemies=this.enemies.filter(e=>e.state!=='dead'||e.timer>0);
  }
  private hurt(damage: number,enemy: Fighter) {
    const p=this.player;if(p.invulnerable>0||p.dashTimer>0)return;
    const d=enemy.position.clone().sub(p.position).setY(0).normalize();
    const facing=new Vector3(Math.sin(p.yaw),0,Math.cos(p.yaw));
    if(p.block&&d.dot(facing)>-.15&&p.energy>=12) {
      p.energy-=12;
      if(p.blockTime<.24) {
        this.score+=100;this.emit({type:'parry',position:p.position.clone().addScaledVector(UP,1.4)});this.emit({type:'toast',text:'精准格挡 · 反击时机'});
        this.hitEnemy(enemy,18,false);
        if(enemy.hp>0){enemy.state='stunned';enemy.timer=1.3;}
        return;
      }
      damage=Math.round(damage*.15);this.emit({type:'parry',position:p.position.clone().addScaledVector(UP,1.2)});
    }
    p.hp=Math.max(0,p.hp-damage);p.invulnerable=.5;this.combo=0;this.comboTimer=0;this.emit({type:'hurt',position:p.position.clone()});
  }
  private closestEnemy(range: number) {
    let best:Fighter|undefined,distance=range;
    for(const e of this.enemies){if(e.hp<=0)continue;const dist=e.position.distanceTo(this.player.position);if(dist<distance){best=e;distance=dist;}}
    return best;
  }
  private toggleLock() {
    if(this.player.lockId){this.player.lockId=null;return;}
    const nearest=this.closestEnemy(35);if(nearest)this.player.lockId=nearest.id;
  }
  private findAnchor() {
    const p=this.player,from=this.aimOrigin;
    let best=.68;this.hookCandidate=null;
    for(const anchor of this.anchors) {
      const distance=anchor.position.distanceTo(p.position);if(distance>42||distance<2.5)continue;
      const d=anchor.position.clone().sub(from).normalize(),dot=d.dot(this.aimDirection);
      if(dot>best&&!this.motor.blocked(p.position.clone().addScaledVector(UP,1.7),anchor.position)){best=dot;this.hookCandidate=anchor;}
    }
  }
  private hook() {
    const p=this.player;
    if(p.hook){p.hook=null;p.hookCooldown=.3;return;}
    if(p.hookCooldown>0)return;
    if(!this.hookCandidate){this.emit({type:'toast',text:'将视角转向青色锚点，再按 F'});return;}
    if(p.energy<10){this.emit({type:'toast',text:'内息不足'});return;}
    p.energy-=10;p.hook=this.hookCandidate;p.grounded=false;p.attackTimer=0;p.queuedAttack=false;p.jumps=1;
    p.velocity.y=Math.max(4.5,p.velocity.y);
    this.emit({type:'hook',position:p.position.clone(),target:p.hook.position.clone()});
  }
  private finish(won: boolean) {if(this.mode!=='playing')return;this.mode=won?'won':'lost';this.player.hook=null;this.emit({type:'end'});}
  diagnostics() {
    return {mode:this.mode,wave:this.wave,hp:this.player.hp,energy:Math.round(this.player.energy),position:this.player.position.toArray().map(v=>Math.round(v*100)/100),
      grounded:this.player.grounded,weapon:this.player.weapon,ammo:this.player.ammo,hook:this.player.hook?.id??null,
      enemies:this.enemies.filter(e=>e.hp>0).map(e=>({id:e.id,kind:e.kind,hp:e.hp,state:e.state,position:e.position.toArray().map(v=>Math.round(v*10)/10)})),
      kills:this.kills,combo:this.combo,score:this.score,elapsed:Math.round(this.elapsed)};
  }
}
