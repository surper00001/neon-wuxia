import * as THREE from 'three';
import type { Anchor, Platform } from '../types';

export class WorldView {
  group = new THREE.Group();
  platforms: Platform[] = [];
  anchors: Anchor[] = [];
  rain: THREE.Points;
  core = new THREE.Group();
  anchorMeshes: THREE.Group[] = [];
  background = new THREE.Group();
  private rainData: Float32Array;
  private seed = 713;
  private rings: THREE.Mesh[] = [];
  constructor(scene: THREE.Scene) {
    scene.add(this.group);
    scene.background = new THREE.Color(0x071725);
    scene.fog = new THREE.FogExp2(0x0a1d2b, .009);
    scene.add(new THREE.HemisphereLight(0x8cc9e1, 0x111926, 2.1));
    const moon = new THREE.DirectionalLight(0x81b7db, 3.5);
    moon.position.set(-18, 35, -22);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -36, right: 36, top: 35, bottom: -35, near: 1, far: 110 });
    moon.shadow.bias = -.0006;
    moon.shadow.normalBias = .04;
    scene.add(moon);
    const rim = new THREE.DirectionalLight(0x49e4d1, 1.6); rim.position.set(16, 8, 20); scene.add(rim);
    const amber = new THREE.PointLight(0xff7c49, 65, 25, 2); amber.position.set(0, 6, -14); scene.add(amber);
    this.makeArena();
    this.makeGate();
    this.makeCity();
    this.makeAnchors();
    this.makeMoon();
    this.rainData = new Float32Array(1800 * 3);
    for (let i = 0; i < this.rainData.length; i += 3) {
      this.rainData[i] = (this.random() - .5) * 85;
      this.rainData[i+1] = this.random() * 45;
      this.rainData[i+2] = (this.random() - .5) * 85;
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(this.rainData, 3));
    this.rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0x96c9d7, transparent: true, opacity: .3, size: .065, depthWrite: false }));
    this.group.add(this.rain);
    this.group.add(this.background);
  }
  private random() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  private mat(color: number, metalness = .6, roughness = .45) { return new THREE.MeshStandardMaterial({ color, metalness, roughness }); }
  private glow(color: number, intensity = 2) { return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, metalness: .3, roughness: .4 }); }
  private box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = this.group, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); m.position.set(x,y,z); m.castShadow = shadow; m.receiveShadow = shadow; parent.add(m); return m;
  }
  private platform(x: number,y: number,z: number,w: number,h: number,d: number) {
    this.platforms.push({x,y:y-h/2,z,w,h,d});
    this.box(w,h,d,x,y-h/2,z,this.mat(0x152633,.7,.35));
    this.box(w-.3,.12,d-.3,x,y+.01,z,this.mat(0x19323d,.8,.25));
    const glow = this.glow(0x3cd7c8,1.4);
    this.box(w,.04,.075,x,y+.1,z-d/2+.25,glow);
    this.box(w,.04,.075,x,y+.1,z+d/2-.25,glow);
    this.box(.075,.04,d,x-w/2+.25,y+.1,z,glow);
    this.box(.075,.04,d,x+w/2-.25,y+.1,z,glow);
    // Layered structural ribs visibly continue into the void.
    for(const side of [-1,1]) {
      this.box(.55,7,d*.8,x+side*(w/2-1),y-4,z,this.mat(0x101a26));
      this.box(.12,4,.12,x+side*(w/2-1.35),y-3,z+d*.33,glow);
    }
  }
  private makeArena() {
    this.platform(0,0,0,42,2,50);
    this.platform(-30,3,-5,13,1.6,20); this.platform(30,3,-5,13,1.6,20);
    this.platform(0,6,-32,22,2,12);
    // Narrow traversal bridges; these are real colliders.
    this.platform(-24,0,12,8,1,5); this.platform(24,0,12,8,1,5);
    const tileGeo = new THREE.BoxGeometry(1.94,.025,1.94);
    const tiles = new THREE.InstancedMesh(tileGeo,this.mat(0x263b46,.78,.29),21*25);
    const dummy = new THREE.Object3D();
    let idx=0;
    for(let x=-20;x<=20;x+=2) for(let z=-24;z<=24;z+=2) {
      dummy.position.set(x,.095,z); dummy.rotation.y=0; dummy.updateMatrix(); tiles.setMatrixAt(idx,dummy.matrix);
      tiles.setColorAt(idx,new THREE.Color().setHSL(.55,.2,.09+this.random()*.03)); idx++;
    }
    tiles.receiveShadow=true; this.group.add(tiles);
    // Concentric etched combat circle.
    for(let r of [7.2,7.5,9.8]) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.025,5,100),this.glow(r===7.5?0xd09b68:0x4fb4af,.9));
      ring.rotation.x=Math.PI/2;ring.position.y=.125;this.group.add(ring);
    }
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      const tick=this.box(.07,.015,.7,Math.sin(a)*8.5,.13,Math.cos(a)*8.5,this.glow(0x84c8bd,.6));
      tick.rotation.y=a;
    }
    for(let side of [-1,1]) {
      for(let z of [-22,-14,-6,2,18,23]) {
        const x=side*20;
        this.box(.35,1.5,.35,x,.75,z,this.mat(0x1a2e3a));
        this.box(.45,.12,.45,x,1.5,z,this.glow(0x5dc7bd,.8));
      }
      for(let z of [-18,-10,-2,20]) this.box(.08,.08,7.7,side*20,1.2,z,this.mat(0x71948f));
      // Side shrine architecture and illuminated vertical signage.
      const sx=side*30;
      this.box(5,6,3,sx,6,-11,this.mat(0x0d1e2c));
      this.box(5.4,.4,3.6,sx,9,-11,this.mat(0x233440));
      this.box(.12,4,.12,sx-side*2.55,6.4,-9.45,this.glow(0xe79468,1.2));
      this.sign(side<0?'霓 虹 江 湖':'青 霄 城',sx,6.4,-9.35,1.2,4.5,side<0?'#6ef6df':'#ffa76d');
    }
    // Lanterns at the rear and scattered amber-lit mechanical covers.
    for(let x of [-16,-10,10,16]) {
      this.box(1.8,.75,1.8,x,.4,-17,this.mat(0x202c39));
      this.box(1.4,.04,.7,x,.8,-17,this.glow(0xffa264,.6));
      this.box(.15,3,.15,x,2.1,-22,this.mat(0x223745));
      const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.38,.32,.75,8),this.glow(0xffa066,1.6));lamp.position.set(x,3.3,-22);this.group.add(lamp);
    }
    for(let x of [-13,13]) {
      this.box(2,1.6,3.5,x,.8,8,this.mat(0x253d47));
      this.platforms.push({x,y:.8,z:8,w:2,h:1.6,d:3.5});
      this.box(.035,.7,2.6,x-1.02,.9,8,this.glow(0x49ead2,1));
    }
  }
  private sign(text: string,x: number,y: number,z: number,w: number,h: number,color: string,parent: THREE.Object3D=this.group) {
    const c=document.createElement('canvas');c.width=256;c.height=768;
    const ctx=c.getContext('2d')!;
    ctx.fillStyle='#10242d';ctx.fillRect(0,0,256,768);
    ctx.strokeStyle=color;ctx.globalAlpha=.4;ctx.strokeRect(16,16,224,736);ctx.globalAlpha=1;
    ctx.font='bold 115px "Songti SC", serif';ctx.fillStyle=color;ctx.textAlign='center';
    const chars=text.replaceAll(' ','').split('');
    chars.forEach((ch,i)=>ctx.fillText(ch,128,140+i*155));
    const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.75,roughness:.4});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);mesh.position.set(x,y,z);parent.add(mesh);
  }
  private roof(width: number,depth: number,x: number,y: number,z: number) {
    // Curved, upturned eaves generated as a continuous 3D surface.
    const vertices:number[]=[], indices:number[]=[];
    const segments=24;
    for(let i=0;i<=segments;i++) {
      const t=i/segments*2-1;
      const height=Math.pow(Math.abs(t),3)*1.4-Math.pow(Math.abs(t),.7)*.6;
      vertices.push(t*width/2,height,depth/2,t*width/2,height,-depth/2);
      if(i<segments) {const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
    const mat=this.mat(0x172731,.8,.32);mat.side=THREE.DoubleSide;
    const roof=new THREE.Mesh(g,mat);roof.position.set(x,y,z);roof.castShadow=true;this.group.add(roof);
    for(let front of [-1,1]) {
      const pts=[];for(let i=0;i<=segments;i++){const t=i/segments*2-1;pts.push(new THREE.Vector3(x+t*width/2,y+Math.pow(Math.abs(t),3)*1.4-Math.pow(Math.abs(t),.7)*.6,z+front*depth/2));}
      const tube=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),segments,.035,4,false),this.glow(0x6fe8d5,1.2));this.group.add(tube);
    }
    for(let i=0;i<16;i++) {
      const xx=x+(i/15-.5)*width*.9;
      this.box(.08,.12,depth,xx,y+.06,z,this.mat(0x3c5459));
    }
  }
  private makeGate() {
    const dark=this.mat(0x142632,.7,.3),gold=this.mat(0x85765e,.7,.35),cyan=this.glow(0x63eed5,1.6);
    for(let x of [-8,8]) {
      this.box(1.3,11,1.3,x,5.5,-20,dark);
      this.platforms.push({x,y:5.5,z:-20,w:1.3,h:11,d:1.3});
      this.box(.065,9,.065,x-.67,5.5,-19.3,cyan);
      this.box(1.6,.5,1.6,x,.3,-20,gold);
      this.box(1.6,.35,1.6,x,9.6,-20,gold);
    }
    this.box(18,.6,2,0,9.3,-20,dark);this.box(16,.25,1.3,0,7.8,-20,gold);
    this.roof(23,5,0,10.5,-20);this.roof(16,4,0,12.3,-20);
    this.box(2.7,1.3,.28,0,9,-18.9,dark);this.sign('玄刃',0,9,-18.73,1.1,1.1,'#8fffe4');
    for(let x of [-7,7]) this.sign('天枢禁域',x,5.7,-19.23,.85,4.5,'#8ad6c5');
    this.core.position.set(0,5.8,-19.4);this.group.add(this.core);
    const sphere=new THREE.Mesh(new THREE.IcosahedronGeometry(.85,1),this.mat(0x1c424c,.9,.15));this.core.add(sphere);
    const wire=new THREE.Mesh(new THREE.IcosahedronGeometry(.88,1),new THREE.MeshBasicMaterial({color:0x9fffe4,wireframe:true,transparent:true,opacity:.5}));this.core.add(wire);
    for(let i=0;i<3;i++) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(1.75+i*.32,.045,8,100),this.glow(i===1?0xffa976:0x75ffe0,2));
      ring.rotation.set(i*.7,i*.5,i*.3);this.core.add(ring);this.rings.push(ring);
    }
    // Hanging cable lines reinforce the futuristic city silhouette.
    for(let side of [-1,1]) {
      const pts=[new THREE.Vector3(side*8,10,-20),new THREE.Vector3(side*20,9,-20),new THREE.Vector3(side*34,15,-23)];
      this.group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),20,.025,4,false),this.mat(0x527380)));
    }
  }
  private makeCity() {
    const buildings: {x:number;y:number;z:number;w:number;h:number;d:number}[]=[];
    for(let i=0;i<95;i++) {
      const a=this.random()*Math.PI*2,r=65+this.random()*100;
      const h=20+this.random()*75,w=5+this.random()*10,d=5+this.random()*10;
      const b={x:Math.cos(a)*r,y:-25+h/2,z:Math.sin(a)*r,w,h,d};buildings.push(b);
    }
    const base=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.mat(0x152837,.5,.7),buildings.length);
    const edges=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.glow(0x34647a,.6),buildings.length*2);
    const dummy=new THREE.Object3D();
    buildings.forEach((b,i)=>{
      dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();base.setMatrixAt(i,dummy.matrix);
      for(let j=0;j<2;j++){dummy.position.set(b.x+(j?1:-1)*b.w*.49,b.y,b.z+b.d/2+.02);dummy.scale.set(.06,b.h,.04);dummy.updateMatrix();edges.setMatrixAt(i*2+j,dummy.matrix);}
      if(i<8) {
        this.box(b.w+2,.4,b.d+2,b.x,b.y+b.h/2,b.z,this.mat(0x14242e),this.background,false);
        const beam=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,18,5),this.glow(0x3fd2dc,.8));beam.position.set(b.x,b.y+b.h/2+9,b.z);this.background.add(beam);
      }
    });
    this.background.add(base,edges);
    const windows=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xa1d2de,transparent:true,opacity:.5}),5500);
    let n=0;
    buildings.forEach(b=>{
      for(let y=-23;y<b.y+b.h/2-2;y+=2.7) for(let x=-b.w/2+.9;x<b.w/2-.5;x+=1.8) {
        if(this.random()<.45||n>=5500)continue;
        dummy.position.set(b.x+x,y,b.z+b.d/2+.03);dummy.scale.set(.7,1.05,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();windows.setMatrixAt(n,dummy.matrix);
        windows.setColorAt(n,new THREE.Color(this.random()<.12?0xdab68b:0x5a929e));n++;
      }
    });windows.count=n;this.background.add(windows);
    // Distant flying traffic.
    for(let i=0;i<16;i++) {
      const m=this.box(1.3,.07,.07,(this.random()-.5)*180,8+this.random()*35,-65-this.random()*60,this.glow(i%2?0xffa269:0x63f4ec,1.7),this.background,false);
      m.userData.speed=2+this.random()*4;m.userData.traffic=true;
    }
  }
  private makeAnchors() {
    const positions=[[-18,9,16],[18,9,16],[-28,12,-7],[28,12,-7],[-17,11,-18],[17,11,-18],[0,14,-23],[0,10,-32]];
    positions.forEach(([x,y,z],id)=>{
      const position=new THREE.Vector3(x,y,z);this.anchors.push({position,id});
      const group=new THREE.Group();group.position.copy(position);
      const core=new THREE.Mesh(new THREE.OctahedronGeometry(.32),this.glow(0x87ffe4,2.5));group.add(core);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.025,6,32),this.glow(0x67cbbf,1.2));group.add(ring);
      const support=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,y,6),this.mat(0x29434c));support.position.y=-y/2;group.add(support);
      this.group.add(group);this.anchorMeshes.push(group);
    });
  }
  private makeMoon() {
    const moon=new THREE.Mesh(new THREE.SphereGeometry(11,32,24),new THREE.MeshBasicMaterial({color:0x99bcce}));
    moon.position.set(-33,48,-135);this.background.add(moon);
    const eclipse=new THREE.Mesh(new THREE.SphereGeometry(10.8,32,24),new THREE.MeshBasicMaterial({color:0x081d2d}));
    eclipse.position.set(-30.5,49.5,-123.5);this.background.add(eclipse);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(11.3,.055,6,100),this.glow(0xa0e6e0,1.4));ring.position.copy(moon.position);this.background.add(ring);
    const stars=new Float32Array(350*3);for(let i=0;i<350;i++){stars[i*3]=(this.random()-.5)*500;stars[i*3+1]=40+this.random()*130;stars[i*3+2]=-120-this.random()*130;}
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(stars,3));this.background.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x88b2c9,size:.35,transparent:true,opacity:.6})));
  }
  update(dt: number,time: number) {
    this.core.rotation.y=time*.24;
    this.rings.forEach((r,i)=>{r.rotation.x+=dt*(.15+i*.06);r.rotation.z+=dt*.1;});
    this.anchorMeshes.forEach((g,i)=>{g.children[0].rotation.y=time*1.4;g.children[1].rotation.y=time*.5+i;g.children[1].scale.setScalar(1+Math.sin(time*2+i)*.08);});
    for(let i=0;i<this.rainData.length;i+=3){this.rainData[i+1]-=dt*21;this.rainData[i]-=dt*2;if(this.rainData[i+1]<-8){this.rainData[i+1]=38;this.rainData[i]+=4;}}
    this.rain.geometry.attributes.position.needsUpdate=true;
    this.background.children.forEach(c=>{if(c.userData.traffic){c.position.x+=dt*c.userData.speed;if(c.position.x>120)c.position.x=-120;}});
  }
}
