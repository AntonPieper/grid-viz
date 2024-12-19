import { Tile, SelectedTool } from "./types";
import { GRID_SIZE } from "./constants";

export function updatePlacementPreview(
  selectedTool: SelectedTool,
  view: HTMLCanvasElement,
  offsetX: number,
  offsetY: number,
  scale: number
): Tile | null {
  if (!selectedTool.type) return null;

  // Calculate world center based on scale
  const worldCenterX = view.width / 2 / scale + offsetX;
  const worldCenterY = view.height / 2 / scale + offsetY;

  const gridCenterX = Math.floor(
    worldCenterX / GRID_SIZE - selectedTool.size / 2
  );
  const gridCenterY = Math.floor(
    worldCenterY / GRID_SIZE - selectedTool.size / 2
  );

  return {
    x: gridCenterX,
    y: gridCenterY,
    type: selectedTool.type,
    size: selectedTool.size,
  };
}

export function isTileSpaceFree(tile: Tile, placedTiles: Tile[]): boolean {
  return !placedTiles.some(
    (existing) =>
      tile.x < existing.x + existing.size &&
      tile.x + tile.size > existing.x &&
      tile.y < existing.y + existing.size &&
      tile.y + tile.size > existing.y
  );
}

export function canPlaceTile(tile: Tile | null, placedTiles: Tile[]): boolean {
  if (!tile) return false;
  return isTileSpaceFree(tile, placedTiles);
}

export function finalizeTilePlacement(
  previewTile: Tile | null,
  placedTiles: Tile[],
  bearTrapPositionRef: { current: { x: number; y: number } | null }
): void {
  if (previewTile && isTileSpaceFree(previewTile, placedTiles)) {
    if (previewTile.type === "bear_trap") {
      bearTrapPositionRef.current = {
        x: previewTile.x + 1.5,
        y: previewTile.y + 1.5,
      };
    }
    placedTiles.push(previewTile);
  }
}
