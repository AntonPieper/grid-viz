import { Tile, NameAssignments, Position } from "./types";
import {
  GRID_SIZE,
  BANNER_ZONE_COLORS,
  DEFAULT_COLOR_SCALE_MIN,
  DEFAULT_COLOR_SCALE_MAX,
} from "./constants";
import { calculateDistance, createKey } from "./utils";
import { computeBannerZones } from "./bannerZones";
import { Container, Graphics, Text, TextStyle } from "pixi.js";

export class Renderer {
  private stage: Container;
  private rootContainer: Container;
  private gridContainer: Container;
  private tilesContainer: Container;

  constructor(stage: Container) {
    this.stage = stage;
    // rootContainer will simulate the camera by adjusting its position
    this.rootContainer = new Container();
    this.stage.addChild(this.rootContainer);

    this.gridContainer = new Container();
    this.tilesContainer = new Container();

    this.rootContainer.addChild(this.gridContainer);
    this.rootContainer.addChild(this.tilesContainer);
  }

  render(
    offsetX: number,
    offsetY: number,
    placedTiles: Tile[],
    previewTile: Tile | null,
    bearTrapPosition: Position | null,
    nameAssignments: NameAssignments,
    screenWidth: number,
    screenHeight: number
  ): void {
    // Clear containers
    this.gridContainer.removeChildren();
    this.tilesContainer.removeChildren();

    // Adjust camera (rootContainer position)
    this.rootContainer.x = -offsetX;
    this.rootContainer.y = -offsetY;

    const gridGraphics = new Graphics();
    gridGraphics.lineStyle(1, 0xdddddd, 1);

    const startCol = Math.floor(offsetX / GRID_SIZE);
    const startRow = Math.floor(offsetY / GRID_SIZE);
    const endCol = startCol + Math.ceil(screenWidth / GRID_SIZE) + 1;
    const endRow = startRow + Math.ceil(screenHeight / GRID_SIZE) + 1;

    // Draw grid lines
    for (let col = startCol; col < endCol; col++) {
      const x = col * GRID_SIZE;
      gridGraphics.moveTo(x, 0);
      gridGraphics.lineTo(x, screenHeight + offsetY);
    }

    for (let row = startRow; row < endRow; row++) {
      const y = row * GRID_SIZE;
      gridGraphics.moveTo(0, y);
      gridGraphics.lineTo(screenWidth + offsetX, y);
    }

    this.gridContainer.addChild(gridGraphics);

    const temporaryTiles = [...placedTiles];
    if (previewTile && previewTile.type === "banner") {
      temporaryTiles.push(previewTile);
    }

    const zones = computeBannerZones(temporaryTiles);

    this.drawBannerZonesOverlay(
      zones,
      offsetX,
      offsetY,
      screenWidth,
      screenHeight
    );

    // Draw placed tiles
    for (const tile of placedTiles) {
      this.drawSingleTile(
        tile,
        false,
        zones,
        bearTrapPosition,
        nameAssignments
      );
    }

    // Draw preview tile
    if (previewTile) {
      this.drawSingleTile(
        previewTile,
        true,
        zones,
        bearTrapPosition,
        nameAssignments
      );
    }
  }

  private drawBannerZonesOverlay(
    zones: Set<string>[],
    offsetX: number,
    offsetY: number,
    screenWidth: number,
    screenHeight: number
  ) {
    const zoneGraphics = new Graphics();
    const drawnCells = new Set<string>();

    zones.forEach((zone, index) => {
      const colorStr = BANNER_ZONE_COLORS[index % BANNER_ZONE_COLORS.length];
      const color = this.colorStringToHex(colorStr);
      zoneGraphics.beginFill(color, 0.2);
      for (const key of zone) {
        const [zx, zy] = key.split(",").map(Number);
        const rx = zx * GRID_SIZE;
        const ry = zy * GRID_SIZE;
        const cellKey = `${rx},${ry}`;
        if (!drawnCells.has(cellKey)) {
          drawnCells.add(cellKey);
          zoneGraphics.drawRect(rx, ry, GRID_SIZE, GRID_SIZE);
        }
      }
      zoneGraphics.endFill();
    });

    this.tilesContainer.addChild(zoneGraphics);
  }

