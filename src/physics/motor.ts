import RAPIER from '@dimforge/rapier3d-compat';
import { Vector3 } from 'three';
import type { Platform } from '../types';

export class Motor {
  world: RAPIER.World;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  constructor(platforms: Platform[]) {
    this.world=new RAPIER.World({x:0,y:-25,z:0});
    this.world.timestep=1/60;
    for(const p of platforms) this.world.createCollider(RAPIER.ColliderDesc.cuboid(p.w/2,p.h/2,p.d/2).setTranslation(p.x,p.y,p.z).setFriction(.7));
    this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1.05,12));
    this.collider=this.world.createCollider(RAPIER.ColliderDesc.capsule(.65,.32),this.body);
    this.controller=this.world.createCharacterController(.025);
    this.controller.setSlideEnabled(true);
    this.controller.enableAutostep(.35,.2,true);
    this.controller.enableSnapToGround(.2);
    this.controller.setMaxSlopeClimbAngle(Math.PI/3);
    this.controller.setMinSlopeSlideAngle(Math.PI/3);
  }
  reset(p: Vector3) {
    this.body.setTranslation({x:p.x,y:p.y+.99,z:p.z},true);
    this.body.setNextKinematicTranslation({x:p.x,y:p.y+.99,z:p.z});
    this.world.step();
  }
  move(delta: Vector3,position: Vector3): boolean {
    this.controller.computeColliderMovement(this.collider,delta);
    const movement=this.controller.computedMovement();
    const t=this.body.translation();
    this.body.setNextKinematicTranslation({x:t.x+movement.x,y:t.y+movement.y,z:t.z+movement.z});
    this.world.step();
    const p=this.body.translation();
    position.set(p.x,p.y-.99,p.z);
    return this.controller.computedGrounded();
  }
  blocked(from: Vector3,to: Vector3) {
    const dir=to.clone().sub(from);const distance=dir.length();if(distance<.01)return false;dir.normalize();
    const hit=this.world.castRay(new RAPIER.Ray(from,dir),distance,true,undefined,undefined,this.collider);
    return !!hit && hit.timeOfImpact<distance-.25;
  }
}

export async function createMotor(platforms: Platform[]) { await RAPIER.init();return new Motor(platforms); }
