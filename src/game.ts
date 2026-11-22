import { Application, Container, Graphics, LINE_CAP, Sprite, Text, Texture } from "pixi.js";
import { DebugRender } from "./debug";
import { createFruit, fruits, SCALE, type Fruit } from "./fruits";

// ---------------------------------------------------------------------------
// Layout (physics/world units)
// ---------------------------------------------------------------------------
const offset = { x: 100, y: 50 };
const JAR = {
  left: offset.x + 20, // inner edge of left wall
  right: offset.x + 313 - 20, // inner edge of right wall
  top: offset.y,
  floor: offset.y + 351,
};
const DROP_Y = offset.y - 30;
const DROPPABLE = 5; // only the smallest N fruits can be dropped
const DROP_COOLDOWN = 450; // ms

// Visible region of the world that we fit to the screen.
const VIEW = {
  x: JAR.left - 34,
  y: DROP_Y - 36,
  w: JAR.right - JAR.left + 68,
  h: JAR.floor + 30 - (DROP_Y - 36),
};

const FRUIT_COLORS = [
  0xe8323c, // cherry
  0xff5a6e, // strawberry
  0x9b5de5, // grape
  0xff9f1c, // orange
  0xff7b29, // persimmon
  0xe63946, // apple
  0xffd23f, // yuzu
  0xffb3a7, // peach
  0xf9c74f, // pineapple
  0xa7e07a, // honeydew
  0x3fb950, // watermelon
];

const textures = fruits.map((f) => new Texture(f.texture));
const radiusOf = (i: number) => (fruits[i].texture.width / 2) * SCALE;

// ---------------------------------------------------------------------------
// Pixi setup
// ---------------------------------------------------------------------------
const wrap = document.getElementById("game-wrap")!;
const app = new Application({
  backgroundAlpha: 0,
  antialias: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
  resizeTo: wrap,
  view: document.getElementById("game-canvas") as HTMLCanvasElement,
});

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;

const board = new Container();
board.sortableChildren = true;
app.stage.addChild(board);

const jarBack = new Graphics();
const guide = new Graphics();
const fruitLayer = new Container();
const fxLayer = new Container();
const jarFront = new Graphics();
const debugRender = new DebugRender();
debugRender.visible = false;
jarBack.zIndex = 0;
guide.zIndex = 1;
fruitLayer.zIndex = 2;
jarFront.zIndex = 3;
fxLayer.zIndex = 4;
board.addChild(jarBack, guide, fruitLayer, jarFront, fxLayer, debugRender);

const preview = new Sprite(textures[0]);
preview.zIndex = 5;
board.addChild(preview);

drawJar();

let shake = 0;
function layout() {
  const { width, height } = app.screen;
  const s = Math.min(width / VIEW.w, height / VIEW.h) * 0.97;
  board.scale.set(s);
  board.position.set(
    (width - VIEW.w * s) / 2 - VIEW.x * s,
    (height - VIEW.h * s) / 2 - VIEW.y * s,
  );
}
layout();

