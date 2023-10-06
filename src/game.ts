import { Application, Sprite } from "pixi.js";

const app = new Application({
  background: "#1099bb",
  resizeTo: window,
  view: document.getElementById("game-canvas") as HTMLCanvasElement,
});
const cherry = Sprite.from("cherry.png");
app.stage.addChild(cherry);

import("@dimforge/rapier2d").then((RAPIER) => {
  let world = new RAPIER.World({ x: 0.0, y: -9.81 });

  let groundColliderDesc = RAPIER.ColliderDesc.cuboid(5.0, 0.1);
  world.createCollider(groundColliderDesc);

  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0.0, 1.0);
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 0.5);
  const collider = world.createCollider(colliderDesc, rigidBody);

  app.ticker.add((delta) => {
    world.step();
    const position = rigidBody.translation();
    cherry.x = position.x * 100;
    cherry.y = position.y * 100;
  });
});

document.body.appendChild(app.view as unknown as Node);
