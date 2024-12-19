// src/Renderer.ts
import {
  Application,
  Container,
  Sprite,
  Texture,
  Text,
  TextStyle,
  Graphics,
  Rectangle,
} from "pixi.js";
import { Tile, NameAssignments, Position } from "./types";
import {
  GRID_SIZE,
  BANNER_ZONE_COLORS,
  DEFAULT_COLOR_SCALE_MIN,
  DEFAULT_COLOR_SCALE_MAX,
} from "./constants";
import { calculateDistance, createKey } from "./utils";
import { computeBannerZones } from "./bannerZones";
import { RgbColor } from "./types";

export class Renderer {
  private stage: Container;
  private cameraContainer: Container;
  private gridContainer: Container;
  private tilesContainer: Container;
  private zoneContainer: Container;
  private previewTileContainer: Container;

  // Store references to tile sprites for easy updates
  private tileMap: Map<string, Container> = new Map();

  // Preloaded textures for different tile types
  private textures: { [key: string]: Texture } = {};

  constructor(stage: Container) {
    this.stage = stage;

    // Initialize camera container
    this.cameraContainer = new Container();
    this.stage.addChild(this.cameraContainer);

    // Initialize sub-containers
    this.gridContainer = new Container();
    this.zoneContainer = new Container();
    this.tilesContainer = new Container();
    this.previewTileContainer = new Container();

    this.cameraContainer.addChild(this.gridContainer);
    this.cameraContainer.addChild(this.zoneContainer);
    this.cameraContainer.addChild(this.tilesContainer);
    this.cameraContainer.addChild(this.previewTileContainer);

    // Load and cache textures
    this.loadTextures();

    // Initialize grid
    this.initializeGrid();
  }

  /**
   * Load and cache textures for different tile types.
   */
  private loadTextures(): void {
    // For simplicity, we'll create colored textures using Graphics and generate textures from them
    const tileTypes = [
      "bear_trap",
      "headquarter",
      "city",
      "banner",
      "resource",
      "eraser",
    ];
    tileTypes.forEach((type) => {
      const graphics = new Graphics();
      graphics.beginFill(this.getTileFillColor(type));
      graphics.drawRect(0, 0, GRID_SIZE, GRID_SIZE);
      graphics.endFill();
      this.textures[type] = this.stage.app.renderer.generateTexture(graphics);
      graphics.destroy(); // Clean up
    });
  }

  /**
   * Initialize the grid using Sprite lines for better performance.
   */
  private initializeGrid(): void {
    const gridLines = new Graphics();
    gridLines.stroke({ width: 1, color: 0xdddddd });

    // Vertical lines
    for (let i = -100; i <= 100; i++) {
      // Adjust range as needed
      gridLines.moveTo(i * GRID_SIZE, -100 * GRID_SIZE);
      gridLines.lineTo(i * GRID_SIZE, 100 * GRID_SIZE);
    }

    // Horizontal lines
    for (let i = -100; i <= 100; i++) {
      // Adjust range as needed
      gridLines.moveTo(-100 * GRID_SIZE, i * GRID_SIZE);
      gridLines.lineTo(100 * GRID_SIZE, i * GRID_SIZE);
    }

    const gridTexture = this.stage.getre.generateTexture(gridLines);
    const gridSprite = new Sprite(gridTexture);
    this.gridContainer.addChild(gridSprite);

    gridLines.destroy(); // Clean up
  }

  getCameraContainer(): Container {
    return this.cameraContainer;
  }

  /**
   * Update the entire scene based on current state.
   */
  updateScene(
    offsetX: number,
    offsetY: number,
    scale: number,
    placedTiles: Tile[],
    previewTile: Tile | null,
    bearTrapPosition: Position | null,
    nameAssignments: NameAssignments,
    screenWidth: number,
    screenHeight: number
  ): void {
    // Apply transformations to cameraContainer
    this.cameraContainer.position.set(-offsetX * scale, -offsetY * scale);
    this.cameraContainer.scale.set(scale);

    // Update banner zones
    this.updateBannerZones(placedTiles, previewTile);

    // Update tiles
    this.updateTiles(
      placedTiles,
      previewTile,
      bearTrapPosition,
      nameAssignments
    );
  }