function drawJar() {
  const L = JAR.left;
  const R = JAR.right;
  const T = JAR.top;
  const F = JAR.floor;
  const W = R - L;
  const H = F - T;
  const wall = 9;

  const g = jarBack;
  // soft ground shadow
  g.beginFill(0x8a4b32, 0.12);
  g.drawEllipse(L + W / 2, F + 16, W / 2 + 30, 10);
  g.endFill();
  // glass body
  g.beginFill(0xfffaf2, 0.55);
  g.drawRoundedRect(L - wall, T - 4, W + wall * 2, H + wall + 4, 26);
  g.endFill();
  // warm tint toward the bottom
  for (let i = 0; i < 6; i++) {
    g.beginFill(0xffd9b8, 0.05 + i * 0.015);
    g.drawRoundedRect(L, T + H * (0.4 + i * 0.1), W, H * (0.6 - i * 0.1), 18);
    g.endFill();
  }

  const f = jarFront;
  // outline
  f.lineStyle({ width: wall, color: 0xffffff, alpha: 0.95 });
  f.moveTo(L - wall / 2, T - 4);
  f.lineTo(L - wall / 2, F - 18);
  f.arcTo(L - wall / 2, F + wall / 2, L + 18, F + wall / 2, 24);
  f.lineTo(R - 18, F + wall / 2);
  f.arcTo(R + wall / 2, F + wall / 2, R + wall / 2, F - 18, 24);
  f.lineTo(R + wall / 2, T - 4);
  // thin caramel edge
  f.lineStyle({ width: 2.5, color: 0xd99a6c, alpha: 0.9 });
  f.moveTo(L - wall - 1, T - 4);
  f.lineTo(L - wall - 1, F - 18);
  f.arcTo(L - wall - 1, F + wall + 1, L + 18, F + wall + 1, 28);
  f.lineTo(R - 18, F + wall + 1);
  f.arcTo(R + wall + 1, F + wall + 1, R + wall + 1, F - 18, 28);
  f.lineTo(R + wall + 1, T - 4);
  f.lineStyle(0);
  // rim lips
  for (const x of [L - wall / 2, R + wall / 2]) {
    f.beginFill(0xd99a6c);
    f.drawRoundedRect(x - 9, T - 12, 18, 12, 6);
    f.endFill();
    f.beginFill(0xffffff, 0.5);
    f.drawRoundedRect(x - 6, T - 10, 8, 4, 2);
    f.endFill();
  }
  // glass highlights
  f.beginFill(0xffffff, 0.35);
  f.drawRoundedRect(L + 8, T + 24, 7, H * 0.55, 4);
  f.drawRoundedRect(L + 8, T + 24 + H * 0.55 + 10, 7, 14, 4);
  f.endFill();
  f.beginFill(0xffffff, 0.18);
  f.drawRoundedRect(R - 16, T + 40, 5, H * 0.3, 3);
  f.endFill();
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------
const scoreEl = document.getElementById("score")!;
const bestEl = document.getElementById("best")!;
const nextEl = document.getElementById("next-fruit") as HTMLImageElement;
let score = 0;
let best = Number(localStorage.getItem("watermelon-best") ?? 0);
bestEl.textContent = String(best);

function restart(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function addScore(points: number) {
  score += points;
  scoreEl.textContent = String(score);
  restart(scoreEl, "bump");
  if (score > best) {
    best = score;
    bestEl.textContent = String(best);
    localStorage.setItem("watermelon-best", String(best));
  }
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
type Particle = {
  g: Graphics | Text;
  vx: number;
  vy: number;
  life: number;
  max: number;
  gravity: number;
  spin: number;
  grow: number;
};
const particles: Particle[] = [];
const pops: { sprite: Sprite; t: number }[] = [];

function burst(x: number, y: number, index: number) {
  const color = FRUIT_COLORS[index] ?? 0xffffff;
  const r = radiusOf(index);
  const count = 10 + index * 2;

  // shockwave ring
  const ring = new Graphics();
  ring.lineStyle({ width: 3, color: 0xffffff, alpha: 0.9 });
  ring.drawCircle(0, 0, r);
  ring.position.set(x, y);
  ring.scale.set(0.6);
  fxLayer.addChild(ring);
  particles.push({ g: ring, vx: 0, vy: 0, life: 22, max: 22, gravity: 0, spin: 0, grow: 0.045 });

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * (2 + index * 0.25);
    const p = new Graphics();
    const star = Math.random() < 0.35;
    p.beginFill(star ? 0xffffff : color);
    if (star) {
      p.drawPolygon([0, -4, 1.2, -1.2, 4, 0, 1.2, 1.2, 0, 4, -1.2, 1.2, -4, 0, -1.2, -1.2]);
    } else {
      p.drawCircle(0, 0, 2 + Math.random() * 2.5);
    }
    p.endFill();
    p.position.set(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6);
    fxLayer.addChild(p);
    const life = 30 + Math.random() * 20;
    particles.push({
      g: p,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 1,
      life,
      max: life,
      gravity: 0.12,
      spin: (Math.random() - 0.5) * 0.3,
      grow: -0.01,
    });
  }

  // floating score text
  const points = ((index + 1) * (index + 2)) / 2;
  const t = new Text(`+${points}`, {
    fontFamily: "Fredoka, ui-rounded, sans-serif",
    fontSize: 14 + index,
    fontWeight: "700",
    fill: 0xffffff,
    stroke: color,
    strokeThickness: 4,
    lineJoin: "round",
  });
  t.resolution = 4;
  t.anchor.set(0.5);
  t.position.set(x, y - r * 0.4);
  fxLayer.addChild(t);
  particles.push({ g: t, vx: 0, vy: -0.8, life: 50, max: 50, gravity: 0.008, spin: 0, grow: 0 });

  if (index >= 5) shake = Math.min(10, 2 + index);
  addScore(points);
}

function popIn(sprite: Sprite) {
  sprite.scale.set(SCALE * 0.4);
  pops.push({ sprite, t: 0 });
}

function easeOutBack(t: number) {
  const c1 = 2.2;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function updateFx(delta: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= delta;
    p.vy += p.gravity * delta;
    p.g.x += p.vx * delta;
    p.g.y += p.vy * delta;
    p.g.rotation += p.spin * delta;
    p.g.scale.set(Math.max(0.01, p.g.scale.x + p.grow * delta));
    p.g.alpha = Math.min(1, (p.life / p.max) * 1.6);
    if (p.life <= 0) {
      p.g.destroy();
      particles.splice(i, 1);
    }
  }
  for (let i = pops.length - 1; i >= 0; i--) {
    const pop = pops[i];
    pop.t = Math.min(1, pop.t + delta / 14);
    if (pop.sprite.destroyed) {
      pops.splice(i, 1);
      continue;
    }
    pop.sprite.scale.set(SCALE * (0.4 + 0.6 * easeOutBack(pop.t)));
    if (pop.t >= 1) pops.splice(i, 1);
  }
  if (shake > 0) {
    shake = Math.max(0, shake - delta * 0.6);
  }
}

function drawGuide(x: number, radius: number, visible: boolean) {
  guide.clear();
  if (!visible) return;
  const top = DROP_Y + radius + 4;
  const bottom = JAR.floor - 2;
  guide.lineStyle({ width: 2, color: 0xffffff, alpha: 0.85, cap: LINE_CAP.ROUND });
  for (let y = top; y < bottom; y += 12) {
    guide.moveTo(x, y);
    guide.lineTo(x, Math.min(y + 6, bottom));
  }
  guide.lineStyle(0);
  guide.beginFill(0xffffff, 0.5);
  guide.drawEllipse(x, JAR.floor - 1, 7, 2.5);
  guide.endFill();
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function createWorld(RAPIER: typeof import("@dimforge/rapier2d")) {
  let world = new RAPIER.World({ x: 0.0, y: 98.1 * 2 });

  let ground = RAPIER.ColliderDesc.cuboid(313 / 2, 10);
  ground.setTranslation(offset.x + 313 / 2, 351 + 10 + offset.y);
  world.createCollider(ground);

  const leftWall = RAPIER.ColliderDesc.cuboid(10, 351 / 2);
  leftWall.setTranslation(10 + offset.x, 351 / 2 + offset.y);
  world.createCollider(leftWall);

  const rightWall = RAPIER.ColliderDesc.cuboid(10, 351 / 2);
  rightWall.setTranslation(313 - 10 + offset.x, 351 / 2 + offset.y);
  world.createCollider(rightWall);
  return world;
}

export type Context = {
  RAPIER: typeof import("@dimforge/rapier2d");
  world: import("@dimforge/rapier2d").World;
  app: Application;
  layer: Container;
};

import("@dimforge/rapier2d").then(async (RAPIER) => {
  const world = createWorld(RAPIER);
  const eventQueue = new RAPIER.EventQueue(true);

  const context: Context = { RAPIER, world, app, layer: fruitLayer };

  const objects: Fruit[] = [];
  const objectMap = new Map();

  let nextIndex = Math.floor(Math.random() * DROPPABLE);
  let aimX = (JAR.left + JAR.right) / 2;
  let ready = true;

  function showNext() {
    preview.texture = textures[nextIndex];
    preview.anchor.set(fruits[nextIndex].origin[0], fruits[nextIndex].origin[1]);
    preview.visible = true;
    popIn(preview);
    nextEl.src = `/${fruits[nextIndex].img}`;
    restart(nextEl, "pop");
  }

  function clampAim(x: number, index: number) {
    const r = radiusOf(index);
    return Math.max(JAR.left + r, Math.min(JAR.right - r, x));
  }

  preview.x = aimX;
  showNext();

  app.stage.on("pointermove", (e) => {
    aimX = board.toLocal(e.global).x;
  });

  app.stage.on("pointerup", (e) => {
    if (!ready) return;
    aimX = board.toLocal(e.global).x;
    const index = nextIndex;
    const newFruit = createFruit(fruits[index], context);
    newFruit.rigidBody.setTranslation({ x: clampAim(aimX, index), y: DROP_Y }, true);
    objectMap.set(newFruit.rigidBody.collider(0).handle, newFruit);
    objects.push(newFruit);

    ready = false;
    preview.visible = false;
    nextIndex = Math.floor(Math.random() * DROPPABLE);
    nextEl.src = `/${fruits[nextIndex].img}`;
    restart(nextEl, "pop");
    setTimeout(() => {
      ready = true;
      showNext();
    }, DROP_COOLDOWN);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "d") debugRender.visible = !debugRender.visible;
  });

  app.ticker.add((delta) => {
    world.step(eventQueue);
    eventQueue.drainCollisionEvents(async (handle1, handle2, started) => {
      if (!started) return;
      const object1 = objectMap.get(handle1);
      const object2 = objectMap.get(handle2);
      if (!object1 || !object2 || object1.index !== object2.index) return;

      const midpointX = (object1.rigidBody.translation().x + object2.rigidBody.translation().x) / 2;
      const midpointY = (object1.rigidBody.translation().y + object2.rigidBody.translation().y) / 2;
      const nextFruit = fruits[object1.index + 1];

      if (!nextFruit) return;
      object1.remove();
      object2.remove();
      objects.splice(objects.indexOf(object1), 1);
      objects.splice(objects.indexOf(object2), 1);
      objectMap.delete(handle1);
      objectMap.delete(handle2);

      const newFruit = createFruit(nextFruit, context);
      newFruit.rigidBody.setTranslation({ x: midpointX, y: midpointY }, true);
      objectMap.set(newFruit.rigidBody.collider(0).handle, newFruit);
      objects.push(newFruit);

      newFruit.sprite.position.set(midpointX, midpointY);
      popIn(newFruit.sprite);
      burst(midpointX, midpointY, nextFruit.index);
    });

    for (const { sprite, rigidBody } of objects) {
      const position = rigidBody.translation();
      sprite.x = position.x;
      sprite.y = position.y;
      sprite.rotation = rigidBody.rotation();
    }

    // aim preview + guide
    const x = clampAim(aimX, nextIndex);
    preview.x += (x - preview.x) * Math.min(1, 0.35 * delta);
    preview.y = DROP_Y + Math.sin(performance.now() / 260) * 1.5;
    drawGuide(preview.x, radiusOf(nextIndex), ready);

    updateFx(delta);
    layout();
    if (shake > 0) {
      board.x += (Math.random() - 0.5) * shake;
      board.y += (Math.random() - 0.5) * shake;
    }

    if (debugRender.visible) debugRender.debug(world.debugRender());
  });
});
