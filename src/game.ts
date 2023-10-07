import type { DebugRenderBuffers } from "@dimforge/rapier2d";
import { Application, Graphics, Sprite } from "pixi.js";
import { DebugRender } from "./debug";
import { createFruit, fruits } from "./fruits";

const app = new Application({
  background: "#1099bb",
  resizeTo: window,
  view: document.getElementById("game-canvas") as HTMLCanvasElement,
});

app.stage.scale.set(2);
app.stage.eventMode = "static";
app.stage.sortableChildren = true;

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

export type Context = {
  RAPIER: typeof import("@dimforge/rapier2d");
  world: import("@dimforge/rapier2d").World;
  app: Application;
};

import("@dimforge/rapier2d").then(async (RAPIER) => {
  const world = createWorld(RAPIER);
  const eventQueue = new RAPIER.EventQueue(true);

  const context = {
    RAPIER,
    world,
    app,
  };

  const DROP_Y = 50;

  const objects = await Promise.all(
    fruits.map((fruit) => createFruit(fruit, context)),
  );

  const objectMap = new Map();

  let i = 0;
  for (const object of objects) {
    object.rigidBody.collider(0);
    object.rigidBody.setTranslation({ x: i + 300, y: 200 }, true);
    i += object.sprite.width;
    objectMap.set(object.rigidBody.collider(0).handle, object);
  }

  app.ticker.add((delta) => {
    const x = app.renderer.events.pointer.x;
    //console.log(x);
    world.step(eventQueue);
    eventQueue.drainCollisionEvents((handle1, handle2, started) => {
      if(!started) return;
      const object1 = objectMap.get(handle1);
      const object2 = objectMap.get(handle2);
      console.log("collision", object1.name, object2.name, started);
    });

    for (const { sprite, rigidBody } of objects) {
      const position = rigidBody.translation();
      sprite.x = position.x;
      sprite.y = position.y;
      sprite.rotation = rigidBody.rotation();
    }
    debugRender.debug(world.debugRender());
  });
});

document.body.appendChild(app.view as unknown as Node);
