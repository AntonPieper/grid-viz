// src/Controller.ts
import { AppState } from "./AppState";
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
import { Tile, TileType, Position, NameAssignments } from "./types";
import { GRID_SIZE } from "./constants";
import { Container, FederatedPointerEvent } from "pixi.js";

export class Controller {
  private dragging = false;
  private lastPointerPos: { x: number; y: number } = { x: 0, y: 0 };
  private cameraScale: number = 1; // Initialize scale

  constructor(
    private state: AppState,
    private cityNameAssigner: CityNameAssigner,
    private configurationManager: ConfigurationManager,
    private modalManager: ModalManager,
    private toolbox: Toolbox,
    private placementControls: PlacementControls,
    private view: HTMLCanvasElement,
    private renderCallback: () => void,
    private cameraContainer: Container // Camera container from Renderer
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
    this.updateNameAssignments();
    this.renderCallback();
  };

  startPlacementMode(): void {
    this.state.isInPlacementMode = true;
    this.state.previewTile = updatePlacementPreview(
      this.state.selectedTool,
      this.view,
      this.state.offset.x,
      this.state.offset.y,
      this.cameraScale // Pass scale
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
      this.state.cityNames = this.state.cityNames.filter(
        (name) => name.trim() !== ""
      );
      this.updateNameAssignments();
      this.renderCallback();
      this.cancelPlacementMode();
    }
  }

  jumpToTileForEditing(tile: Tile, index: number): void {
    this.state.placedTiles.splice(index, 1);
    const width = this.view.width;
    const height = this.view.height;
    this.state.offset.x =
      tile.x * GRID_SIZE - width / 2 + (tile.size * GRID_SIZE) / 2;
    this.state.offset.y =
      tile.y * GRID_SIZE - height / 2 + (tile.size * GRID_SIZE) / 2;
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
    const configName = (
      document.getElementById("configName") as HTMLInputElement
    ).value.trim();
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
    const configList = document.getElementById(
      "configList"
    ) as HTMLSelectElement;
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

      const width = this.view.width;
      const height = this.view.height;
      if (this.state.bearTrapPosition) {
        this.state.offset.x =
          (this.state.bearTrapPosition.x - width / (2 * GRID_SIZE)) * GRID_SIZE;
        this.state.offset.y =
          (this.state.bearTrapPosition.y - height / (2 * GRID_SIZE)) *
          GRID_SIZE;
      }

      (document.getElementById("cityNamesInput") as HTMLTextAreaElement).value =
        this.state.cityNames.join("\n");
      this.updateNameAssignments();
      this.renderCallback();
    }
  }

  deleteConfiguration(): void {
    const configList = document.getElementById(
      "configList"
    ) as HTMLSelectElement;
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
    const configList = document.getElementById(
      "configList"
    ) as HTMLSelectElement;
    configList.innerHTML =
      '<option value="">-- Select Configuration --</option>';
    const configs = this.configurationManager.listConfigurations();
    configs.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      configList.appendChild(option);
    });
  }

  // Pixi pointer events
  onPointerDown(e: FederatedPointerEvent): void {
    this.dragging = true;
    const globalPos = e.data.global;
    this.lastPointerPos = { x: globalPos.x, y: globalPos.y };
    this.state.dragState.dragDistance = 0;
  }

  onPointerMove(e: FederatedPointerEvent): void {
    if (this.dragging) {
      const globalPos = e.data.global;
      const deltaX = globalPos.x - this.lastPointerPos.x;
      const deltaY = globalPos.y - this.lastPointerPos.y;

      // Update offset based on camera scale
      this.state.offset.x -= deltaX / this.cameraScale;
      this.state.offset.y -= deltaY / this.cameraScale;

      this.lastPointerPos = { x: globalPos.x, y: globalPos.y };

      if (this.state.isInPlacementMode) {
        this.updatePreviewTilePosition();
      }

      this.renderCallback();
    }
  }

  onPointerUp(e: FederatedPointerEvent): void {
    if (this.dragging) {
      this.dragging = false;
      if (this.state.dragState.dragDistance < this.state.dragThreshold) {
        // A click occurred
        const localPos = e.data.getLocalPosition(this.cameraContainer);
        const gridX = Math.floor(localPos.x / GRID_SIZE);
        const gridY = Math.floor(localPos.y / GRID_SIZE);

        if (this.state.selectedTool.type === "eraser") {
          this.removeTileAt(gridX, gridY);
          return;
        }

        if (!this.state.isInPlacementMode) {
          // Check if clicked on an existing tile
          for (let i = 0; i < this.state.placedTiles.length; i++) {
            const tile = this.state.placedTiles[i];
            if (
              gridX >= tile.x &&
              gridX < tile.x + tile.size &&
              gridY >= tile.y &&
              gridY < tile.y + tile.size
            ) {
              this.jumpToTileForEditing(tile, i);
              return;
            }
          }
        }
      }
    }
  }

  updatePreviewTilePosition(): void {
    if (this.state.isInPlacementMode) {
      this.state.previewTile = updatePlacementPreview(
        this.state.selectedTool,
        this.view,
        this.state.offset.x,
        this.state.offset.y,
        this.cameraScale // Pass scale
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

  /**
   * Implement zoom functionality by adjusting cameraScale and applying to cameraContainer.
   */
  handleZoom(delta: number): void {
    const newScale = Math.min(Math.max(this.cameraScale + delta, 0.5), 3); // Clamp between 0.5x and 3x
    if (newScale !== this.cameraScale) {
      this.cameraScale = newScale;
      this.renderCallback();
    }
  }
}
