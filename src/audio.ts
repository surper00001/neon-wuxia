export class AudioEngine {
  enabled=true;
  private ctx: AudioContext|null=null;
  private master: GainNode|null=null;
  private ambient: GainNode|null=null;
  start() {
    if(!this.ctx) {
      this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.enabled?.22:0;this.master.connect(this.ctx.destination);
      this.ambient=this.ctx.createGain();this.ambient.gain.value=.1;this.ambient.connect(this.master);
      for(const f of [55,82.4,110,164.8]){const o=this.ctx.createOscillator();o.type='sine';o.frequency.value=f;o.connect(this.ambient);o.start();}
    }
    void this.ctx.resume();
  }
  setEnabled(enabled: boolean){this.enabled=enabled;if(this.master&&this.ctx)this.master.gain.setTargetAtTime(enabled?.22:0,this.ctx.currentTime,.08);}
  pause(paused: boolean){if(this.ambient&&this.ctx)this.ambient.gain.setTargetAtTime(paused?.035:.1,this.ctx.currentTime,.2);}
  tone(frequency: number,duration: number,type: OscillatorType='sine',volume=.5,endFrequency?:number) {
    const c=this.ctx;if(!c||!this.master||!this.enabled)return;
    const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(frequency,c.currentTime);
    if(endFrequency)o.frequency.exponentialRampToValueAtTime(endFrequency,c.currentTime+duration);
    g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);
    o.connect(g);g.connect(this.master);o.start();o.stop(c.currentTime+duration);
  }
  noise(duration: number,filterFrequency: number,volume: number) {
    const c=this.ctx;if(!c||!this.master||!this.enabled)return;
    const b=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=b.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=filterFrequency;g.gain.value=volume;
    s.connect(f);f.connect(g);g.connect(this.master);s.start();
  }
  event(type: string,heavy=false) {
    switch(type){
      case'slash':this.noise(heavy?.24:.12,heavy?1400:3500,.8);this.tone(heavy?140:380,.15,'triangle',.4,80);break;
      case'hit':this.noise(.09,1700,1);this.tone(100,.14,'triangle',.6,40);break;
      case'shot':this.noise(.12,4500,1.2);this.tone(180,.1,'square',.35,50);break;
      case'enemyShot':this.noise(.1,2500,.6);break;
      case'dash':case'hook':this.noise(.22,2500,.45);this.tone(170,.22,'sine',.3,650);break;
      case'jump':this.tone(180,.15,'triangle',.25,400);break;
      case'parry':this.tone(950,.35,'sine',.7,500);this.tone(1400,.2,'triangle',.25);break;
      case'hurt':this.tone(65,.2,'sawtooth',.4,32);break;
      case'reload':this.noise(.06,4200,.5);break;
      case'wave':this.tone(220,.6,'sine',.3);this.tone(330,.8,'sine',.22);break;
      case'death':this.noise(.3,700,.5);break;
    }
  }
}
