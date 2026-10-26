import type { InputState } from './types';

export class Input {
  state: InputState={keys:new Set(),pressed:new Set(),primary:false,primaryPressed:false,secondary:false,lookX:0,lookY:0};
  active=false;
  onPause=()=>{};
  onHelp=()=>{};
  private dragging=false;
  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown',e=>{
      if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      if(e.repeat)return;
      if(e.code==='Escape'||e.code==='KeyP'){this.onPause();return;}
      if(e.code==='KeyH'){this.onHelp();return;}
      this.state.keys.add(e.code);this.state.pressed.add(e.code);
    });
    window.addEventListener('keyup',e=>this.state.keys.delete(e.code));
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('mousedown',e=>{
      if(!this.active)return;
      this.dragging=true;
      if(e.button===0){this.state.primary=true;this.state.primaryPressed=true;}
      if(e.button===2)this.state.secondary=true;
      if(document.pointerLockElement!==canvas)this.lock();
    });
    window.addEventListener('mouseup',e=>{if(e.button===0)this.state.primary=false;if(e.button===2)this.state.secondary=false;this.dragging=false;});
    window.addEventListener('mousemove',e=>{
      if(!this.active)return;
      if(document.pointerLockElement===canvas||this.dragging){this.state.lookX+=e.movementX;this.state.lookY+=e.movementY;}
    });
    document.addEventListener('pointerlockchange',()=>{
      if(!document.pointerLockElement&&this.active){this.clear();this.onPause();}
    });
    window.addEventListener('blur',()=>{this.clear();if(this.active)this.onPause();});
  }
  lock() {
    try{const p=this.canvas.requestPointerLock();if(p&&'catch' in p)p.catch(()=>{});}catch{/* Drag-to-look remains available when a browser disallows pointer lock. */}
  }
  unlock() {this.active=false;if(document.pointerLockElement)document.exitPointerLock();this.clear();}
  clear() {this.state.keys.clear();this.state.pressed.clear();this.state.primary=false;this.state.secondary=false;this.state.primaryPressed=false;this.state.lookX=0;this.state.lookY=0;}
  consume() {this.state.pressed.clear();this.state.primaryPressed=false;}
}
