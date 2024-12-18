import { AppState } from "./appState";
import { ConfigurationManager } from "./ConfigurationManager";
import { CityNameAssigner } from "./CityNameAssigner";
import { ModalManager } from "./ModalManager";
import { Toolbox } from "./Toolbox";
import { PlacementControls } from "./PlacementControls";
import {
  canPlaceTile,
  finalizeTilePlacement,
  updatePlacementPreview,
} from "./placement";
import {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
} from "./inputHandlers";
import { Tile, TileType } from "./types";
import { nameInput, configNameInput, configList } from "./domElements";
import { GRID_SIZE } from "./constants";

export class Controller {
  constructor(
    private state: AppState,
    private cityNameAssigner: CityNameAssigner,
    private configurationManager: ConfigurationManager,
    private modalManager: ModalManager,
    private toolbox: Toolbox,
    private placementControls: PlacementControls,
    private canvas: HTMLCanvasElement,
    private renderCallback: () => void
  ) {}

  onToolSelect = (toolSelected: { type: TileType | null; size: number }) => {
    this.state.selectedTool = toolSelected;
    if (toolSelected.type !== "eraser") {
      this.startPlacementMode();
    } else {
      this.cancelPlacementMode();
    }
  };

  onSaveCityNames = (
    cityNames: string[],
    colorMin: number,
    colorMax: number
  ) => {
    this.state.cityNames = cityNames;
    // colorMin and colorMax can be stored if needed for further logic
    this.updateNameAssignments();
    this.renderCallback();
  };

  startPlacementMode(): void {
    this.state.isInPlacementMode = true;
    this.state.previewTile = updatePlacementPreview(
      this.state.selectedTool,
      this.canvas,
      this.state.offset.x,
      this.state.offset.y
    );
    this.renderCallback();
    this.placementControls.show(
      canPlaceTile(this.state.previewTile, this.state.placedTiles),
      () => this.finalizePlacement(),
      () => this.cancelPlacementMode()
    );
  }

  cancelPlacementMode(): void {
    this.state.isInPlacementMode = false;
    this.state.previewTile = null;
    this.placementControls.hide();
    this.renderCallback();
  }

  finalizePlacement(): void {
    if (
      this.state.previewTile &&
      canPlaceTile(this.state.previewTile, this.state.placedTiles)
    ) {
      finalizeTilePlacement(this.state.previewTile, this.state.placedTiles, {
        current: this.state.bearTrapPosition,
      });
      this.state.cityNames = nameInput.value
        .split("\n")
        .map((name) => name.trim())
        .filter((name) => name !== "");
      this.updateNameAssignments();
      this.renderCallback();
      this.cancelPlacementMode();
    }
  }

  jumpToTileForEditing(tile: Tile, index: number): void {
    this.state.placedTiles.splice(index, 1);
    this.state.offset.x =
      tile.x * GRID_SIZE - this.canvas.width / 2 + (tile.size * GRID_SIZE) / 2;
    this.state.offset.y =
      tile.y * GRID_SIZE - this.canvas.height / 2 + (tile.size * GRID_SIZE) / 2;
    this.state.previewTile = { ...tile };
    this.state.isInPlacementMode = true;
    this.renderCallback();
    this.placementControls.show(
      canPlaceTile(this.state.previewTile, this.state.placedTiles),
      () => this.finalizePlacement(),
      () => this.cancelPlacementMode()
    );
  }

  removeTileAt(gridX: number, gridY: number): void {
    for (let i = 0; i < this.state.placedTiles.length; i++) {
      const tile = this.state.placedTiles[i];
      if (
        gridX >= tile.x &&
        gridX < tile.x + tile.size &&
        gridY >= tile.y &&
        gridY < tile.y + tile.size
      ) {
        this.state.placedTiles.splice(i, 1);
        this.updateNameAssignments();
        this.renderCallback();
        return;
      }
    }
  }

  saveConfiguration(): void {
    const configName = configNameInput.value.trim();
    if (!configName) {
      alert("Please enter a configuration name.");
      return;
    }
    this.configurationManager.saveConfiguration(
      configName,
      this.state.placedTiles,
      this.state.cityNames
    );
    this.refreshConfigList();
    alert(`Configuration "${configName}" saved successfully!`);
  }

  loadConfiguration(): void {
    const selectedConfig = configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to load.");
      return;
    }
    const loaded = this.configurationManager.loadConfiguration(selectedConfig);
    if (loaded) {
      this.state.placedTiles = loaded.tiles;
      this.state.cityNames = loaded.cityNames;

      const bearTrap = this.state.placedTiles.find(
        (tile) => tile.type === "bear_trap"
      );
      this.state.bearTrapPosition = bearTrap
        ? { x: bearTrap.x + 1.5, y: bearTrap.y + 1.5 }
        : null;

      if (this.state.bearTrapPosition) {
        this.state.offset.x =
          (this.state.bearTrapPosition.x -
            this.canvas.width / (2 * GRID_SIZE)) *
          GRID_SIZE;
        this.state.offset.y =
          (this.state.bearTrapPosition.y -
            this.canvas.height / (2 * GRID_SIZE)) *
          GRID_SIZE;
      }

      nameInput.value = this.state.cityNames.join("\n");
      this.updateNameAssignments();
      this.renderCallback();
    }
  }

  deleteConfiguration(): void {
    const selectedConfig = configList.value;
    if (!selectedConfig) {
      alert("Please select a configuration to delete.");
      return;
    }
    this.configurationManager.deleteConfiguration(selectedConfig);
    this.refreshConfigList();
    alert(`Configuration "${selectedConfig}" deleted successfully!`);
  }

  refreshConfigList(): void {
    configList.innerHTML =
      '<option value="">-- Select Configuration --</option>';
    const configs = this.configurationManager.listConfigurations();
    for (const name of configs) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      configList.appendChild(option);
    }
  }

  handlePointerDown(e: PointerEvent): void {
    handlePointerDown(e, this.state.dragState);
  }

  handlePointerMove(e: PointerEvent): void {
    handlePointerMove(
      e,
      this.state.dragState,
      this.state.offset,
      () => this.renderCallback(),
      () => this.updatePreviewTilePosition(),
      this.state.isInPlacementMode
    );
  }

  handlePointerUp(e: PointerEvent): void {
    handlePointerUp(
      e,
      this.state.dragState,
      this.state.dragThreshold,
      this.state.offset,
      this.state.selectedTool,
      this.state.placedTiles,
      this.state.isInPlacementMode,
      (tile: Tile, index: number) => this.jumpToTileForEditing(tile, index),
      (gx: number, gy: number) => this.removeTileAt(gx, gy)
    );
  }

  updatePreviewTilePosition(): void {
    if (this.state.isInPlacementMode) {
      this.state.previewTile = updatePlacementPreview(
        this.state.selectedTool,
        this.canvas,
        this.state.offset.x,
        this.state.offset.y
      );
      this.renderCallback();
    }
  }

  updateNameAssignments(): void {
    this.state.nameAssignments = this.cityNameAssigner.assignNames(
      this.state.placedTiles,
      this.state.cityNames,
      this.state.bearTrapPosition
    );
  }
}