  /**
   * Update banner zones based on current tiles.
   */
  private updateBannerZones(
    placedTiles: Tile[],
    previewTile: Tile | null
  ): void {
    this.zoneContainer.removeChildren(); // Clear existing zones

    const zones = computeBannerZones([
      ...placedTiles,
      ...(previewTile && previewTile.type === "banner" ? [previewTile] : []),
    ]);

    zones.forEach((zone, index) => {
      const color = BANNER_ZONE_COLORS[index % BANNER_ZONE_COLORS.length];
      const zoneGraphics = new Graphics();
      zoneGraphics.beginFill(this.rgbToHex(color), 0.2);

      zone.forEach((key) => {
        const [x, y] = key.split(",").map(Number);
        zoneGraphics.drawRect(
          x * GRID_SIZE,
          y * GRID_SIZE,
          GRID_SIZE,
          GRID_SIZE
        );
      });

      zoneGraphics.endFill();
      this.zoneContainer.addChild(zoneGraphics);
    });
  }

  /**
   * Update tiles based on current state.
   */
  private updateTiles(
    placedTiles: Tile[],
    previewTile: Tile | null,
    bearTrapPosition: Position | null,
    nameAssignments: NameAssignments
  ): void {
    // Add or update tiles
    placedTiles.forEach((tile) => {
      const key = this.getTileKey(tile);
      if (!this.tileMap.has(key)) {
        // Create new tile container
        const tileContainer = this.createTileContainer(
          tile,
          bearTrapPosition,
          nameAssignments
        );
        this.tilesContainer.addChild(tileContainer);
        this.tileMap.set(key, tileContainer);
      } else {
        // Update existing tile
        const tileContainer = this.tileMap.get(key)!;
        this.updateTileContainer(
          tileContainer,
          tile,
          bearTrapPosition,
          nameAssignments
        );
      }
    });

    // Remove tiles that no longer exist
    const existingKeys = new Set(
      placedTiles.map((tile) => this.getTileKey(tile))
    );
    this.tileMap.forEach((container, key) => {
      if (!existingKeys.has(key)) {
        this.tilesContainer.removeChild(container);
        this.tileMap.delete(key);
      }
    });

    // Handle preview tile
    this.previewTileContainer.removeChildren();
    if (previewTile) {
      const previewContainer = this.createTileContainer(
        previewTile,
        bearTrapPosition,
        nameAssignments,
        true
      );
      this.previewTileContainer.addChild(previewContainer);
    }
  }

  /**
   * Create a tile container with interactive capabilities.
   */
  private createTileContainer(
    tile: Tile,
    bearTrapPosition: Position | null,
    nameAssignments: NameAssignments,
    isPreview: boolean = false
  ): Container {
    const size = tile.size * GRID_SIZE;
    const x = tile.x * GRID_SIZE;
    const y = tile.y * GRID_SIZE;

    const tileContainer = new Container();
    tileContainer.position.set(x, y);
    tileContainer.eventMode = "static";
    tileContainer.cursor = "pointer";

    // Define a hit area for precise interactions
    tileContainer.hitArea = new Rectangle(0, 0, size, size);

    // Tile Sprite
    const tileSprite = new Sprite(this.textures[tile.type]);
    tileSprite.width = size;
    tileSprite.height = size;

    // Apply tint based on tile type and state
    let tint = 0xffffff; // Default white
    if (tile.type === "city" && bearTrapPosition) {
      const cityCenterX = tile.x + tile.size / 2;
      const cityCenterY = tile.y + tile.size / 2;
      const dist = calculateDistance(
        cityCenterX,
        cityCenterY,
        bearTrapPosition.x,
        bearTrapPosition.y
      );
      const interpolatedColor = this.interpolateRGB(
        { r: 0, g: 255, b: 0 },
        { r: 255, g: 0, b: 0 },
        DEFAULT_COLOR_SCALE_MIN,
        DEFAULT_COLOR_SCALE_MAX,
        dist
      );
      tint = this.rgbToHex(interpolatedColor);
    } else {
      tint = this.getTileTint(tile.type);
    }

    tileSprite.tint = isPreview ? 0x0000ff : tint; // Blue tint for preview
    tileSprite.alpha = isPreview ? 0.5 : 1.0;

    tileContainer.addChild(tileSprite);

    // Territory Border using Sprite
    const borderGraphics = new Graphics();
    const zones = computeBannerZones([
      ...this.getPlacedTiles(),
      ...(isPreview && tile.type === "banner" ? [tile] : []),
    ]);
    const fullyInside = this.isTileFullyInAnyZone(tile, zones);
    const territoryColor =
      this.getTerritoryColorForTile(tile, zones) ?? 0x000000;

    borderGraphics.lineStyle(fullyInside ? 4 : 2, territoryColor);
    borderGraphics.drawRect(0, 0, size, size);

    if (!fullyInside) {
      borderGraphics.lineStyle(2, 0xff0000);
      borderGraphics.moveTo(0, 0);
      borderGraphics.lineTo(size, size);
      borderGraphics.moveTo(size, 0);
      borderGraphics.lineTo(0, size);
    }

    tileContainer.addChild(borderGraphics);

    // Add Label
    const label = this.getTileLabel(tile, nameAssignments);
    const labelText = new Text(
      label,
      new TextStyle({
        fontFamily: "Arial",
        fontSize: 16,
        fill: "#000000",
        align: "center",
      })
    );
    labelText.anchor.set(0.5);
    labelText.position.set(size / 2, size / 2);
    tileContainer.addChild(labelText);

    if (tile.type === "city") {
      const distanceLabel = this.getCityDistanceLabel(tile, bearTrapPosition);
      const distanceText = new Text(
        distanceLabel,
        new TextStyle({
          fontFamily: "Arial",
          fontSize: 12,
          fill: "#000000",
          align: "center",
        })
      );
      distanceText.anchor.set(0.5);
      distanceText.position.set(size / 2, size / 2 + 10);
      tileContainer.addChild(distanceText);
    }

    return tileContainer;
  }

