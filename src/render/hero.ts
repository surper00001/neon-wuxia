import * as THREE from 'three';

export interface HeroRig {
  root: THREE.Group;
  torso: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  metal: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
}
export interface HeroDetails {
  scarf: THREE.Mesh;
  robes: THREE.Mesh[];
  hair: THREE.Group;
  ribbons: THREE.Group[];
  torsoHeight: number;
}

// All geometry is original and generated locally. The combat skeleton and
// attachment origins match CharacterView, so the simulation remains unchanged.
export function buildHero(rig: HeroRig): HeroDetails {
  const {root,torso,leftArm,rightArm,leftLeg,rightLeg,metal,glow}=rig;
  const silk=new THREE.MeshPhysicalMaterial({color:0x18252d,roughness:.62,metalness:.05,sheen:.8,sheenColor:0x739793,sheenRoughness:.65,side:THREE.DoubleSide});
  const ivory=new THREE.MeshPhysicalMaterial({color:0xd1d1ba,roughness:.72,sheen:.7,sheenColor:0xf6ead0,sheenRoughness:.7,side:THREE.DoubleSide});
  const ink=new THREE.MeshStandardMaterial({color:0x10161f,roughness:.48,metalness:.08});
  const gold=new THREE.MeshStandardMaterial({color:0xab8851,metalness:.82,roughness:.31});
  const jade=new THREE.MeshPhysicalMaterial({color:0x7dbb9e,metalness:.16,roughness:.22,clearcoat:1,clearcoatRoughness:.15});
  const skin=new THREE.MeshStandardMaterial({color:0xe5bfa2,roughness:.78,metalness:0});
  const lip=new THREE.MeshStandardMaterial({color:0xa97868,roughness:.82});
  const eyeWhite=new THREE.MeshStandardMaterial({color:0xded8c8,roughness:.38});
  const iris=new THREE.MeshStandardMaterial({color:0x2d241d,roughness:.3});
  const hairMat=new THREE.MeshPhysicalMaterial({color:0x12161c,roughness:.44,metalness:.12,sheen:.55,sheenColor:0x42515a,sheenRoughness:.5});
  const hairHighlight=new THREE.MeshStandardMaterial({color:0x29343d,roughness:.44,metalness:.1});
  const mutedGlow=glow.clone();mutedGlow.emissiveIntensity=.35;
  metal.color.set(0x26333a);metal.roughness=.42;glow.emissiveIntensity=.85;
  const robes:THREE.Mesh[]=[],ribbons:THREE.Group[]=[];
  function mesh(g: THREE.BufferGeometry,m: THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=torso) {
    const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;
  }
  function ellipsoid(x:number,y:number,z:number,sx:number,sy:number,sz:number,m:THREE.Material,parent:THREE.Object3D=torso) {
    const o=mesh(new THREE.SphereGeometry(1,20,14),m,x,y,z,parent);o.scale.set(sx,sy,sz);return o;
  }
  function curve(points: number[][],radius:number,m:THREE.Material,parent:THREE.Object3D=torso) {
    const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number])));
    return mesh(new THREE.TubeGeometry(path,24,radius,5,false),m,0,0,0,parent);
  }
  function panel(width:number,height:number,bend:number,m:THREE.Material,parent:THREE.Object3D,x:number,y:number,z:number) {
    const g=new THREE.PlaneGeometry(width,height,8,14),p=g.attributes.position;
    for(let i=0;i<p.count;i++) {
      const t=(height/2-p.getY(i))/height;
      p.setZ(i,Math.sin(p.getX(i)/width*Math.PI*4)*.014*t+bend*t*t);
    }
    g.computeVertexNormals();
    return mesh(g,m,x,y,z,parent);
  }
  torso.position.y=1.22;root.add(torso);
  // Slim-waisted, long-legged silhouette. Surfaces overlap as tailoring layers.
  const coatProfile=[[-.08,.193],[.05,.198],[.22,.215],[.39,.251],[.54,.255],[.62,.13]];
  mesh(new THREE.LatheGeometry(coatProfile.map(([y,r])=>new THREE.Vector2(r,y)),32),silk,0,0,0).scale.z=.63;
  mesh(new THREE.CylinderGeometry(.06,.075,.12,24),skin,0,.685,0);
  // Ivory crossed collar; two sloping strips follow the front of the chest.
  for(const side of [-1,1]) {
    const collar=mesh(new THREE.BoxGeometry(.065,.53,.027),ivory,side*.04,.39,.17);collar.rotation.z=-side*.43;
    const trim=mesh(new THREE.BoxGeometry(.006,.53,.018),gold,side*.012,.39,.187);trim.rotation.z=-side*.43;
  }
  mesh(new THREE.CylinderGeometry(.219,.215,.17,24),ink,0,-.075,0).scale.z=.76;
  mesh(new THREE.CylinderGeometry(.221,.218,.037,24),gold,0,-.1,0).scale.z=.76;
  ellipsoid(0,-.075,.219,.058,.055,.015,jade);
  curve([[-.18,-.01,.19],[-.04,-.015,.227],[.11,-.08,.23],[.2,-.16,.12]],.017,ink);
  const clasp=mesh(new THREE.TorusGeometry(.035,.008,6,20),gold,.116,-.075,.226);clasp.rotation.z=.3;
  // Split overcoat with ivory lining, tapered panels and narrow gold piping.
  for(const side of [-1,1]) {
    const coat=panel(.3,1.02,.065,silk,torso,side*.22,-.54,-.065);
    coat.rotation.y=side*.55;coat.rotation.z=-side*.09;robes.push(coat);
    const lining=panel(.26,.96,.06,ivory,coat,0,-.008,-.009);
    lining.castShadow=false;
    curve([[-.147,.5,.004],[-.147,.05,.007],[-.147,-.49,.07]],.006,gold,coat);
    curve([[.147,.5,.004],[.147,.05,.007],[.147,-.49,.07]],.006,gold,coat);
    // Woven cloud curls are actual geometry, visible in the inspection view.
    for(let i=0;i<3;i++){
      const x=side*(.08+i*.011),y=-.21-i*.115;
      curve([[x-.035,y+.02,.039],[x-.055,y+.055,.039],[x-.005,y+.072,.039],[x+.035,y+.04,.039],[x+.01,y,.039]],.004,gold,coat);
    }
  }
  const back=panel(.43,.99,.065,silk,torso,0,-.54,-.194);robes.push(back);
  const front=panel(.23,.57,.015,ivory,torso,-.025,-.41,.187);front.rotation.z=.055;robes.push(front);
  curve([[-.12,-.19,.22],[-.08,-.3,.225],[.05,-.37,.22],[.08,-.45,.22]],.008,gold);
  // Scapula guard, asymmetric pauldron and a small jade energy core.
  mesh(new THREE.BoxGeometry(.16,.29,.075),metal,.145,.44,-.205).rotation.z=-.15;
  mesh(new THREE.BoxGeometry(.035,.19,.012),mutedGlow,.145,.44,-.247).rotation.z=-.15;
  const pauldron=ellipsoid(-.315,.56,.015,.16,.087,.18,metal);pauldron.rotation.z=-.22;
  curve([[-.44,.59,.08],[-.34,.64,.16],[-.23,.61,.11]],.012,gold);
  ellipsoid(-.34,.575,.175,.045,.016,.008,jade);
  for(const side of [-1,1]) {
    const arm=side<0?leftArm:rightArm;
    arm.position.set(side*.315,.55,0);torso.add(arm);
    mesh(new THREE.CapsuleGeometry(.082,.27,5,14),silk,side*.015,-.22,0,arm);
    mesh(new THREE.CylinderGeometry(.095,.064,.26,16),silk,side*.01,-.48,.018,arm);
    mesh(new THREE.CylinderGeometry(.087,.068,.22,16),metal,side*.01,-.515,.025,arm);
    mesh(new THREE.TorusGeometry(.083,.009,5,18),gold,side*.01,-.417,.025,arm).rotation.x=Math.PI/2;
    mesh(new THREE.TorusGeometry(.07,.009,5,18),gold,side*.01,-.62,.025,arm).rotation.x=Math.PI/2;
    mesh(new THREE.BoxGeometry(.027,.125,.012),mutedGlow,side*.01,-.51,.109,arm);
    ellipsoid(side*.01,-.694,.052,.065,.094,.042,skin,arm);
    // Fingertips keep the human hands distinct from the dark bracers.
    for(let i=0;i<4;i++)ellipsoid(side*.01+(i-1.5)*.024,-.751,.068,.012,.044,.017,skin,arm);
    ellipsoid(side*.06,-.698,.086,.018,.05,.022,skin,arm).rotation.z=-side*.5;
    const leg=side<0?leftLeg:rightLeg;
    leg.position.set(side*.14,1.12,0);root.add(leg);
    mesh(new THREE.CapsuleGeometry(.096,.39,4,14),ink,0,-.28,0,leg);
    mesh(new THREE.CylinderGeometry(.092,.061,.4,16),ink,0,-.79,.003,leg);
    ellipsoid(0,-.535,.023,.094,.09,.072,silk,leg);
    // Sleek boots, no exposed robot joints or oversized cube feet.
    ellipsoid(0,-1.045,.07,.085,.075,.17,ink,leg);
    mesh(new THREE.CylinderGeometry(.082,.075,.23,16),ink,0,-.965,.005,leg);
    mesh(new THREE.TorusGeometry(.084,.007,5,18),gold,0,-.853,.003,leg).rotation.x=Math.PI/2;
    curve([[0,-.87,.087],[0,-1,.12],[0,-1.034,.2]],.006,gold,leg);
  }
  const head=new THREE.Group();head.position.set(0,.84,.006);torso.add(head);
  // Face surface: tapered jaw, narrow cheekbones, continuous nose bridge.
  const faceRings:number[][]=[];
  const profile=[[-.151,.027,.035],[-.135,.058,.057],[-.105,.08,.075],[-.069,.104,.087],[-.03,.12,.097],
    [.013,.125,.101],[.055,.123,.101],[.095,.118,.095],[.127,.096,.076],[.15,.065,.052],[.163,.008,.008]];
  for(let ring=0;ring<profile.length-1;ring++){
    const [y,w,d]=profile[ring],next=profile[ring+1];
    for(let j=0;j<4;j++){const t=j/4;faceRings.push([THREE.MathUtils.lerp(y,next[0],t),THREE.MathUtils.lerp(w,next[1],t),THREE.MathUtils.lerp(d,next[2],t)]);}
  }
  faceRings.push(profile[profile.length-1]);
  const verts:number[]=[],indices:number[]=[],segments=48;
  faceRings.forEach(([y,w,d],row)=>{
    for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,front=Math.max(0,Math.cos(a));
      const bridge=Math.exp(-Math.pow((y+.004)/.052,2))*.019;
      const tip=Math.exp(-Math.pow((y+.032)/.018,2))*.009;
      const nose=(bridge+tip)*Math.pow(front,34);
      verts.push(Math.sin(a)*w,y,Math.cos(a)*d+nose);
      if(row<faceRings.length-1&&i<segments){const k=row*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
    }
  });
  const faceGeo=new THREE.BufferGeometry();faceGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));faceGeo.setIndex(indices);faceGeo.computeVertexNormals();
  mesh(faceGeo,skin,0,0,0,head);
  for(const side of [-1,1]) {
    ellipsoid(side*.126,-.015,-.005,.025,.047,.02,skin,head);
    // Almond eye outline built from two curves, rather than emissive rectangles.
    const eyeShape=new THREE.Shape();
    eyeShape.moveTo(-.039,0);eyeShape.quadraticCurveTo(-.009,.016,.038,.005);eyeShape.quadraticCurveTo(.006,-.01,-.039,0);
    const eye=mesh(new THREE.ShapeGeometry(eyeShape,16),eyeWhite,side*.06,.028,.099,head);
    eye.rotation.y=side*.16;eye.rotation.z=side*.08;
    ellipsoid(side*.06,.03,.102,.011,.012,.0035,iris,head);
    ellipsoid(side*.057,.034,.106,.0023,.0023,.0015,eyeWhite,head);
    curve([[side*.022,.03,.103],[side*.05,.046,.105],[side*.088,.04,.098],[side*.104,.035,.087]],.0026,ink,head);
    curve([[side*.019,.07,.103],[side*.052,.074,.108],[side*.083,.07,.101],[side*.102,.062,.084]],.004,hairMat,head);
    ellipsoid(side*.012,-.044,.112,.004,.0014,.0011,lip,head);
  }
  curve([[-.027,-.079,.083],[-.012,-.077,.09],[0,-.08,.093],[.012,-.077,.09],[.027,-.079,.083]],.0018,lip,head);
  ellipsoid(0,-.086,.09,.022,.003,.002,lip,head);
  // Hair cap and individually sculpted swept strands preserve the forehead.
  const cap=mesh(new THREE.SphereGeometry(.134,28,20,0,Math.PI*2,0,Math.PI*.28),hairMat,0,.044,-.014,head);cap.scale.set(1,1.03,.9);
  const backHair=mesh(new THREE.SphereGeometry(.134,24,18,Math.PI,Math.PI,Math.PI*.28,Math.PI*.67),hairMat,0,.026,-.016,head);backHair.scale.set(1,1.08,.9);
  for(let side of [-1,1]) {
    for(let i=0;i<9;i++){
      const x=side*(.018+i*.012);
      curve([[x,.166,-.008],[x*1.15,.14,.08],[side*(.08+i*.006),.09,.101],[side*(.12+i*.002),-.025,.05],[side*.117,-.105,.006]],.011-i*.0005,i%4===0?hairHighlight:hairMat,head);
    }
    const lock=curve([[side*.12,.08,.025],[side*.13,-.07,.016],[side*.115,-.19,-.005],[side*.1,-.24,.015]],.017,hairMat,head);lock.rotation.y=side*.08;
  }
  const hair=new THREE.Group();hair.position.set(0,.12,-.08);head.add(hair);
  for(let i=0;i<13;i++){
    const a=i/13*Math.PI*2,r=.027+(i%3)*.006;
    curve([[Math.sin(a)*r,0,Math.cos(a)*r],[Math.sin(a)*r*.7,-.16,-.07],[Math.sin(a)*r*.9,-.35,-.11],[Math.sin(a)*r*.6,-.57,-.09]],.011,i%4===0?hairHighlight:hairMat,hair);
  }
  const crown=mesh(new THREE.TorusGeometry(.059,.014,8,28),gold,0,.19,-.032,head);crown.rotation.x=Math.PI/2;
  ellipsoid(0,.2,-.03,.046,.061,.04,hairMat,head);
  mesh(new THREE.CylinderGeometry(.023,.029,.078,12),jade,0,.223,-.024,head);
  const pin=mesh(new THREE.CylinderGeometry(.006,.006,.22,8),gold,0,.24,-.024,head);pin.rotation.z=Math.PI/2;
  ellipsoid(.125,.24,-.024,.017,.013,.012,jade,head);
  for(const side of [-1,1]) {
    const ribbon=new THREE.Group();ribbon.position.set(side*.032,.17,-.07);head.add(ribbon);ribbons.push(ribbon);
    const strip=panel(.027,.44,-.025,ivory,ribbon,0,-.215,0);strip.rotation.z=side*.15;
  }
  // A fine silk sash replaces the oversized orange scarf.
  const scarf=panel(.07,.94,-.055,ivory,torso,-.165,-.335,-.24);scarf.rotation.z=-.12;
  curve([[-.005,.45,.005],[-.005,0,-.018],[-.005,-.46,-.05]],.004,gold,scarf);
  // Traditional jian scabbard with restrained metal fittings.
  const scabbard=new THREE.Group();scabbard.position.set(.01,.11,-.225);scabbard.rotation.z=-.38;torso.add(scabbard);
  mesh(new THREE.CylinderGeometry(.031,.035,1.16,8),ink,0,-.17,0,scabbard);
  for(const y of [-.69,.31])mesh(new THREE.CylinderGeometry(.037,.037,.065,8),gold,0,y,0,scabbard);
  mesh(new THREE.CylinderGeometry(.024,.024,.24,10),jade,0,.5,0,scabbard);
  mesh(new THREE.BoxGeometry(.2,.025,.055),gold,0,.36,0,scabbard);
  return {scarf,robes,hair,ribbons,torsoHeight:1.22};
}
