import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { VIEW_H, VIEW_W } from "./view";
import { Input, type ClickTarget } from "./Input";
import { Diamond } from "../world/Diamond";
import { Stadium } from "../world/Stadium";
import { Player } from "../entities/Player";
import { faceCamera, resetKidFx } from "../entities/kidMesh";
import { Ball } from "../entities/Ball";
import { Hud } from "../ui/hud";
import { makeMarkerMesh } from "../shaders/marker";
import { makeAimConeMesh } from "../shaders/path";
import {
  BASES,
  BALL_RADIUS,
  CATCH_RADIUS,
  HIT_TRAVEL,
  FIELDER_SPOTS,
  BATTER_BOX,
  DUGOUT_AWAY_EXIT,
  HOME,
  MOUND,
  NEXT_BASE,
  type BaseId,
  type PositionId,
} from "../world/fieldLayout";
import { defaultEnabledIds, pickRandomScenario, type Scenario } from "../sim/scenarios";
import {
  covering,
  forceBases,
  holderAtBase,
  isFair,
  shouldAdvanceRunner,
  type PlayGrade,
} from "../sim/rules";
import { shouldClearSelection } from "./selection";
import { awardScore, SCORE_VALUES } from "../sim/scoring";

const POSITIONS = Object.keys(FIELDER_SPOTS) as PositionId[];
const FIXED_DT = 1 / 60;

export class Game {
  readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly rig: CameraRig;
  private readonly diamond = new Diamond();
  private readonly stadium = new Stadium();
  private readonly ball = new Ball();
  private readonly fielders: Player[] = [];
  private readonly runners: Player[] = [];
  private readonly marker: THREE.Mesh;
  private readonly path: THREE.Mesh;
  private readonly hud: Hud;

  private selected: Player | null = null;
  private hovered: Player | null = null;
  private batter: Player | null = null;
  private phase: "idle" | "pitching" | "ballInPlay" | "resolving" = "idle";
  private paused = false;
  private timeScale = 0.5;
  private hintsOn = true;
  private muted = false;
  private enabled = defaultEnabledIds();
  private scenario: Scenario | null = null;
  private acc = 0;
  private elapsed = 0;
  private playClock = 0;
  private hitAt = 0;
  private pitchT = 0;
  private batterSwung = false;
  private resolveAt = 0;
  private bounced = false;
  private caughtFly = false;
  private fieldedBy: PositionId | undefined;
  private fieldedAt = 0;
  private throwTo: BaseId | undefined;
  private throws: BaseId[] = [];
  private throwBase: BaseId | null = null;
  private outAt: BaseId | undefined;
  private outs: BaseId[] = [];
  private score = 0;
  /** Bases occupied at the start of the current play (for force / cover). */
  private occupancy = new Set<BaseId>();
  private nextRunnerId = 1;
  private running = false;
  private audio: AudioContext | null = null;

