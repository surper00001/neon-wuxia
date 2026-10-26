import type { Vector3 } from 'three';

export type Weapon = 'sword' | 'blade' | 'pistol';
export type Mode = 'menu' | 'playing' | 'paused' | 'won' | 'lost';
export type EnemyKind = 'swordsman' | 'gunner' | 'boss';
export interface Platform { x: number; y: number; z: number; w: number; h: number; d: number }
export interface Anchor { position: Vector3; id: number }
export interface Fighter {
  id: number;
  kind: EnemyKind;
  position: Vector3;
  yaw: number;
  hp: number;
  maxHp: number;
  state: 'chase' | 'windup' | 'attack' | 'recover' | 'stunned' | 'dead';
  timer: number;
  attackTime: number;
  attackSerial: number;
  speed: number;
  hitFlash: number;
  cooldown: number;
  strafe: number;
}
export interface Player {
  position: Vector3;
  velocity: Vector3;
  yaw: number;
  hp: number;
  energy: number;
  weapon: Weapon;
  grounded: boolean;
  jumps: number;
  attackTimer: number;
  attackDuration: number;
  attackStep: number;
  attackHeavy: boolean;
  attackHits: Set<number>;
  queuedAttack: boolean;
  dashTimer: number;
  dashDirection: Vector3;
  dashCooldown: number;
  block: boolean;
  blockTime: number;
  invulnerable: number;
  ammo: number;
  reload: number;
  fireCooldown: number;
  hook: Anchor | null;
  hookCooldown: number;
  lockId: number | null;
}
export interface InputState {
  keys: Set<string>;
  pressed: Set<string>;
  primary: boolean;
  primaryPressed: boolean;
  secondary: boolean;
  lookX: number;
  lookY: number;
}
export interface GameEvent {
  type: 'slash' | 'hit' | 'shot' | 'enemyShot' | 'dash' | 'jump' | 'hook' | 'parry' | 'death' | 'wave' | 'toast' | 'hurt' | 'end' | 'reload';
  position?: Vector3;
  target?: Vector3;
  color?: number;
  text?: string;
  heavy?: boolean;
  yaw?: number;
}
