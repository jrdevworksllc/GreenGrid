package com.greengrid.backendapi.model;

public record Plant(
        String id,
        String commonName,
        String scientificName,
        String lightNeeds,
        String waterCadence
) {
}
