const CELL_PREFIX = "cell";

function toRounded(value: number, precision: number): string {
  return value.toFixed(precision);
}

function parseCell(cell: string): { precision: 3 | 4 | 5; lat: number; lng: number } | null {
  const parts = cell.split(":");
  if (parts.length !== 4 || parts[0] !== CELL_PREFIX) {
    return null;
  }

  const precision = Number(parts[1]);
  const lat = Number(parts[2]);
  const lng = Number(parts[3]);

  if ((precision !== 3 && precision !== 4 && precision !== 5) || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }

  return {
    precision,
    lat,
    lng
  };
}

export function geoCell(lat: number, lng: number, precision: 3 | 4 | 5 = 3): string {
  return `${CELL_PREFIX}:${precision}:${toRounded(lat, precision)}:${toRounded(lng, precision)}`;
}

export function neighborCells(cell: string): string[] {
  const parsed = parseCell(cell);
  if (!parsed) {
    return [];
  }

  const step = Number(`1e-${parsed.precision}`);
  const neighbors: string[] = [];

  for (const latOffset of [-1, 0, 1]) {
    for (const lngOffset of [-1, 0, 1]) {
      if (latOffset === 0 && lngOffset === 0) {
        continue;
      }

      neighbors.push(geoCell(parsed.lat + latOffset * step, parsed.lng + lngOffset * step, parsed.precision));
    }
  }

  return neighbors;
}
