import { Tile, SelectedTool, Position, NameAssignments } from "./types";
import { DragState } from "./inputHandlers";

export class AppState {
  placedTiles: Tile[] = [];
  bearTrapPosition: Position | null = null;
  selectedTool: SelectedTool = { type: null, size: 1 };
  cityNames: string[] = [];
  nameAssignments: NameAssignments = {};
  isInPlacementMode: boolean = false;
  previewTile: Tile | null = null;
  offset: { x: number; y: number } = { x: 0, y: 0 };
  dragState: DragState = {
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragDistance: 0,
  };
  dragThreshold: number = 20;
}
