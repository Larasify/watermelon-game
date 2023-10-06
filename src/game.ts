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

import("@dimforge/rapier2d").then((RAPIER) => {
  let world = new RAPIER.World({ x: 0.0, y: 98.1 * 2 });

  let groundColliderDesc = RAPIER.ColliderDesc.cuboid(10, 10);
    groundColliderDesc.setTranslation(0.0, 40.0);
  world.createCollider(groundColliderDesc);

  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 0.0);
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.ball(0.5);
  const collider = world.createCollider(colliderDesc, rigidBody);

  rigidBody.addForce(new RAPIER.Vector2(2.0, 0.0), true);

  app.ticker.add((delta) => {
    world.step();
    const position = rigidBody.translation();
    cherry.x = position.x;
    cherry.y = position.y;
    const rotation = rigidBody.rotation();
    cherry.rotation = rotation;
    debugRender.debug(world.debugRender());
  });
});


document.body.appendChild(app.view as unknown as Node);
