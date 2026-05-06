"use client";

import { useMemo, useRef, useState } from "react";
import {
  DrawingManager,
  GoogleMap,
  Polygon,
  StandaloneSearchBox,
  useJsApiLoader,
} from "@react-google-maps/api";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ZoneSuggestion } from "@/lib/zoneSuggestions";
import type { Zone } from "@/lib/types";

type LatLngTuple = [number, number];
type LatLngPoint = google.maps.LatLngLiteral;
type PolygonTarget = "boundary" | "zone";

const mapContainerStyle = { width: "100%", height: "360px" };
const defaultCenter: LatLngPoint = { lat: 39.0119, lng: -98.4842 };

const boundaryStyle: google.maps.PolygonOptions = {
  fillColor: "#16a34a",
  fillOpacity: 0.22,
  strokeColor: "#166534",
  strokeOpacity: 1,
  strokeWeight: 2,
};

const zoneDraftStyle: google.maps.PolygonOptions = {
  fillColor: "#3b82f6",
  fillOpacity: 0.2,
  strokeColor: "#1d4ed8",
  strokeOpacity: 1,
  strokeWeight: 2,
};

const savedZoneStyle: google.maps.PolygonOptions = {
  fillColor: "#6b7280",
  fillOpacity: 0.16,
  strokeColor: "#4b5563",
  strokeOpacity: 0.9,
  strokeWeight: 1.5,
};

type PropertyMapEditorProps = {
  zones: Zone[];
  suggestedZones: ZoneSuggestion[];
  activeSuggestionId: string;
  boundaryPolygonJson: string;
  zoneDraftPolygonJson: string;
  onBoundaryPolygonChange: (value: string) => void;
  onZoneDraftPolygonChange: (value: string) => void;
};

function pathToJson(path: LatLngPoint[]) {
  const rounded = path.map((point) => [Number(point.lat.toFixed(6)), Number(point.lng.toFixed(6))] as LatLngTuple);
  return JSON.stringify(rounded);
}

function parsePolygonJson(polygonJson: string): LatLngPoint[] {
  if (!polygonJson) return [];
  try {
    const parsed = JSON.parse(polygonJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((point) => (Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : null))
      .filter((point): point is LatLngTuple => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]))
      .map(([lat, lng]) => ({ lat, lng }));
  } catch {
    return [];
  }
}

function getPolygonPath(polygon: google.maps.Polygon): LatLngPoint[] {
  return polygon
    .getPath()
    .getArray()
    .map((point) => ({ lat: point.lat(), lng: point.lng() }));
}

