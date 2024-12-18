import { Tile, SelectedTool } from "./types";
import { GRID_SIZE } from "./constants";

export interface DragState {
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragDistance: number;
}

export function handlePointerDown(e: PointerEvent, dragState: DragState): void {
  dragState.isDragging = true;
  dragState.dragStartX = e.clientX;
  dragState.dragStartY = e.clientY;
  dragState.dragDistance = 0;
}

export function handlePointerMove(
  e: PointerEvent,
  dragState: DragState,
  offset: { x: number; y: number },
  redrawScene: () => void,
  updatePreview: () => void,
  isInPlacementMode: boolean
): void {
  if (dragState.isDragging) {
    const deltaX = e.clientX - dragState.dragStartX;
    const deltaY = e.clientY - dragState.dragStartY;
    dragState.dragDistance += Math.hypot(deltaX, deltaY);

    offset.x -= deltaX;
    offset.y -= deltaY;
    dragState.dragStartX = e.clientX;
    dragState.dragStartY = e.clientY;

    if (isInPlacementMode) updatePreview();
    redrawScene();
  }
}

export function handlePointerUp(
  e: PointerEvent,
  dragState: DragState,
  threshold: number,
  offset: { x: number; y: number },
  selectedTool: SelectedTool,
  placedTiles: Tile[],
  isInPlacementMode: boolean,
  attemptEditingTile: (tile: Tile, index: number) => void,
  removeTileAt: (gx: number, gy: number) => void
): void {
  dragState.isDragging = false;
  if (dragState.dragDistance < threshold) {
    const gridX = Math.floor((e.clientX + offset.x) / GRID_SIZE);
    const gridY = Math.floor((e.clientY + offset.y) / GRID_SIZE);
    if (selectedTool.type === "eraser") {
      removeTileAt(gridX, gridY);
      return;
    }

    if (!isInPlacementMode) {
      for (let i = 0; i < placedTiles.length; i++) {
        const tile = placedTiles[i];
        if (
          gridX >= tile.x &&
          gridX < tile.x + tile.size &&
          gridY >= tile.y &&
          gridY < tile.y + tile.size
        ) {
          attemptEditingTile(tile, i);
          return;
        }
      }
    }
  }
}