  constructor(canvas: HTMLCanvasElement, hudRoot: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(VIEW_W, VIEW_H, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(0x6eb6ea);
    this.scene.fog = new THREE.Fog(0x6eb6ea, 640, 1280);

    this.rig = new CameraRig();

    this.addLights();
    this.scene.add(this.diamond.group);
    this.scene.add(this.stadium.group);
    this.scene.add(this.ball.mesh, this.ball.shadow, this.ball.trail.mesh);

    for (const pos of POSITIONS) {
      const spot = FIELDER_SPOTS[pos];
      const p = new Player({
        id: pos,
        team: "home",
        label: pos,
        x: spot.x,
        z: spot.z,
        positionId: pos,
      });
      this.fielders.push(p);
      this.scene.add(p.mesh);
    }

    this.marker = makeMarkerMesh();
    this.marker.raycast = () => {};
    this.scene.add(this.marker);
    this.path = makeAimConeMesh();
    this.scene.add(this.path);

    this.hud = new Hud(hudRoot, {
      onTogglePlay: () => this.togglePlay(),
      onNext: () => this.nextPlay(),
      onOpenSettings: () => undefined,
      onSpeed: (v) => {
        this.timeScale = v;
      },
      onHints: (on) => {
        this.hintsOn = on;
      },
      onMute: (on) => {
        this.muted = on;
      },
      onScenarioToggle: (id, on) => {
        if (on) this.enabled.add(id);
        else this.enabled.delete(id);
      },
    });
    this.hud.setScore(this.score);
    this.hud.setCoach("Hit Play. Move your fielders — they won't go by themselves!");

    new Input(
      canvas,
      this.rig.camera,
      () => this.fielders.map((f) => f.mesh),
      () => [...this.diamond.baseHits.values()],
      () => this.ball.mesh,
      (t) => this.handleClick(t),
      (kind, fielderId) => {
        canvas.dataset.cursor = kind;
        const next = fielderId ? this.fielders.find((f) => f.id === fielderId) ?? null : null;
        if (this.hovered !== next) {
          this.hovered?.setHovered(false);
          this.hovered = next;
          this.hovered?.setHovered(true);
        }
      },
      () => this.select(null),
    );

    this.hud.setPlayIcon("play");
  }

  start() {
    this.running = true;
    let last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      const raw = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!this.paused) this.acc += raw;
      while (this.acc >= FIXED_DT) {
        this.step(FIXED_DT);
        this.acc -= FIXED_DT;
      }
      this.elapsed = now / 1000;
      this.syncFx();
      this.renderer.render(this.scene, this.rig.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  togglePlay() {
    if (this.phase === "idle" || this.phase === "resolving") {
      this.beginPlay(pickRandomScenario(this.enabled, this.scenario?.id));
      return;
    }
    this.paused = !this.paused;
    this.hud.setPaused(this.paused);
    this.hud.setPlayIcon(this.paused ? "play" : "pause");
  }

  nextPlay() {
    this.beginPlay(pickRandomScenario(this.enabled, this.scenario?.id));
  }

  private addLights() {
    const hemi = new THREE.HemisphereLight(0xb8e0ff, 0x7a5a32, 0.85);
    const sun = new THREE.DirectionalLight(0xfff1c9, 1.15);
    sun.position.set(80, 140, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -220;
    sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220;
    sun.shadow.camera.bottom = -220;
    const fill = new THREE.DirectionalLight(0x9fd7ff, 0.35);
    fill.position.set(-40, 40, -80);
    this.scene.add(hemi, sun, fill);
  }

  private beginPlay(scenario: Scenario) {
    this.settleLiveRunners();
    this.resetFielders();
    this.cleanupPlayFx();
    this.paused = false;
    this.hud.setPaused(false);
    this.bounced = false;
    this.caughtFly = false;
    this.fieldedBy = undefined;
    this.fieldedAt = 0;
    this.throwTo = undefined;
    this.throws = [];
    this.throwBase = null;
    this.outAt = undefined;
    this.outs = [];
    this.playClock = 0;
    this.hitAt = 0;
    this.batterSwung = false;
    this.scenario = scenario;
    this.occupancy = this.liveOccupied();
    this.batter = this.spawnRunner(
      `batter-${this.nextRunnerId++}`,
      DUGOUT_AWAY_EXIT.x,
      DUGOUT_AWAY_EXIT.z,
      "1B",
    );
    this.batter.speed = 11;
    this.batter.target = new THREE.Vector3(BATTER_BOX.x, 0, BATTER_BOX.z);
    this.ball.release();
    this.ball.mode = "pitch";
    this.ball.mesh.position.set(MOUND.x, 3.4, MOUND.z);
    this.ball.velocity.set(0, 0, 0);
    this.pitchT = 0;
    this.phase = "pitching";
    this.hud.setCoach(this.scenario.coachBefore);
    this.hud.setPlayIcon("pause");
    this.beep(440, 0.08);
  }

  private resetFielders() {
    for (const f of this.fielders) {
      const spot = FIELDER_SPOTS[f.positionId!];
      f.mesh.position.set(spot.x, 0, spot.z);
      f.target = null;
      f.chaseBall = false;
      f.hasBall = false;
      f.covering = undefined;
    }
    this.ball.mode = "idle";
    this.ball.mesh.position.set(MOUND.x, 1.2, MOUND.z);
    this.ball.velocity.set(0, 0, 0);
  }

  private spawnRunner(id: string, x: number, z: number, dest: BaseId): Player {
    const r = new Player({
      id,
      team: "away",
      label: "",
      x,
      z,
      isRunner: true,
      isBatter: true,
    });
    r.runnerDest = dest;
    this.runners.push(r);
    this.scene.add(r.mesh);
    return r;
  }

  private liveOccupied(): Set<BaseId> {
    const s = new Set<BaseId>();
    for (const r of this.runners) {
      if (!r.mesh.visible || r.scored) continue;
      if (r.onBase && r.onBase !== "home") s.add(r.onBase);
    }
    return s;
  }

  /** Keep safe runners on their bags; drop anyone who was out or scored. */
  private settleLiveRunners() {
    const kept: Player[] = [];
    const taken = new Set<BaseId>();
    for (const r of this.runners) {
      if (!r.mesh.visible || r.scored) {
        this.scene.remove(r.mesh);
        continue;
      }
      let bag = r.onBase;
      if (r.reachedBase && r.runnerDest === "home") {
        this.scene.remove(r.mesh);
        continue;
      }
      if (r.reachedBase && r.runnerDest && r.runnerDest !== "home") bag = r.runnerDest;
      if (!bag || bag === "home" || taken.has(bag)) {
        this.scene.remove(r.mesh);
        continue;
      }
      taken.add(bag);
      const p = BASES[bag];
      r.mesh.position.set(p.x, 0, p.z);
      r.mesh.visible = true;
      r.target = null;
      r.reachedBase = false;
      r.called = false;
      r.scored = false;
      r.onBase = bag;
      r.runnerDest = NEXT_BASE[bag];
      kept.push(r);
    }
    this.runners.length = 0;
    this.runners.push(...kept);
    this.batter = null;
  }

  private handleClick(target: ClickTarget) {
    if (this.paused) return;
    if (target.kind === "fielder") {
      const p = this.fielders.find((f) => f.id === target.id);
      if (!p) return;
      if (this.selected?.hasBall && p !== this.selected) {
        this.throwToFielder(p);
        return;
      }
      if (this.selected !== p) this.select(p);
      return;
    }

    if (shouldClearSelection(this.selected?.id ?? null, target)) {
      this.select(null);
      return;
    }
    if (!this.selected) return;
    if (target.kind === "ball") {
      this.selected.chaseBall = true;
      this.selected.target = new THREE.Vector3(this.ball.xz.x, 0, this.ball.xz.z);
      this.showMarker(this.ball.xz.x, this.ball.xz.z);
      return;
    }
    if (target.kind === "base") {
      this.commandToBase(target.id);
      return;
    }
    if (this.selected.hasBall) {
      const near = this.nearestBase(target.x, target.z, 14);
      if (near) {
        this.commandToBase(near);
        return;
      }
    }
    this.selected.chaseBall = false;
    this.selected.target = new THREE.Vector3(target.x, 0, target.z);
    this.showMarker(target.x, target.z);
  }

  private fielderByPos(pos: PositionId): Player | undefined {
    return this.fielders.find((f) => f.positionId === pos);
  }

  private aiBusy(p: Player) {
    return p.chaseBall || p.hasBall;
  }

  private sendCover(pos: PositionId, base: BaseId) {
    const p = this.fielderByPos(pos);
    if (!p || this.aiBusy(p)) return;
    const bag = BASES[base];
    p.covering = base;
    p.chaseBall = false;
    if (p.distTo(bag) < 2.2) {
      p.target = null;
      return;
    }
    p.target = new THREE.Vector3(bag.x, 0, bag.z);
  }

  private releaseCover(p: Player) {
    if (this.aiBusy(p)) return;
    p.covering = undefined;
    const spot = FIELDER_SPOTS[p.positionId!];
    if (p.distTo(spot) > 4) p.target = new THREE.Vector3(spot.x, 0, spot.z);
    else p.target = null;
  }

  private updateCoverAi() {
    if (this.phase !== "ballInPlay") return;
    const first = this.fielderByPos("1B");
    const firstOffBag = first && (first.chaseBall || (first.hasBall && first.distTo(BASES["1B"]) > 10));
    if (firstOffBag) {
      const pitcher = this.fielderByPos("P");
      if (pitcher && !this.aiBusy(pitcher)) this.sendCover("P", "1B");
      else this.sendCover("2B", "1B");
    } else {
      this.sendCover("1B", "1B");
    }

    const occupied = this.occupancy;
    const needSecond = occupied.has("1B") || this.scenario?.expected.throwTo === "2B";
    if (needSecond) {
      const leftHit = this.ball.xz.x < 0;
      const ss = this.fielderByPos("SS");
      const two = this.fielderByPos("2B");
      if (leftHit) {
        if (ss && ss.covering === "2B") this.releaseCover(ss);
        this.sendCover("2B", "2B");
      } else {
        if (two && two.covering === "2B") this.releaseCover(two);
        this.sendCover("SS", "2B");
      }
    }

    this.sendCover("C", "home");
    const third = this.fielderByPos("3B");
    if (third && !this.aiBusy(third)) this.sendCover("3B", "3B");
  }

  private throwToFielder(p: Player) {
    if (!this.selected?.hasBall) return;
    const dest = p.covering ? BASES[p.covering] : p.xz;
    this.ball.throwTo(new THREE.Vector3(dest.x, 2.4, dest.z), 57);
    this.throwBase = p.covering ?? this.nearestBase(dest.x, dest.z, 24);
    this.noteThrow(this.throwBase);
    this.selected.chaseBall = false;
    this.awardScore("throw");
    this.beep(620, 0.07);
  }

  private commandToBase(id: BaseId) {
    if (!this.selected) return;
    const bag = BASES[id];
    if (this.selected.hasBall) {
      this.ball.throwTo(new THREE.Vector3(bag.x, 2.2, bag.z), 57);
      this.throwBase = id;
      this.noteThrow(id);
      this.selected.chaseBall = false;
      this.awardScore("throw");
      this.beep(620, 0.07);
    } else {
      this.selected.chaseBall = false;
      this.selected.target = new THREE.Vector3(bag.x, 0, bag.z);
      this.selected.covering = id;
      this.showMarker(bag.x, bag.z);
    }
  }

  private nearestBase(x: number, z: number, maxDist: number): BaseId | null {
    let best: BaseId | null = null;
    let bestD = maxDist;
    for (const id of Object.keys(BASES) as BaseId[]) {
      const b = BASES[id];
      const d = Math.hypot(x - b.x, z - b.z);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  private select(p: Player | null) {
    this.selected?.setSelected(false);
    this.selected = p;
    p?.setSelected(true);
    this.hud.setSelected(p ? p.id : null);
    if (!p) {
      this.marker.visible = false;
      this.path.visible = false;
    }
  }

  private showMarker(x: number, z: number) {
    this.marker.visible = true;
    this.marker.position.set(x, 0.07, z);
    (this.marker.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 1;
  }

  private step(dt: number) {
    this.playClock += dt;
    this.ball.step(dt, this.stadium.fencePoly);
    const ballXZ = this.ball.xz;
    for (const f of this.fielders) f.step(dt, this.stadium.fencePoly, ballXZ);
    for (const r of this.runners) r.step(dt * this.timeScale, this.stadium.fencePoly);

    if (this.phase === "pitching") this.stepPitch();
    else if (this.phase === "ballInPlay") this.stepPlay();
    else if (this.phase === "resolving" && this.playClock > this.resolveAt) {
      if (this.paused) {
        this.phase = "idle";
        this.hud.setPlayIcon("play");
      } else {
        this.nextPlay();
      }
    }
  }

  private stepPitch() {
    if (this.batter && this.batter.distTo(BATTER_BOX) > 2.8) {
      this.ball.mesh.position.set(MOUND.x, 3.4, MOUND.z);
      this.pitchT = 0;
      return;
    }
    if (this.batter?.target) this.batter.target = null;
    this.pitchT += 1 / 60;
    const pitchSec = 1.55;
    const t = Math.min(1, this.pitchT / pitchSec);
    const ease = t * t * (3 - 2 * t);
    this.ball.mesh.position.set(
      MOUND.x + (HOME.x - MOUND.x) * ease,
      3.4 + Math.sin(t * Math.PI) * 1.6,
      MOUND.z + (HOME.z - MOUND.z) * ease,
    );
    this.ball.velocity.set(0, 0, 0);
    if (t >= 1) this.launchHit();
  }

  private launchHit() {
    if (!this.scenario) return;
    const aim = this.scenario.hit.target;
    const scatter = Math.min(6, Math.hypot(aim.x, aim.z) * 0.08);
    const x = aim.x + (Math.random() - 0.5) * scatter;
    const z = aim.z + (Math.random() - 0.5) * scatter;
    const dist = Math.hypot(x, z) || 1;
    const kind = this.scenario.hit.kind;
    let vx: number;
    let vy: number;
    let vz: number;
    if (kind === "grounder") {
      const land = Math.max(22, dist * 0.72);
      const hang = 0.62;
      const horiz = land / hang;
      vx = (x / dist) * horiz;
      vz = (z / dist) * horiz;
      vy = 10;
    } else if (kind === "fly") {
      // Ball.step() scales inPlay velocity decay AND position update by flight=0.5, so both
      // the vertical peak and horizontal reach must account for that factor to land on target.
      const gravity = 16;
      const flight = 0.5;
      const peakHeight = 13; // clears the y>11 infield catch ceiling
      const vyPeak = Math.sqrt((2 * gravity * peakHeight) / flight);
      const hangTime = (2 * vyPeak) / gravity;
      const horiz = dist / (flight * hangTime);
      vx = (x / dist) * horiz;
      vz = (z / dist) * horiz;
      vy = vyPeak;
    } else {
      const ang = (this.scenario.hit.launchAngle * Math.PI) / 180;
      const speed = this.scenario.hit.speed;
      const horiz = speed * Math.cos(ang);
      vx = (x / dist) * horiz;
      vz = (z / dist) * horiz;
      vy = speed * Math.sin(ang);
    }
    this.ball.mode = "inPlay";
    this.ball.trail.clear();
    this.ball.mesh.position.set(0, 2.8, 0);
    this.ball.trail.push(0, 2.8, 0);
    this.ball.velocity.set(vx, vy, vz);
    this.bounced = false;
    this.hitAt = this.playClock;
    this.phase = "ballInPlay";
    this.sendRunners();
    this.beep(180, 0.12);
  }

  private sendRunners() {
    const occupied = this.occupancy;
    for (const r of this.runners) {
      if (!r.runnerDest) continue;
      const dest = r.runnerDest;
      if (shouldAdvanceRunner(occupied, dest, r === this.batter)) {
        const bag = BASES[dest];
        r.target = new THREE.Vector3(bag.x, 0, bag.z);
        r.faceBase(dest);
      }
    }
  }

  private stepPlay() {
    if (this.ball.mode === "inPlay" && this.ball.mesh.position.y <= BALL_RADIUS + 0.2) this.bounced = true;

    this.updateCoverAi();
    if (this.batter && !this.batterSwung && this.ball.mode === "inPlay") {
      const dToHome = Math.hypot(this.ball.xz.x - HOME.x, this.ball.xz.z - HOME.z);
      if (dToHome < 8) {
        this.batterSwung = true;
      }
    }
    this.tryCatchOrPickup();
    this.tryCompleteThrow();
    this.advanceRunners();
    this.tryForceAndTag();
    this.updateHints();

    const heldInfield =
      this.ball.mode === "held" &&
      this.ball.holder &&
      ["P", "C", "1B", "2B", "3B", "SS"].includes(this.ball.holder.positionId ?? "");
    const runnersIdle = this.runners.every((r) => !r.target);
    if (this.caughtFly && this.playClock > 1.2) this.finishPlay();
    else if (heldInfield && runnersIdle && this.fieldedAt > 0 && this.playClock > this.fieldedAt + 4) {
      this.finishPlay();
    }
    else if (this.playClock > 16) this.finishPlay();
    else if (this.ball.mode === "inPlay" && !isFair(this.ball.xz.x, this.ball.xz.z) && this.bounced) {
      this.hud.setCoach("Foul ball!");
      this.finishPlay("none");
    }
  }

  private tryCatchOrPickup() {
    if (this.ball.mode !== "inPlay") return;
    if (this.ball.mode === "inPlay" && this.playClock - this.hitAt < 0.4) return;
    const fromHome = Math.hypot(this.ball.xz.x - HOME.x, this.ball.xz.z - HOME.z);
    for (const f of this.fielders) {
      if (fromHome < HIT_TRAVEL) continue;
      const d = f.distTo(this.ball.xz);
      const y = this.ball.mesh.position.y;
      const near = d < CATCH_RADIUS;
      if (!near || y > 11) continue;
      const airCatch = !this.bounced && y > 2.4;
      const pickup = this.bounced || y < 6;
      if (airCatch || pickup) {
        this.ball.hold(f);
        f.chaseBall = false;
        f.target = null;
        this.marker.visible = false;
        this.select(f);
        this.fieldedBy = f.positionId;
        this.fieldedAt = this.playClock;
        this.awardScore("pickup");
        if (airCatch && this.scenario?.hit.kind === "fly") {
          this.caughtFly = true;
          this.recordOut("home", this.batter);
          this.beep(880, 0.1);
        } else {
          this.beep(520, 0.06);
        }
        return;
      }
    }
  }

  private tryCompleteThrow() {
    if (this.ball.mode !== "throw" || !this.throwBase) return;
    const bag = BASES[this.throwBase];
    const d = Math.hypot(this.ball.mesh.position.x - bag.x, this.ball.mesh.position.z - bag.z);
    if (d > 8) return;
    const cover = covering(this.fielders, this.throwBase, 10);
    if (cover) {
      this.ball.hold(cover);
      this.noteThrow(this.throwBase);
      this.select(cover);
      this.beep(700, 0.08);
      return;
    }
    const coming = this.fielders.find((f) => f.covering === this.throwBase);
    if (coming) {
      this.ball.mesh.position.set(bag.x, 3.2, bag.z);
      this.ball.velocity.set(0, 0, 0);
      return;
    }
    this.ball.mode = "inPlay";
    this.ball.velocity.set(0, 0, 0);
    this.ball.mesh.position.set(bag.x, 0.3, bag.z);
  }

  private advanceRunners() {
    for (const r of this.runners) {
      if (!r.runnerDest || !r.target) continue;
      const bag = BASES[r.runnerDest];
      if (r.distTo(bag) < 2.2) {
        r.target = null;
        r.reachedBase = true;
        r.mesh.position.set(bag.x, 0, bag.z);
        if (r.runnerDest === "home") {
          r.scored = true;
          r.onBase = "home";
          r.mesh.visible = false;
        } else if (r.runnerDest) {
          r.onBase = r.runnerDest;
          r.faceBase(r.runnerDest);
        }
        if (!r.called) {
          r.called = true;
          this.hud.showCall("safe");
          this.beep(720, 0.12);
        }
      }
    }
  }

  private batterIsOut(): boolean {
    if (this.caughtFly) return true;
    const batter = this.batter;
    return Boolean(batter && batter.called && batter.mesh.visible === false);
  }

  /** Off the bag they legally occupy (or, for the batter, off home). */
  private runnerOffBag(r: Player): boolean {
    if (r.reachedBase || r.mesh.visible === false || r.scored) return false;
    if (r.onBase) return r.distTo(BASES[r.onBase]) > 3.2;
    return true;
  }

  private tryForceAndTag() {
    if (this.ball.mode !== "held" || !this.ball.holder) return;
    const forces = forceBases(this.occupancy, this.batterIsOut());
    for (const r of this.runners) {
      if (r.reachedBase || !r.runnerDest || r.mesh.visible === false) continue;
      const dest = r.runnerDest;
      if (!forces.has(dest)) continue;
      if (holderAtBase(this.ball, dest, 5.5)) {
        this.recordOut(dest, r);
      }
    }
    for (const r of this.runners) {
      if (!this.runnerOffBag(r)) continue;
      if (this.ball.holder.distTo(r.xz) < 2.8) {
        this.recordOut(r.runnerDest, r);
      }
    }
  }

  private updateHints() {
    this.diamond.clearGlows();
    if (this.phase !== "ballInPlay") return;
    const holding = this.fielders.some((f) => f.hasBall);
    if (holding) {
      for (const id of Object.keys(BASES) as BaseId[]) {
        this.diamond.setGlow(id, 0.35, 0xffffff);
      }
    }
    if (this.hintsOn && this.scenario?.expected.throwTo) {
      this.diamond.setGlow(this.scenario.expected.throwTo, 1.35, 0xffc107);
    }
    if (this.hintsOn && this.scenario?.expected.catchFly && this.ball.mode === "inPlay") {
      const aim = this.scenario.hit.target;
      this.marker.visible = true;
      this.marker.position.set(aim.x, 0.07, aim.z);
      (this.marker.material as THREE.ShaderMaterial).uniforms.uOpacity.value = 0.7;
    }
  }

  private cleanupPlayFx() {
    this.select(null);
    this.hovered?.setHovered(false);
    this.hovered = null;
    for (const f of this.fielders) {
      f.setSelected(false);
      f.setHovered(false);
      resetKidFx(f.mesh);
    }
    this.marker.visible = false;
    const mark = this.marker.material as THREE.ShaderMaterial;
    if (mark.uniforms.uOpacity) mark.uniforms.uOpacity.value = 0;
    this.path.visible = false;
    const pathMat = this.path.material as THREE.ShaderMaterial;
    if (pathMat.uniforms.uOpacity) pathMat.uniforms.uOpacity.value = 0;
    this.diamond.clearGlows();
    this.hud.clearCall();
    this.hud.setSelected(null);
  }

  private returnToPositions() {
    for (const f of this.fielders) {
      f.chaseBall = false;
      f.covering = undefined;
      if (f.hasBall) {
        f.target = null;
        continue;
      }
      const spot = FIELDER_SPOTS[f.positionId!];
      if (f.distTo(spot) > 4) f.target = new THREE.Vector3(spot.x, 0, spot.z);
      else f.target = null;
    }
  }

  private finishPlay(forced?: PlayGrade) {
    if (this.phase === "resolving" || this.phase === "idle") return;
    this.phase = "resolving";
    this.returnToPositions();
    this.cleanupPlayFx();
    this.resolveAt = this.playClock + 2.8;
    const grade = forced ?? this.grade();
    if (!this.scenario || grade === "none") {
      this.hud.setPlayIcon("play");
      return;
    }
    const line =
      grade === "correct"
        ? this.outs.length >= 3
          ? "Triple play! Around the horn — that's as good as it gets."
          : this.outs.length >= 2
            ? "Double play! You got the force and kept going — that's baseball."
            : this.scenario.coachCorrect
        : grade === "partial"
          ? this.scenario.coachPartial
          : this.scenario.coachWrong;
    this.hud.setCoach(line);
    this.hud.setPlayIcon("play");
    this.diamond.clearGlows();
  }

  private noteThrow(base: BaseId | null | undefined) {
    if (!base) return;
    this.throwTo = base;
    if (!this.throws.includes(base)) this.throws.push(base);
  }

  private noteOut(base: BaseId | undefined) {
    if (!base) return;
    this.outAt = base;
    this.outs.push(base);
  }

  private awardScore(event: keyof typeof SCORE_VALUES) {
    this.score = awardScore(this.score, event);
    this.hud.setScore(this.score);
  }

  private recordOut(base: BaseId | undefined, runner?: Player | null) {
    if (runner) {
      if (runner.called && runner.mesh.visible === false) return;
      runner.called = true;
      runner.mesh.visible = false;
      runner.target = null;
      runner.reachedBase = true;
    }
    const beforeOuts = this.outs.length;
    this.noteOut(base);
    this.awardScore("out");
    if (this.outs.length >= 2 && beforeOuts === 1) this.awardScore("doublePlay");
    if (this.outs.length >= 3 && beforeOuts === 2) this.awardScore("triplePlay");
    if (this.outs.length >= 3) this.hud.showCall("triple");
    else if (this.outs.length >= 2) this.hud.showCall("double");
    else this.hud.showCall("out");
    this.beep(240, 0.14);
  }

  private grade(): PlayGrade {
    const exp = this.scenario?.expected;
    if (!exp) return "none";
    if (exp.catchFly) return this.caughtFly ? "correct" : this.fieldedBy ? "partial" : "wrong";
    const rightThrow =
      !exp.throwTo ||
      this.throws.includes(exp.throwTo) ||
      this.outs.includes(exp.throwTo) ||
      this.throwTo === exp.throwTo ||
      this.outAt === exp.throwTo;
    const rightCover =
      !exp.cover ||
      this.fielders.some((f) => f.positionId === exp.cover && f.covering === exp.throwTo) ||
      (exp.throwTo && covering(this.fielders, exp.throwTo, 6));
    if (rightThrow && (this.outs.length > 0 || this.outAt) && rightCover) return "correct";
    if (this.fieldedBy && !rightThrow) return "partial";
    if (this.fieldedBy) return "partial";
    return "wrong";
  }

  private syncFx() {
    this.diamond.tick(this.elapsed);
    for (const f of this.fielders) {
      if ((!f.target && !f.chaseBall && !f.hasBall && (this.phase === "idle" || this.phase === "pitching")) || this.phase === "resolving") {
        f.lookAt(HOME.x, HOME.z);
      }
      faceCamera(f.mesh, this.rig.camera);
    }
    for (const p of this.runners) faceCamera(p.mesh, this.rig.camera);
    const mats: THREE.ShaderMaterial[] = [];
    const pushMat = (obj: THREE.Object3D | undefined) => {
      const mesh = obj as THREE.Mesh | undefined;
      if (mesh?.material && (mesh.material as THREE.ShaderMaterial).uniforms) {
        mats.push(mesh.material as THREE.ShaderMaterial);
      }
    };
    for (const f of this.fielders) {
      pushMat(f.mesh.getObjectByName("catchRing"));
      pushMat(f.mesh.getObjectByName("selectSwirl"));
    }
    mats.push(this.marker.material as THREE.ShaderMaterial);
    mats.push(this.path.material as THREE.ShaderMaterial);
    for (const m of mats) {
      if (m.uniforms?.uTime) m.uniforms.uTime.value = this.elapsed;
    }

    if (this.selected?.target) {
      const a = this.selected.xz;
      const b = this.selected.target;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz);
      this.path.visible = len > 1;
      this.path.position.set(a.x, 0.1, a.z);
      this.path.rotation.set(-Math.PI / 2, 0, Math.atan2(-dz, dx));
      const farW = CATCH_RADIUS * 2;
      this.path.scale.set(len, farW, 1);
      const mat = this.path.material as THREE.ShaderMaterial;
      if (mat.uniforms.uApex) mat.uniforms.uApex.value = Math.min(0.35, 2.4 / farW);
    } else {
      this.path.visible = false;
    }
  }

  private beep(freq: number, dur: number) {
    if (this.muted) return;
    try {
      this.audio ??= new AudioContext();
      const ctx = this.audio;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "square";
      g.gain.value = 0.04;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      /* ignore */
    }
  }
}
