export type RgbColor = { r: number; g: number; b: number };

export type TileType =
  | "bear_trap"
  | "headquarter"
  | "city"
  | "banner"
  | "resource"
  | "eraser";

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  size: number;
}

export interface SelectedTool {
  type: TileType | null;
  size: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface NameAssignments {
  [coords: string]: string;
}
