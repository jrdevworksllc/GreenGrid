package com.greengrid.backendapi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class PropertyDtos {

    public record CreatePropertyRequest(
            @NotBlank String name,
            @NotBlank String addressLine,
            @NotBlank String city,
            @NotBlank String stateCode,
            @NotBlank String postalCode,
            @NotBlank String countryCode
    ) {}

    public record PropertyResponse(
            UUID id,
            String name,
            String addressLine,
            String city,
            String stateCode,
            String postalCode,
            String countryCode,
            LocalDateTime createdAt
    ) {}

    public record BoundaryRequest(@NotBlank String polygonJson) {}

    public record ZoneRequest(
            @NotBlank String name,
            @NotBlank String sunLevel,
            @NotBlank String soilType,
            @NotBlank String irrigationType,
            @NotBlank String slope,
            String notes,
            @NotBlank String polygonJson
    ) {}

    public record ZoneResponse(
            UUID id,
            UUID propertyId,
            String name,
            String sunLevel,
            String soilType,
            String irrigationType,
            String slope,
            String notes,
            String polygonJson
    ) {}

    public record PlantingRequest(
            @NotNull UUID plantCatalogId,
            String nickname,
            @NotNull Integer quantity,
            @NotBlank String healthStatus,
            LocalDate plantedOn
    ) {}

    public record PlantingResponse(
            UUID id,
            UUID zoneId,
            UUID plantCatalogId,
            String commonName,
            String imageUrl,
            String nickname,
            Integer quantity,
            String healthStatus,
            LocalDate plantedOn
    ) {}

    public record DesignRequestPayload(
            @NotNull UUID propertyId,
            UUID zoneId,
            @NotBlank String prompt,
            @NotBlank String style
    ) {}

    public record DesignOutputResponse(
            UUID id,
            String outputUrl,
            String label,
            boolean selected
    ) {}

    public record DesignRequestResponse(
            UUID id,
            UUID propertyId,
            UUID zoneId,
            String prompt,
            String style,
            String providerKey,
            String status,
            List<DesignOutputResponse> outputs
    ) {}
}
