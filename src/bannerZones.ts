import { Tile } from "./types";
import { createKey } from "./utils";

export function computeBannerZones(tiles: Tile[]): Set<string>[] {
  const visited = new Set<string>();
  const zones: Set<string>[] = [];

  function bfs(startTile: Tile): Set<string> {
    const queue = [{ x: startTile.x, y: startTile.y }];
    const zone = new Set<string>();

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      const key = createKey(x, y);
      if (visited.has(key)) continue;

      visited.add(key);
      zone.add(key);

      // Add nearby territory cells
      for (let dx = -3; dx <= 3; dx++) {
        for (let dy = -3; dy <= 3; dy++) {
          zone.add(createKey(x + dx, y + dy));
        }
      }

      // Enqueue neighboring banner tiles
      for (let dx = -7; dx <= 7; dx++) {
        for (let dy = -7; dy <= 7; dy++) {
          const nx = x + dx;
          const ny = y + dy;
          const neighborKey = createKey(nx, ny);
          if (
            !visited.has(neighborKey) &&
            tiles.some((t) => t.x === nx && t.y === ny && t.type === "banner")
          ) {
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    return zone;
  }

  const bannerTiles = tiles.filter((t) => t.type === "banner");
  for (const tile of bannerTiles) {
    const key = createKey(tile.x, tile.y);
    if (!visited.has(key)) {
      zones.push(bfs(tile));
    }
  }

  return zones;
}
