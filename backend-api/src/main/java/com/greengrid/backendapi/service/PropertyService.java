package com.greengrid.backendapi.service;

import com.greengrid.backendapi.dto.PropertyDtos;
import com.greengrid.backendapi.repository.GreenGridRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class PropertyService {

    private final GreenGridRepository repository;

    public PropertyService(GreenGridRepository repository) {
        this.repository = repository;
    }

    public PropertyDtos.PropertyResponse createProperty(PropertyDtos.CreatePropertyRequest request) {
        return repository.createProperty(request);
    }

    public PropertyDtos.PropertyResponse getProperty(UUID propertyId) {
        return repository.getProperty(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
    }

    public void upsertBoundary(UUID propertyId, PropertyDtos.BoundaryRequest request) {
        ensurePropertyExists(propertyId);
        repository.upsertBoundary(propertyId, request.polygonJson());
    }

    public PropertyDtos.ZoneResponse createZone(UUID propertyId, PropertyDtos.ZoneRequest request) {
        ensurePropertyExists(propertyId);
        return repository.createZone(propertyId, request);
    }

    public List<PropertyDtos.ZoneResponse> listZones(UUID propertyId) {
        ensurePropertyExists(propertyId);
        return repository.listZones(propertyId);
    }

    public PropertyDtos.PlantingResponse createPlanting(UUID zoneId, PropertyDtos.PlantingRequest request) {
        return repository.createPlanting(zoneId, request);
    }

    public List<PropertyDtos.PlantingResponse> listPlantings(UUID propertyId) {
        ensurePropertyExists(propertyId);
        return repository.listPlantingsByProperty(propertyId);
    }

    public UUID resolvePropertyId(UUID propertyId) {
        if (propertyId != null) {
            ensurePropertyExists(propertyId);
            return propertyId;
        }
        return repository.firstPropertyId()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Create a property first"));
    }

    public void ensurePropertyExists(UUID propertyId) {
        repository.getProperty(propertyId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Property not found"));
    }
}
