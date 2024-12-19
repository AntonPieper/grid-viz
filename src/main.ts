// src/main.ts
import {
  configureNamesBtn,
  saveConfigBtn,
  loadConfigBtn,
  deleteConfigBtn,
} from "./domElements";
import { Toolbox } from "./Toolbox";
import { PlacementControls } from "./PlacementControls";
import { ConfigurationManager } from "./ConfigurationManager";
import { CityNameAssigner } from "./CityNameAssigner";
import { ModalManager } from "./ModalManager";
import { AppState } from "./AppState";
import { Controller } from "./Controller";
import { Renderer } from "./Renderer";
import { PixiApplicationManager } from "./PixiApplicationManager";

// Initialize application and managers
const state = new AppState();
const cityNameAssigner = new CityNameAssigner();
const configurationManager = new ConfigurationManager();
const modalManager = new ModalManager(
  "nameModal",
  "saveNames",
  "closeModal",
  (cityNames, colorMin, colorMax) =>
    controller.onSaveCityNames(cityNames, colorMin, colorMax)
);

const pixiAppManager = new PixiApplicationManager();
await pixiAppManager.init();
const pixiApp = pixiAppManager.getApp();

// Create toolbox and placement controls
const toolbox = new Toolbox("toolbox", (tool) => controller.onToolSelect(tool));
const placementControls = new PlacementControls();

// Create renderer (Pixi)
const renderer = new Renderer(pixiApp.stage);

// Define render function
function render() {
  renderer.updateScene(
    state.offset.x,
    state.offset.y,
    controller.cameraScale, // Pass current camera scale
    state.placedTiles,
    state.previewTile,
    state.bearTrapPosition,
    state.nameAssignments,
    pixiApp.renderer.width,
    pixiApp.renderer.height
  );
  if (state.isInPlacementMode) {
    placementControls.updateConfirmState(state.previewTile !== null);
  }
}

// Initialize Controller with camera container
const controller = new Controller(
  state,
  cityNameAssigner,
  configurationManager,
  modalManager,
  toolbox,
  placementControls,
  pixiApp.view, // Pass the canvas
  render,
  renderer.getCameraContainer() // Pass cameraContainer
);

// UI events
configureNamesBtn.addEventListener("click", () => {
  modalManager.show();
});
saveConfigBtn.addEventListener("click", () => controller.saveConfiguration());
loadConfigBtn.addEventListener("click", () => controller.loadConfiguration());
deleteConfigBtn.addEventListener("click", () =>
  controller.deleteConfiguration()
);

// Enable Pixi interaction
pixiApp.stage.interactive = true; // Ensure stage is interactive
pixiApp.stage.hitArea = pixiApp.renderer.screen; // Set hit area to cover the screen

// Pixi pointer events
pixiApp.stage.on("pointerdown", (e) => controller.onPointerDown(e));
pixiApp.stage.on("pointermove", (e) => controller.onPointerMove(e));
pixiApp.stage.on("pointerup", (e) => controller.onPointerUp(e));
pixiApp.stage.on("pointerupoutside", (e) => controller.onPointerUp(e));

// Implement zooming via mouse wheel
pixiApp.view.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    controller.handleZoom(zoomDelta);
  },
  { passive: false }
);

// Initial refresh and render
controller.refreshConfigList();
render();
