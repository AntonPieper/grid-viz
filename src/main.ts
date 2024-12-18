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
import { AppState } from "./appState";
import { Controller } from "./controller";
import { Renderer } from "./Renderer";
import { PixiApplicationManager } from "./PixiApplicationManager";

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

const toolbox = new Toolbox("toolbox", (tool) => controller.onToolSelect(tool));
const placementControls = new PlacementControls();

// The Renderer now takes a Pixi container (stage)
const renderer = new Renderer(pixiApp.stage);

function render() {
  renderer.render(
    state.offset.x,
    state.offset.y,
    state.placedTiles,
    state.previewTile,
    state.bearTrapPosition,
    state.nameAssignments,
    pixiApp.renderer.width,
    pixiApp.renderer.height
  );
  if (state.isInPlacementMode) {
    placementControls.updateConfirmState(
      state.previewTile !== null && configurationManager !== null
    );
  }
}

const controller = new Controller(
  state,
  cityNameAssigner,
  configurationManager,
  modalManager,
  toolbox,
  placementControls,
  // The notion of "canvas" is replaced by the pixiApp.view but controller doesn't need direct canvas now
  // We only need screen dimensions for calculations, which we get from pixiApp.renderer
  // We'll pass a dummy element since controller only uses offset and the old references:
  pixiApp.view as HTMLCanvasElement,
  render
);

configureNamesBtn.addEventListener("click", () => {
  modalManager.show();
});

saveConfigBtn.addEventListener("click", () => controller.saveConfiguration());
loadConfigBtn.addEventListener("click", () => controller.loadConfiguration());
deleteConfigBtn.addEventListener("click", () =>
  controller.deleteConfiguration()
);

// Pointer events on pixi's view
// Convert them to global events for simplicity
pixiApp.view.addEventListener("pointerdown", (e) =>
  controller.handlePointerDown(e)
);
pixiApp.view.addEventListener("pointermove", (e) =>
  controller.handlePointerMove(e)
);
pixiApp.view.addEventListener("pointerup", (e) =>
  controller.handlePointerUp(e)
);
pixiApp.view.addEventListener(
  "pointerout",
  () => (state.dragState.isDragging = false)
);

controller.refreshConfigList();
render();
