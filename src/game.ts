import { Application } from "pixi.js";

const app = new Application({
    background: '#1099bb',
    resizeTo: window,
        view: document.getElementById('game-canvas') as HTMLCanvasElement,
});

document.body.appendChild(app.view as unknown as Node);