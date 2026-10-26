import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { WorldView } from './render/world';
import { CharacterView } from './render/character';
import { Effects } from './render/effects';
import { createMotor } from './physics/motor';
import { Game } from './simulation/game';
import { Input } from './input';
import { AudioEngine } from './audio';
import { UI, el } from './ui';
import type { Mode } from './types';

async function boot() {
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.info.autoReset=false;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  el('world').append(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,.1,450);
  camera.position.set(26,15,30);camera.lookAt(0,3,-10);
  const world=new WorldView(scene);
  el('boot-text').textContent='正在初始化轻功与战斗系统…';
  const motor=await createMotor(world.platforms);
  const game=new Game(motor,world.anchors);
  const playerView=new CharacterView('player');scene.add(playerView.root);playerView.root.position.copy(game.player.position);
  const enemyViews=new Map<number,CharacterView>();
  const telegraphs=new Map<number,THREE.Mesh>();
  const fx=new Effects(scene),input=new Input(renderer.domElement),audio=new AudioEngine(),ui=new UI(game);
  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.6,.45,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
  let high=true,controlsReturn:Mode='menu',frameTime=0,accumulator=0,shake=0,hitStop=0,time=0,wasMode:Mode='menu',contextLost=false;
  const camTarget=new THREE.Vector3(),camDesired=new THREE.Vector3();
  const marker=new THREE.Mesh(new THREE.TorusGeometry(.9,.024,5,40),new THREE.MeshBasicMaterial({color:0xa4ffea,transparent:true,opacity:.8,depthWrite:false}));
  scene.add(marker);marker.visible=false;
  function clearEnemies() {enemyViews.forEach(v=>v.dispose());enemyViews.clear();telegraphs.forEach(v=>{v.geometry.dispose();(v.material as THREE.Material).dispose();v.removeFromParent();});telegraphs.clear();ui.clearLabels();fx.reset();}
  function start() {
    clearEnemies();game.start();ui.play();audio.start();audio.pause(false);
    input.clear();input.active=true;input.lock();shake=0;hitStop=0;accumulator=0;
    camera.position.set(0,3.8,20);camera.lookAt(0,1.5,12);
  }
  function pause() {
    if(game.mode!=='playing')return;game.mode='paused';input.unlock();ui.pause();audio.pause(true);accumulator=0;
  }
  function resume() {
    if(game.mode!=='paused')return;game.mode='playing';ui.play();input.clear();input.active=true;input.lock();audio.pause(false);accumulator=0;
  }
  function controls(open: boolean) {
    if(open){
      controlsReturn=game.mode;if(game.mode==='playing')pause();ui.controls(true);
    }else {
      ui.controls(false);
      if(controlsReturn==='playing')resume();
    }
  }
  ui.onStart=start;ui.onRestart=start;ui.onPause=pause;ui.onResume=resume;
  ui.onControls=controls;
  ui.onMenu=()=>{game.mode='menu';input.unlock();clearEnemies();ui.menu();game.player.position.set(0,0,12);game.player.yaw=Math.PI;audio.pause(true);};
  ui.onQuality=()=>{
    high=!high;renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.5:1));renderer.shadowMap.enabled=high;bloom.enabled=high;
    world.rain.visible=high;composer.setSize(innerWidth,innerHeight);ui.quality(high);
  };
  ui.onSound=()=>{audio.setEnabled(!audio.enabled);ui.sound(audio.enabled);};
  input.onPause=()=>{
    if(!el('controls').classList.contains('hidden')){controls(false);return;}
    if(game.mode==='playing')pause();else if(game.mode==='paused')resume();
  };
  input.onHelp=()=>{if(game.mode==='playing'||game.mode==='paused'||game.mode==='menu')controls(el('controls').classList.contains('hidden'));};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;pause();ui.toast('图形连接中断，正在恢复…');});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{contextLost=false;ui.toast('图形连接已恢复 · 点击继续战斗');});
  // Read-only diagnostics for playtests and future performance profiling.
  Object.defineProperty(window,'__NEON_WUXIA__',{value:{state:()=>game.diagnostics(),renderer:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries}),version:'0.1.0'},writable:false});
  function renderEnemies(dt: number) {
    const ids=new Set<number>();
    for(const e of game.enemies) {
      ids.add(e.id);
      let v=enemyViews.get(e.id);
      if(!v){v=new CharacterView(e.kind);enemyViews.set(e.id,v);scene.add(v.root);}
      v.update(dt,time,e,e.state==='chase'?e.speed:0);
      let ring=telegraphs.get(e.id);
      if(!ring){
        ring=new THREE.Mesh(new THREE.RingGeometry(e.kind==='boss'?4.6:1.7,e.kind==='boss'?4.7:1.76,64),new THREE.MeshBasicMaterial({color:e.kind==='boss'?0xff5e5e:0xffa16d,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));
        ring.rotation.x=-Math.PI/2;scene.add(ring);telegraphs.set(e.id,ring);
      }
      ring.position.copy(e.position);ring.position.y=.18;ring.visible=e.state==='windup'||(e.state==='attack'&&e.kind==='boss');
      (ring.material as THREE.MeshBasicMaterial).opacity=.3+Math.sin(time*18)*.2;
      ring.scale.setScalar(e.state==='windup'?1+Math.sin(time*10)*.04:1);
    }
    enemyViews.forEach((v,id)=>{if(!ids.has(id)){v.dispose();enemyViews.delete(id);const r=telegraphs.get(id);if(r){r.geometry.dispose();(r.material as THREE.Material).dispose();r.removeFromParent();telegraphs.delete(id);}}});
  }
  function updateCamera(dt: number) {
    const p=game.player;
    if(game.mode==='menu') {
      camDesired.set(25+Math.sin(time*.05)*3,13.5,28);camera.position.lerp(camDesired,Math.min(1,dt*1.4));camera.lookAt(0,3,-8);return;
    }
    if(game.mode!=='playing')return;
    game.cameraYaw-=input.state.lookX*.0025;
    game.cameraPitch=Math.max(-.45,Math.min(.95,game.cameraPitch+input.state.lookY*.002));
    input.state.lookX=0;input.state.lookY=0;
    const aim=p.weapon==='pistol'&&input.state.secondary;
    const distance=aim?4.2:p.hook?10:7.6;
    camTarget.copy(p.position).add(new THREE.Vector3(0,1.65,0));
    camDesired.copy(camTarget).add(new THREE.Vector3(Math.sin(game.cameraYaw)*Math.cos(game.cameraPitch)*distance,Math.sin(game.cameraPitch)*distance,Math.cos(game.cameraYaw)*Math.cos(game.cameraPitch)*distance));
    // Cast against the actual collision world so walls do not clip the camera.
    const direction=camDesired.clone().sub(camTarget),len=direction.length();direction.normalize();
    for(let fraction=.9;fraction>.2;fraction-=.1) {
      const point=camTarget.clone().addScaledVector(direction,len*fraction);
      if(!motor.blocked(camTarget,point)){if(fraction<.9)camDesired.copy(point);break;}
    }
    camera.position.lerp(camDesired,Math.min(1,dt*(aim?16:10)));
    if(camera.position.y<.55)camera.position.y=.55;
    camera.lookAt(camTarget);
    if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake;shake=Math.max(0,shake-dt*2);}
    camera.fov=THREE.MathUtils.lerp(camera.fov,aim?43:p.hook?68:p.dashTimer>0?67:58,Math.min(1,dt*10));camera.updateProjectionMatrix();
    game.aimOrigin.copy(camera.position);camera.getWorldDirection(game.aimDirection);
  }
  function frame(now: number) {
    const dt=Math.min((now-frameTime)/1000||1/60,.05);frameTime=now;time+=dt;
    if(contextLost)return;
    const playing=game.mode==='playing';
    updateCamera(dt);
    if(playing) {
      if(hitStop>0){hitStop-=dt;}
      else {
        accumulator+=dt;
        let iterations=0;
        while(accumulator>=1/60&&iterations<4) {
          game.update(1/60,input.state);input.consume();accumulator-=1/60;iterations++;
          if(game.mode!=='playing'){accumulator=0;break;}
        }
      }
    }
    if(game.mode==='playing'||game.mode==='menu')world.update(dt,time);
    const playerSpeed=Math.hypot(game.player.velocity.x,game.player.velocity.z);
    if(game.mode==='menu')playerView.update(dt,time,game.player,0);
    else if(playing)playerView.update(dt,time,game.player,playerSpeed);
    renderEnemies(playing?dt:0);
    fx.update(playing?dt:0,game.player);
    for(const event of game.events) {
      fx.handle(event);audio.event(event.type,event.heavy);
      if(event.text)ui.toast(event.text);
      if(event.type==='hit'){shake=event.heavy?.25:.11;hitStop=event.heavy?.06:.025;ui.hit();}
      if(event.type==='shot')shake=.06;
      if(event.type==='hurt'){shake=.35;ui.hurt();}
      if(event.type==='parry'){shake=.2;hitStop=.075;}
      if(event.type==='end'){input.unlock();ui.result();audio.pause(true);}
    }
    game.events=[];
    marker.visible=playing&&!!game.hookCandidate&&!game.player.hook;
    if(marker.visible){marker.position.copy(game.hookCandidate!.position);marker.quaternion.copy(camera.quaternion);marker.scale.setScalar(1+Math.sin(time*4)*.08);}
    ui.update(dt,camera,input.state.secondary&&game.player.weapon==='pistol');
    if(wasMode==='playing'&&(game.mode==='won'||game.mode==='lost')){input.unlock();ui.result();}
    wasMode=game.mode;
    renderer.info.reset();
    composer.render();
  }
  ui.ready();
  renderer.setAnimationLoop(frame);
}
boot().catch(error=>{
  console.error(error);
  el('boot-text').textContent=`初始化失败：${error instanceof Error?error.message:String(error)}。请使用支持 WebGL 2 的电脑浏览器，并刷新重试。`;
});
