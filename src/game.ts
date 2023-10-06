import type { DebugRenderBuffers } from "@dimforge/rapier2d";
import { Application, Graphics, Sprite } from "pixi.js";
import { DebugRender } from "./debug";

const app = new Application({
  background: "#1099bb",
  resizeTo: window,
  view: document.getElementById("game-canvas") as HTMLCanvasElement,
});

app.stage.scale.set(2);

const cherry = Sprite.from("cherry.png");
cherry.anchor.set(0.5, 0.65);
app.stage.addChild(cherry);

const debugRender = new DebugRender();
app.stage.addChild(debugRender);

function createWorld(RAPIER: typeof import("@dimforge/rapier2d")) {
  let world = new RAPIER.World({ x: 0.0, y: 98.1 * 2 });

  const offset = { x: 100, y: 50 };

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

import("@dimforge/rapier2d").then((RAPIER) => {
  const world = createWorld(RAPIER);
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 0.0);
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.ball(20);
  const collider = world.createCollider(colliderDesc, rigidBody);

  rigidBody.addForce(new RAPIER.Vector2(2, 0.0), true);

  app.ticker.add((delta) => {
    world.step();
    const position = rigidBody.translation();
    cherry.x = position.x;
    cherry.y = position.y;
    cherry.rotation = rigidBody.rotation();
    debugRender.debug(world.debugRender());
  });
});

document.body.appendChild(app.view as unknown as Node);