  /**
   * Update an existing tile container.
   */
  private updateTileContainer(
    tileContainer: Container,
    tile: Tile,
    bearTrapPosition: Position | null,
    nameAssignments: NameAssignments
  ): void {
    // Update properties or redraw as needed
    // For simplicity, we'll remove and recreate the tile
    this.tilesContainer.removeChild(tileContainer);
    const newTileContainer = this.createTileContainer(
      tile,
      bearTrapPosition,
      nameAssignments
    );
    this.tilesContainer.addChild(newTileContainer);
    this.tileMap.set(this.getTileKey(tile), newTileContainer);
  }

  /**
   * Generate a unique key for a tile based on its position and type.
   */
  private getTileKey(tile: Tile): string {
    return `${tile.x},${tile.y},${tile.type}`;
  }

  /**
   * Get tint color based on tile type.
   */
  private getTileTint(type: Tile["type"]): number {
    switch (type) {
      case "bear_trap":
        return 0xf88888; // Light Red
      case "headquarter":
        return 0x88f8f8; // Light Cyan
      case "city":
        return 0x88f888; // Light Green
      case "banner":
        return 0x8888f8; // Light Blue
      case "resource":
        return 0xffff88; // Light Yellow
      case "eraser":
      default:
        return 0xcccccc; // Light Gray
    }
  }

  /**
   * Get the label for a tile.
   */
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

  /**
   * Get distance label for city tiles.
   */
  private getCityDistanceLabel(
    tile: Tile,
    bearTrapPosition: Position | null
  ): string {
    if (!bearTrapPosition) return "";
    const cityCenterX = tile.x + tile.size / 2;
    const cityCenterY = tile.y + tile.size / 2;
    const dist = calculateDistance(
      cityCenterX,
      cityCenterY,
      bearTrapPosition.x,
      bearTrapPosition.y
    );
    return `${dist.toFixed(2)} tiles`;
  }

  /**
   * Interpolate between two RGB colors based on distance.
   */
  private interpolateRGB(
    minColor: RgbColor,
    maxColor: RgbColor,
    minDist: number,
    maxDist: number,
    distance: number
  ): RgbColor {
    const ratio = Math.min(
      1,
      Math.max(0, (distance - minDist) / (maxDist - minDist))
    );
    return {
      r: Math.round(minColor.r + ratio * (maxColor.r - minColor.r)),
      g: Math.round(minColor.g + ratio * (maxColor.g - minColor.g)),
      b: Math.round(minColor.b + ratio * (maxColor.b - minColor.b)),
    };
  }

  /**
   * Convert RgbColor to Hex number.
   */
  private rgbToHex(color: RgbColor): number {
    return (color.r << 16) + (color.g << 8) + color.b;
  }

  /**
   * Get the territory color for a tile based on banner zones.
   */
  private getTerritoryColorForTile(
    tile: Tile,
    zones: Set<string>[]
  ): RgbColor | null {
    const key = createKey(tile.x, tile.y);
    for (let i = 0; i < zones.length; i++) {
      if (zones[i].has(key)) {
        return BANNER_ZONE_COLORS[i % BANNER_ZONE_COLORS.length];
      }
    }
    return null;
  }

  /**
   * Retrieve placed tiles from tileMap.
   */
  private getPlacedTiles(): Tile[] {
    return Array.from(this.tileMap.values()).map((container) => {
      const position = container.position;
      const type = Object.keys(this.textures).find(
        (type) =>
          this.textures[type] === (container.children[0] as Sprite).texture
      );
      const size = (container.children[0] as Sprite).width / GRID_SIZE;
      return {
        x: position.x / GRID_SIZE,
        y: position.y / GRID_SIZE,
        type: type as Tile["type"],
        size: size,
      };
    });
  }
}