  private drawSingleTile(
    tile: Tile,
    isPreview: boolean,
    zones: Set<string>[],
    bearTrapPosition: Position | null,
    nameAssignments: NameAssignments
  ): void {
    const size = tile.size * GRID_SIZE;
    const x = tile.x * GRID_SIZE;
    const y = tile.y * GRID_SIZE;

    const tileGraphics = new Graphics();

    let fillColor = this.getTileFillColor(tile.type);
    let distanceLabel = "";

    if (tile.type === "city" && bearTrapPosition) {
      const cityCenterX = tile.x + tile.size / 2;
      const cityCenterY = tile.y + tile.size / 2;
      const dist = calculateDistance(
        cityCenterX,
        cityCenterY,
        bearTrapPosition.x,
        bearTrapPosition.y
      );
      fillColor = this.interpolateRGB(
        [0, 255, 0],
        [255, 0, 0],
        DEFAULT_COLOR_SCALE_MIN,
        DEFAULT_COLOR_SCALE_MAX,
        dist
      );
      distanceLabel = `${dist.toFixed(2)} tiles`;
    }

    const color = isPreview ? 0x0000ff : this.rgbStringToHex(fillColor);
    const alpha = isPreview ? 0.3 : 1.0;
    tileGraphics.beginFill(color, alpha);
    tileGraphics.drawRect(x, y, size, size);
    tileGraphics.endFill();

    // Territory border
    const fullyInside = this.isTileFullyInAnyZone(tile, zones);
    const territoryColor = this.getTerritoryColorForTile(tile, zones);
    tileGraphics.lineStyle(fullyInside ? 4 : 2, territoryColor ?? 0x000000, 1);
    tileGraphics.drawRect(x, y, size, size);

    if (!fullyInside) {
      // Draw X
      tileGraphics.lineStyle(2, 0xff0000, 1);
      tileGraphics.moveTo(x, y);
      tileGraphics.lineTo(x + size, y + size);
      tileGraphics.moveTo(x + size, y);
      tileGraphics.lineTo(x, y + size);
    }

    this.tilesContainer.addChild(tileGraphics);

    // Add label text
    const label = this.getTileLabel(tile, nameAssignments);
    this.createLabel(label, x + size / 2, y + size / 2, 16);
    if (tile.type === "city") {
      this.createLabel(distanceLabel, x + size / 2, y + size / 2 + 10, 12);
    }
  }

  private createLabel(text: string, x: number, y: number, fontSize: number) {
    const style = new TextStyle({
      fontFamily: "Arial",
      fontSize: fontSize,
      fill: "#000000",
      align: "center",
    });

    const pixiText = new Text({ text: text, style: style });
    pixiText.anchor.set(0.5);
    pixiText.x = x;
    pixiText.y = y;
    this.tilesContainer.addChild(pixiText);
  }

  private getTileFillColor(type: Tile["type"]): string {
    switch (type) {
      case "bear_trap":
        return "rgb(248,136,136)";
      case "city":
        return "rgb(136,248,136)";
      case "banner":
        return "rgb(136,136,248)";
      case "resource":
        return "rgb(255,255,136)";
      case "headquarter":
        return "rgb(136,255,255)";
      case "eraser":
      default:
        return "rgb(204,204,204)";
    }
  }

  private isTileFullyInAnyZone(tile: Tile, zones: Set<string>[]): boolean {
    for (let dx = 0; dx < tile.size; dx++) {
      for (let dy = 0; dy < tile.size; dy++) {
        const cellKey = createKey(tile.x + dx, tile.y + dy);
        const isCovered = zones.some((zone) => zone.has(cellKey));
        if (!isCovered) return false;
      }
    }
    return true;
  }

  private getTerritoryColorForTile(
    tile: Tile,
    zones: Set<string>[]
  ): number | null {
    const key = createKey(tile.x, tile.y);
    for (let i = 0; i < zones.length; i++) {
      if (zones[i].has(key)) {
        const colorStr = BANNER_ZONE_COLORS[
          i % BANNER_ZONE_COLORS.length
        ].replace("0.2", "1.0");
        return this.rgbStringToHex(colorStr);
      }
    }
    return null;
  }

  private getTileLabel(tile: Tile, nameAssignments: NameAssignments): string {
    if (tile.type === "city")
      return nameAssignments[`${tile.x},${tile.y}`] || "City";
    if (tile.type === "banner") return "Banner";
    if (tile.type === "bear_trap") return "Bear Trap";
    if (tile.type === "resource") return "Resource";
    if (tile.type === "headquarter") return "Headquarter";
    if (tile.type === "eraser") return "Eraser";
    return tile.type;
  }

  private colorStringToHex(colorStr: string): number {
    // colorStr like "rgba(r, g, b, a)" or "rgb(r,g,b)"
    const rgbaMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!rgbaMatch) return 0x000000;
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    return (r << 16) + (g << 8) + b;
  }

  private rgbStringToHex(rgbStr: string): number {
    const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return 0x000000;
    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);
    return (r << 16) + (g << 8) + b;
  }

  private interpolateRGB(
    minColor: [number, number, number],
    maxColor: [number, number, number],
    minDist: number,
    maxDist: number,
    distance: number
  ): string {
    const ratio = Math.min(
      1,
      Math.max(0, (distance - minDist) / (maxDist - minDist))
    );
    const r = Math.round(minColor[0] + ratio * (maxColor[0] - minColor[0]));
    const g = Math.round(minColor[1] + ratio * (maxColor[1] - minColor[1]));
    const b = Math.round(minColor[2] + ratio * (maxColor[2] - minColor[2]));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
