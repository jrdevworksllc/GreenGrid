package com.greengrid.backendapi.dto;

import java.util.UUID;

public class PlantCatalogDtos {

    public record PlantCatalogItemResponse(
            UUID id,
            String commonName,
            String scientificName,
            Integer usdaMinZone,
            Integer usdaMaxZone,
            String lightNeeds,
            String waterCadence,
            String imageUrl,
            String imageSource,
            String imageLicense,
            String imageAttribution
    ) {}
}
