import { Application } from "pixi.js";

export class PixiApplicationManager {
  private app: Application;

  constructor() {
    this.app = new Application();
    document.body.appendChild(this.app.canvas);

    window.addEventListener("resize", () => this.onResize());
  }

  init() {
    return this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0xf0f0f0,
      antialias: true,
    });
  }

  private onResize(): void {
    this.app.renderer.resize(window.innerWidth, window.innerHeight);
  }

  getApp(): Application {
    return this.app;
  }
}
