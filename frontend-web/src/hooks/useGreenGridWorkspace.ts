"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyDesignOutput,
  createDesignRequest,
  createPlanting,
  createProperty,
  createZone,
  listWorkspace,
  loadPlantCatalog,
  savePropertyBoundary,
} from "@/lib/api";
import type { DesignRequest, Plant, Planting, Property, Task, Zone } from "@/lib/types";

export function useGreenGridWorkspace() {
  const [property, setProperty] = useState<Property | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [plantsCatalog, setPlantsCatalog] = useState<Plant[]>([]);
  const [plantings, setPlantings] = useState<Planting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [designRequest, setDesignRequest] = useState<DesignRequest | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [message, setMessage] = useState("Welcome to GreenGrid. Let us set up your yard in a few guided steps.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const catalog = await loadPlantCatalog();
        setPlantsCatalog(catalog);
      } catch {
        setMessage("Backend unavailable. Start backend-api to use full features.");
      }
    })();
  }, []);

  async function refreshWorkspace(propertyId: string) {
    const workspace = await listWorkspace(propertyId);
    setZones(workspace.zones);
    setPlantings(workspace.plantings);
    setTasks(workspace.tasks);
  }

  async function submitCreateProperty(formData: FormData) {
    setIsSubmitting(true);
    try {
      const createdProperty = await createProperty({
        name: formData.get("name"),
        addressLine: formData.get("addressLine"),
        city: formData.get("city"),
        postalCode: formData.get("postalCode"),
      });
      setProperty(createdProperty);
      await refreshWorkspace(createdProperty.id);
      setMessage("Property saved. Next, map and save the full property boundary.");
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitAddZone(formData: FormData) {
    if (!property) return false;
    setIsSubmitting(true);
    try {
      await createZone(property.id, {
        name: formData.get("zoneName"),
        sunLevel: formData.get("sunLevel"),
        soilType: formData.get("soilType"),
        irrigationType: formData.get("irrigationType"),
        slope: formData.get("slope"),
        notes: formData.get("notes"),
        polygonJson: formData.get("polygonJson"),
      });
      await refreshWorkspace(property.id);
      setMessage("Zone captured. Add existing plants to improve recommendations.");
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitSaveBoundary(formData: FormData) {
    if (!property) return false;
    setIsSubmitting(true);
    try {
      await savePropertyBoundary(property.id, { polygonJson: formData.get("polygonJson") });
      setMessage("Boundary saved. Generate suggested draft zones or draw zones manually.");
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitAddPlanting(formData: FormData) {
    if (!property || !selectedZoneId) return false;
    setIsSubmitting(true);
    try {
      await createPlanting(selectedZoneId, {
        plantCatalogId: formData.get("plantCatalogId"),
        nickname: formData.get("nickname"),
        quantity: Number(formData.get("quantity")),
        healthStatus: formData.get("healthStatus"),
        plantedOn: formData.get("plantedOn"),
      });
      await refreshWorkspace(property.id);
      setMessage("Existing plants added. Upload photos and generate options.");
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitGenerateDesign(formData: FormData) {
    if (!property) return false;
    setIsSubmitting(true);
    try {
      const requestData = new FormData();
      requestData.append("propertyId", property.id);
      const zoneId = String(formData.get("designZoneId") || "");
      if (zoneId) requestData.append("zoneId", zoneId);
      requestData.append("prompt", String(formData.get("prompt") || ""));
      requestData.append("style", String(formData.get("style") || ""));

      const photos = formData.getAll("photos") as File[];
      photos.forEach((file) => {
        if (file.size > 0) requestData.append("photos", file);
      });

      const request = await createDesignRequest(requestData);
      setDesignRequest(request);
      setMessage("Design options generated. Review and activate your plan.");
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function activatePlan(outputId: string) {
    if (!property) return false;
    setIsSubmitting(true);
    try {
      await applyDesignOutput(outputId);
      await refreshWorkspace(property.id);
      setIsActivated(true);
      setMessage("Plan activated. Your dashboard is now ready.");
      return true;
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasOnboardingMinimum = useMemo(
    () => Boolean(property && zones.length > 0 && plantings.length > 0 && designRequest?.outputs.length),
    [property, zones.length, plantings.length, designRequest],
  );

  return {
    property,
    zones,
    plantsCatalog,
    plantings,
    tasks,
    designRequest,
    selectedZoneId,
    setSelectedZoneId,
    message,
    isSubmitting,
    isActivated,
    setIsActivated,
    hasOnboardingMinimum,
    submitCreateProperty,
    submitAddZone,
    submitSaveBoundary,
    submitAddPlanting,
    submitGenerateDesign,
    activatePlan,
  };
}
