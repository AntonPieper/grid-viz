import { Tile, Position, NameAssignments } from "./types";
import { calculateDistance } from "./utils";

export class CityNameAssigner {
  assignNames(
    placedTiles: Tile[],
    cityNames: string[],
    bearTrapPosition: Position | null
  ): NameAssignments {
    const assignments: NameAssignments = {};
    if (!bearTrapPosition) return assignments;

    const cities = placedTiles.filter((tile) => tile.type === "city");
    cities.sort((a, b) => {
      const distA = calculateDistance(
        a.x + 1,
        a.y + 1,
        bearTrapPosition.x,
        bearTrapPosition.y
      );
      const distB = calculateDistance(
        b.x + 1,
        b.y + 1,
        bearTrapPosition.x,
        bearTrapPosition.y
      );
      return distA - distB;
    });

    cities.forEach((city, index) => {
      if (index < cityNames.length) {
        assignments[`${city.x},${city.y}`] = cityNames[index];
      }
    });

    return assignments;
  }
}
