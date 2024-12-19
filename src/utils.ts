export function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function interpolateColor(
  minColor: RgbColor,
  maxColor: RgbColor,
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

export function createKey(x: number, y: number): string {
  return `${x},${y}`;
}
