import { Vector3, type Camera } from 'three';
import type { Game } from './simulation/game';
import type { Weapon } from './types';

export const el=<T extends HTMLElement=HTMLElement>(id: string)=>document.getElementById(id)! as T;
const show=(id: string,visible: boolean)=>el(id).classList.toggle('hidden',!visible);
export class UI {
  onStart=()=>{};
  onResume=()=>{};
  onPause=()=>{};
  onRestart=()=>{};
  onMenu=()=>{};
  onQuality=()=>{};
  onSound=()=>{};
  onControls=(open: boolean)=>{};
  private toastTimer=0;
  private labels=new Map<number,HTMLElement>();
  private hitTimer=0;
  private hurtTimer=0;
  private hp=el('hp-bar');
  private energy=el('energy-bar');
  private combo=el('combo');
  constructor(private game: Game) {
    el('start').onclick=()=>this.onStart();
    el('resume').onclick=()=>this.onResume();
    el('pause-button').onclick=()=>this.onPause();
    el('restart').onclick=()=>this.onRestart();
    el('again').onclick=()=>this.onRestart();
    el('back-menu').onclick=()=>this.onMenu();
    for(const id of ['open-controls','pause-controls'])el(id).onclick=()=>this.onControls(true);
    el('close-controls').onclick=()=>this.onControls(false);
    for(const id of ['quality-menu','quality-pause'])el(id).onclick=()=>this.onQuality();
    for(const id of ['sound-menu','sound-pause'])el(id).onclick=()=>this.onSound();
    document.querySelectorAll<HTMLButtonElement>('[data-weapon]').forEach(b=>b.onclick=()=>this.game.setWeapon(b.dataset.weapon as Weapon));
    if(matchMedia('(pointer: coarse)').matches)show('mobile-warning',true);
  }
  ready() {show('boot',false);this.menu();}
  menu() {for(const id of ['hud','pause','controls','result'])show(id,false);show('menu',true);}
  play() {for(const id of ['menu','pause','controls','result'])show(id,false);show('hud',true);}
  pause() {show('pause',true);show('hud',true);}
  controls(open: boolean) {show('controls',open);}
  result() {
    show('hud',false);show('pause',false);show('result',true);
    const won=this.game.mode==='won';
    el('result-eyebrow').textContent=won?'MISSION COMPLETE':'FALLEN, NOT FORGOTTEN';
    el('result-title').textContent=won?'一剑破天':'江湖未尽';
    el('result-desc').textContent=won?'断月台已清。江湖，又多了一个传说。':'胜败乃常事。整顿内息，再战断月台。';
    el('final-score').textContent=String(this.game.score);el('final-combo').textContent=String(this.game.maxCombo);
    const sec=Math.floor(this.game.elapsed);el('final-time').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
    try {
      const previous=Number(localStorage.getItem('neon-wuxia-best')??0);
      if(this.game.score>previous)localStorage.setItem('neon-wuxia-best',String(this.game.score));
    }catch{/* Storage may be unavailable in a private browsing session. */}
  }
  toast(text: string) {el('toast').textContent=text;this.toastTimer=2.8;el('toast').style.opacity='1';}
  hit() {this.hitTimer=.14;}
  hurt() {this.hurtTimer=.4;}
  update(dt: number,camera: Camera,aiming: boolean) {
    const p=this.game.player;
    this.hp.style.width=`${Math.max(0,p.hp)}%`;this.energy.style.width=`${p.energy}%`;el('hp-number').textContent=String(Math.max(0,Math.ceil(p.hp)));
    el('score').textContent=String(this.game.score).padStart(6,'0');
    el('objective-text').textContent=this.game.wave===4?'击败天枢 · 执剑者':'清除天台守卫';
    el('wave-text').textContent=this.game.wave===0?'守卫正在接近…':this.game.wave===4?`最终战 · ${this.game.waveKills} / ${this.game.waveTotal}`:`第${['','一','二','三'][this.game.wave]}波 · ${this.game.waveKills} / ${this.game.waveTotal}`;
    document.querySelectorAll<HTMLElement>('[data-weapon]').forEach(b=>b.classList.toggle('selected',b.dataset.weapon===p.weapon));
    show('ammo-wrap',p.weapon==='pistol');el('ammo').textContent=p.reload>0?'··':String(p.ammo);
    this.combo.style.opacity=this.game.combo>=2?'1':'0';el('combo-count').textContent=String(this.game.combo);
    el('combo-rank').textContent=this.game.combo>20?'一剑倾城':this.game.combo>10?'势如破竹':'行云流水';
    const hook=this.game.hookCandidate;
    show('hook-prompt',!!hook&&!p.hook);
    if(hook)el('hook-distance').textContent=`${Math.round(hook.position.distanceTo(p.position))}m`;
    show('lock-tag',p.lockId!==null);
    el('hud').classList.toggle('aiming',aiming);
    this.toastTimer-=dt;if(this.toastTimer<=0)el('toast').style.opacity='0';
    this.hitTimer-=dt;el('reticle').classList.toggle('hit',this.hitTimer>0);
    this.hurtTimer-=dt;el('damage-flash').style.opacity=String(Math.max(0,this.hurtTimer));
    const boss=this.game.enemies.find(e=>e.kind==='boss'&&e.hp>0);
    show('boss-hud',!!boss);if(boss)el('boss-bar').style.width=`${boss.hp/boss.maxHp*100}%`;
    const w=innerWidth,h=innerHeight;
    const activeIds=new Set<number>();
    this.game.enemies.forEach(e=>{
      if(e.hp<=0||e.kind==='boss')return;
      activeIds.add(e.id);
      let label=this.labels.get(e.id);
      if(!label){label=document.createElement('div');label.className='enemy-label';label.innerHTML='<b></b><div class="enemy-bar"><i></i></div>';el('enemy-labels').append(label);this.labels.set(e.id,label);}
      const point=e.position.clone().add(new Vector3(0,2.55,0)).project(camera);
      const visible=point.z<1&&point.z>-1&&Math.abs(point.x)<1.1&&Math.abs(point.y)<1.1;
      label.style.display=visible?'block':'none';
      if(visible){label.style.left=`${(point.x*.5+.5)*w}px`;label.style.top=`${(-point.y*.5+.5)*h}px`;label.querySelector('i')!.style.width=`${e.hp/e.maxHp*100}%`;label.querySelector('b')!.textContent=e.state==='windup'?'!':e.id===p.lockId?'◇':'';}
    });
    this.labels.forEach((label,id)=>{if(!activeIds.has(id)){label.remove();this.labels.delete(id);}});
    el('tutorial-hint').style.opacity=this.game.elapsed>30?'.4':'.85';
  }
  quality(high: boolean) {for(const id of ['quality-menu','quality-pause'])el(id).textContent=`画质：${high?'高':'流畅'}`;}
  sound(enabled: boolean) {for(const id of ['sound-menu','sound-pause'])el(id).textContent=`声音：${enabled?'开':'关'}`;}
  clearLabels() {this.labels.forEach(label=>label.remove());this.labels.clear();}
}
