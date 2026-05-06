type LatLngTuple = [number, number];

export type ZoneSuggestion = {
  id: string;
  name: string;
  polygonJson: string;
  confidence: number;
  sunLevel: "full-sun" | "partial-shade" | "shade";
  soilType: string;
  irrigationType: string;
  slope: string;
  notes: string;
};

type Point = { x: number; y: number };

function parsePolygonJson(polygonJson: string): LatLngTuple[] {
  if (!polygonJson) return [];
  try {
    const parsed = JSON.parse(polygonJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((point) => (Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : null))
      .filter((point): point is LatLngTuple => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
  } catch {
    return [];
  }
}

function dedupeConsecutive(points: Point[]): Point[] {
  if (points.length <= 1) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const prev = out[out.length - 1];
    const next = points[i];
    if (Math.abs(prev.x - next.x) < 1e-9 && Math.abs(prev.y - next.y) < 1e-9) continue;
    out.push(next);
  }
  if (out.length > 1) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.abs(first.x - last.x) < 1e-9 && Math.abs(first.y - last.y) < 1e-9) out.pop();
  }
  return out;
}

function polygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum / 2);
}

function clipHalfPlane(subject: Point[], keepInside: (point: Point) => boolean, intersect: (a: Point, b: Point) => Point): Point[] {
  if (subject.length === 0) return [];
  const output: Point[] = [];
  for (let i = 0; i < subject.length; i += 1) {
    const current = subject[i];
    const prev = subject[(i + subject.length - 1) % subject.length];
    const currentInside = keepInside(current);
    const prevInside = keepInside(prev);

    if (currentInside) {
      if (!prevInside) output.push(intersect(prev, current));
      output.push(current);
    } else if (prevInside) {
      output.push(intersect(prev, current));
    }
  }
  return dedupeConsecutive(output);
}

function clipToRect(subject: Point[], minX: number, maxX: number, minY: number, maxY: number): Point[] {
  const clipVertical = (xBoundary: number, keepLeft: boolean) =>
    (a: Point, b: Point): Point => {
      const denominator = b.x - a.x;
      if (Math.abs(denominator) < 1e-12) return { x: xBoundary, y: a.y };
      const t = (xBoundary - a.x) / denominator;
      return { x: xBoundary, y: a.y + (b.y - a.y) * t };
    };
  const clipHorizontal = (yBoundary: number, keepBelow: boolean) =>
    (a: Point, b: Point): Point => {
      const denominator = b.y - a.y;
      if (Math.abs(denominator) < 1e-12) return { x: a.x, y: yBoundary };
      const t = (yBoundary - a.y) / denominator;
      return { x: a.x + (b.x - a.x) * t, y: yBoundary };
    };

  let out = subject;
  out = clipHalfPlane(out, (p) => p.x >= minX, clipVertical(minX, false));
  out = clipHalfPlane(out, (p) => p.x <= maxX, clipVertical(maxX, true));
  out = clipHalfPlane(out, (p) => p.y >= minY, clipHorizontal(minY, false));
  out = clipHalfPlane(out, (p) => p.y <= maxY, clipHorizontal(maxY, true));
  return out;
}

function toPolygonJson(points: Point[]): string {
  const tuples = points.map((point) => [Number(point.y.toFixed(6)), Number(point.x.toFixed(6))] as LatLngTuple);
  return JSON.stringify(tuples);
}

function buildSuggestion(
  id: string,
  name: string,
  polygon: Point[],
  boundaryArea: number,
  sunLevel: ZoneSuggestion["sunLevel"],
  notes: string,
): ZoneSuggestion | null {
  const area = polygonArea(polygon);
  if (polygon.length < 3 || area <= 1e-9 || boundaryArea <= 1e-9) return null;
  const ratio = area / boundaryArea;
  if (ratio < 0.04) return null;
  const confidence = Math.max(0.5, Math.min(0.94, 0.5 + ratio * 0.9));
  return {
    id,
    name,
    polygonJson: toPolygonJson(polygon),
    confidence,
    sunLevel,
    soilType: "loam",
    irrigationType: "manual",
    slope: "flat",
    notes,
  };
}

export function suggestZonesFromBoundary(boundaryPolygonJson: string): ZoneSuggestion[] {
  const boundary = parsePolygonJson(boundaryPolygonJson);
  if (boundary.length < 3) return [];
  const points = dedupeConsecutive(boundary.map(([lat, lng]) => ({ x: lng, y: lat })));
  if (points.length < 3) return [];

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  const boundaryArea = polygonArea(points);
  if (width <= 0 || height <= 0 || boundaryArea <= 1e-9) return [];

  const frontBandHeight = Math.max(height * 0.2, height * 0.12);
  const sideBandWidth = Math.max(width * 0.18, width * 0.1);
  const centerInsetX = Math.min(width * 0.2, width * 0.28);
  const centerInsetY = Math.min(height * 0.22, height * 0.3);

  const frontBed = clipToRect(points, minX, maxX, minY, minY + frontBandHeight);
  const sideStrip = clipToRect(points, minX, minX + sideBandWidth, minY, maxY);
  const lawnCore = clipToRect(points, minX + centerInsetX, maxX - centerInsetX, minY + centerInsetY, maxY - centerInsetY);
  const backYard = clipToRect(points, minX, maxX, minY + height * 0.52, maxY);

  const rawSuggestions: Array<ZoneSuggestion | null> = [
    buildSuggestion("foundation-bed", "Foundation bed", frontBed, boundaryArea, "partial-shade", "Auto-suggested perimeter/front bed."),
    buildSuggestion("side-strip", "Side strip", sideStrip, boundaryArea, "partial-shade", "Auto-suggested narrow side access/planting strip."),
    buildSuggestion("lawn-area", "Lawn area", lawnCore, boundaryArea, "full-sun", "Auto-suggested central open area."),
    buildSuggestion("back-area", "Back area", backYard, boundaryArea, "full-sun", "Auto-suggested rear split zone."),
  ];

  return rawSuggestions.filter((s): s is ZoneSuggestion => Boolean(s)).slice(0, 4);
}
