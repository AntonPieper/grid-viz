import { Tile } from "./types";

interface TileConfig {
  placedTiles: string;
  cityNames: string[];
}

interface TileConfigs {
  [key: string]: TileConfig;
}

export class ConfigurationManager {
  private storageKey: string = "tileConfigs";

  saveConfiguration(
    configName: string,
    placedTiles: Tile[],
    cityNames: string[]
  ): void {
    const configs: TileConfigs = this.getAllConfigurations();
    configs[configName] = {
      placedTiles: JSON.stringify(placedTiles),
      cityNames,
    };
    localStorage.setItem(this.storageKey, JSON.stringify(configs));
  }

  listConfigurations(): string[] {
    const configs: TileConfigs = this.getAllConfigurations();
    return Object.keys(configs);
  }

  loadConfiguration(
    configName: string
  ): { tiles: Tile[]; cityNames: string[] } | null {
    const configs: TileConfigs = this.getAllConfigurations();
    const config = configs[configName];
    if (config) {
      const loadedTiles: Tile[] = JSON.parse(config.placedTiles);
      return { tiles: loadedTiles, cityNames: config.cityNames };
    }
    return null;
  }

  deleteConfiguration(configName: string): void {
    const configs: TileConfigs = this.getAllConfigurations();
    delete configs[configName];
    localStorage.setItem(this.storageKey, JSON.stringify(configs));
  }

  private getAllConfigurations(): TileConfigs {
    return JSON.parse(localStorage.getItem(this.storageKey) || "{}");
  }
}
