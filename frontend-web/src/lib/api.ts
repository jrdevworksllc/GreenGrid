import type { DesignRequest, Plant, Planting, Property, Task, Zone } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

async function extractApiError(res: Response, fallbackMessage: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: unknown; error?: unknown };
    if (typeof data.message === "string" && data.message.trim()) return data.message;
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    // no-op: backend may not return JSON body for errors
  }
  return fallbackMessage;
}

function normalizePlant(raw: unknown): Plant {
  const row = raw as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    commonName: String(row.commonName ?? row.common_name ?? ""),
    scientificName: String(row.scientificName ?? row.scientific_name ?? ""),
    imageUrl: toStringOrNull(row.imageUrl ?? row.image_url),
    imageSource: toStringOrNull(row.imageSource ?? row.image_source),
    imageLicense: toStringOrNull(row.imageLicense ?? row.image_license),
    imageAttribution: toStringOrNull(row.imageAttribution ?? row.image_attribution),
  };
}

function normalizePlanting(raw: unknown): Planting {
  const row = raw as Record<string, unknown>;
  return {
    id: String(row.id ?? ""),
    commonName: String(row.commonName ?? row.common_name ?? row.plantCatalogId ?? ""),
    imageUrl: toStringOrNull(row.imageUrl ?? row.image_url),
    quantity: Number(row.quantity ?? 0),
    healthStatus: String(row.healthStatus ?? row.health_status ?? ""),
  };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(await extractApiError(res, `Request failed: ${res.status}`));
  }
  return (await res.json()) as T;
}

export async function loadPlantCatalog() {
  const payload = await getJson<unknown[]>("/api/plants/catalog");
  return payload.map(normalizePlant);
}

export async function createProperty(payload: {
  name: FormDataEntryValue | null;
  addressLine: FormDataEntryValue | null;
  city: FormDataEntryValue | null;
  postalCode: FormDataEntryValue | null;
}) {
  const res = await fetch(`${API_BASE}/api/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      stateCode: "KS",
      countryCode: "US",
    }),
  });

  if (!res.ok) {
    throw new Error("Unable to create property.");
  }

  return (await res.json()) as Property;
}

export async function listWorkspace(propertyId: string) {
  const [zones, plantingsPayload, tasks] = await Promise.all([
    getJson<Zone[]>(`/api/properties/${propertyId}/zones`),
    getJson<unknown[]>(`/api/properties/${propertyId}/plantings`),
    getJson<Task[]>(`/api/tasks/today?propertyId=${propertyId}`),
  ]);
  const plantings = plantingsPayload.map(normalizePlanting);
  return { zones, plantings, tasks };
}

export async function createZone(
  propertyId: string,
  payload: {
    name: FormDataEntryValue | null;
    sunLevel: FormDataEntryValue | null;
    soilType: FormDataEntryValue | null;
    irrigationType: FormDataEntryValue | null;
    slope: FormDataEntryValue | null;
    notes: FormDataEntryValue | null;
    polygonJson: FormDataEntryValue | null;
  },
) {
  const res = await fetch(`${API_BASE}/api/properties/${propertyId}/zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Unable to add zone.");
  }
}

export async function savePropertyBoundary(
  propertyId: string,
  payload: {
    polygonJson: FormDataEntryValue | null;
  },
) {
  const res = await fetch(`${API_BASE}/api/properties/${propertyId}/boundary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Unable to save property boundary.");
  }
}

export async function createPlanting(
  zoneId: string,
  payload: {
    plantCatalogId: FormDataEntryValue | null;
    nickname: FormDataEntryValue | null;
    quantity: number;
    healthStatus: FormDataEntryValue | null;
    plantedOn: FormDataEntryValue | null;
  },
) {
  const res = await fetch(`${API_BASE}/api/zones/${zoneId}/plantings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      plantedOn: typeof payload.plantedOn === "string" && payload.plantedOn.trim() ? payload.plantedOn : null,
    }),
  });
  if (!res.ok) {
    throw new Error(await extractApiError(res, "Unable to add existing plants."));
  }
}

export async function createDesignRequest(payload: FormData) {
  const res = await fetch(`${API_BASE}/api/design/requests`, {
    method: "POST",
    body: payload,
  });
  if (!res.ok) {
    throw new Error("Design request failed.");
  }
  return (await res.json()) as DesignRequest;
}

export async function applyDesignOutput(outputId: string) {
  const res = await fetch(`${API_BASE}/api/design/outputs/${outputId}/apply`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error("Could not apply design output.");
  }
}