export function PropertyMapEditor({
  zones,
  suggestedZones,
  activeSuggestionId,
  boundaryPolygonJson,
  zoneDraftPolygonJson,
  onBoundaryPolygonChange,
  onZoneDraftPolygonChange,
}: PropertyMapEditorProps) {
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [drawingTarget, setDrawingTarget] = useState<PolygonTarget | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchRef = useRef<google.maps.places.SearchBox | null>(null);
  const boundaryRef = useRef<google.maps.Polygon | null>(null);
  const zoneDraftRef = useRef<google.maps.Polygon | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "greengrid-google-map",
    googleMapsApiKey: mapsApiKey,
    libraries: ["drawing", "places", "geometry"],
  });

  const boundaryPath = useMemo(() => parsePolygonJson(boundaryPolygonJson), [boundaryPolygonJson]);
  const zoneDraftPath = useMemo(() => parsePolygonJson(zoneDraftPolygonJson), [zoneDraftPolygonJson]);
  const savedZonePaths = useMemo(
    () =>
      zones.map((zone) => ({ id: zone.id, path: parsePolygonJson(zone.polygonJson) })).filter((zone) => zone.path.length > 2),
    [zones],
  );
  const suggestedZonePaths = useMemo(
    () =>
      suggestedZones
        .map((zone) => ({ id: zone.id, path: parsePolygonJson(zone.polygonJson), name: zone.name }))
        .filter((zone) => zone.path.length > 2),
    [suggestedZones],
  );

  if (!mapsApiKey) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-950">
        <AlertTitle>Map disabled</AlertTitle>
        <AlertDescription>
          Add <code className="rounded bg-white/60 px-1 py-0.5 text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in{" "}
          <code className="rounded bg-white/60 px-1 py-0.5 text-xs">.env.local</code> to enable drawing boundaries and zones.
        </AlertDescription>
      </Alert>
    );
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Google Maps failed to load</AlertTitle>
        <AlertDescription>
          Check your API key restrictions, internet access, and whether Maps JavaScript + Places APIs are enabled.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-6 text-sm text-muted-foreground shadow-md ring-1 ring-border/50">
        Loading map…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Interactive map editor</p>
          <p className="text-xs text-muted-foreground">
            Search your address, switch to satellite view, and draw the full boundary first for better suggestions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="xs" variant="outline" onClick={() => setIsDrawingMode(false)}>
            Stop drawing
          </Button>
          <Button
            type="button"
            size="xs"
            onClick={() => {
              setDrawingTarget("boundary");
              setIsDrawingMode(true);
            }}
          >
            Draw boundary
          </Button>
          <Button
            type="button"
            size="xs"
            variant="secondary"
            className="bg-blue-600 text-white hover:bg-blue-600/90"
            onClick={() => {
              setDrawingTarget("zone");
              setIsDrawingMode(true);
            }}
          >
            Draw zone
          </Button>
        </div>
      </div>

      <StandaloneSearchBox
        onLoad={(searchBox) => {
          searchRef.current = searchBox;
        }}
        onPlacesChanged={() => {
          const place = searchRef.current?.getPlaces()?.[0];
          const location = place?.geometry?.location;
          if (location && mapRef.current) {
            mapRef.current.panTo({ lat: location.lat(), lng: location.lng() });
            mapRef.current.setZoom(18);
          }
        }}
      >
        <input
          type="text"
          placeholder="Search for address or neighborhood"
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </StandaloneSearchBox>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={19}
        options={{
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeId: "satellite",
          minZoom: 4,
          maxZoom: 22,
        }}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        <DrawingManager
          drawingMode={isDrawingMode ? google.maps.drawing.OverlayType.POLYGON : null}
          options={{
            drawingControl: false,
            polygonOptions: {
              ...(drawingTarget === "boundary" ? boundaryStyle : zoneDraftStyle),
              editable: true,
            },
          }}
          onPolygonComplete={(polygon) => {
            const polygonJson = pathToJson(getPolygonPath(polygon));
            if (drawingTarget === "boundary") onBoundaryPolygonChange(polygonJson);
            if (drawingTarget === "zone") onZoneDraftPolygonChange(polygonJson);
            polygon.setMap(null);
            setIsDrawingMode(false);
          }}
        />

        {boundaryPath.length > 2 && (
          <Polygon
            path={boundaryPath}
            options={{ ...boundaryStyle, editable: true }}
            onLoad={(polygon) => {
              boundaryRef.current = polygon;
            }}
            onUnmount={() => {
              boundaryRef.current = null;
            }}
            onMouseUp={() => {
              if (boundaryRef.current) onBoundaryPolygonChange(pathToJson(getPolygonPath(boundaryRef.current)));
            }}
          />
        )}

        {zoneDraftPath.length > 2 && (
          <Polygon
            path={zoneDraftPath}
            options={{ ...zoneDraftStyle, editable: true }}
            onLoad={(polygon) => {
              zoneDraftRef.current = polygon;
            }}
            onUnmount={() => {
              zoneDraftRef.current = null;
            }}
            onMouseUp={() => {
              if (zoneDraftRef.current) onZoneDraftPolygonChange(pathToJson(getPolygonPath(zoneDraftRef.current)));
            }}
          />
        )}

        {savedZonePaths.map((zone) => (
          <Polygon key={zone.id} path={zone.path} options={savedZoneStyle} />
        ))}

        {suggestedZonePaths.map((zone) => (
          <Polygon
            key={zone.id}
            path={zone.path}
            options={{
              fillColor: zone.id === activeSuggestionId ? "#2563eb" : "#93c5fd",
              fillOpacity: zone.id === activeSuggestionId ? 0.28 : 0.14,
              strokeColor: "#1d4ed8",
              strokeOpacity: zone.id === activeSuggestionId ? 1 : 0.75,
              strokeWeight: zone.id === activeSuggestionId ? 2 : 1.5,
              clickable: false,
            }}
          />
        ))}
      </GoogleMap>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Boundary points: {boundaryPath.length} | Draft points: {zoneDraftPath.length} | Suggested zones:{" "}
          {suggestedZonePaths.length} | Saved zones: {savedZonePaths.length}
        </p>
        <Button type="button" size="xs" variant="ghost" className="text-blue-700 hover:text-blue-800" onClick={() => onZoneDraftPolygonChange("")}>
          Clear zone draft
        </Button>
      </div>
    </div>
  );
}
