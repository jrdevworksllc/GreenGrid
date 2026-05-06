package com.greengrid.backendapi.controller;

import com.greengrid.backendapi.dto.PropertyDtos;
import com.greengrid.backendapi.service.PropertyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PropertyController {

    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @PostMapping("/properties")
    public PropertyDtos.PropertyResponse createProperty(@Valid @RequestBody PropertyDtos.CreatePropertyRequest request) {
        return propertyService.createProperty(request);
    }

    @GetMapping("/properties/{id}")
    public PropertyDtos.PropertyResponse getProperty(@PathVariable("id") UUID id) {
        return propertyService.getProperty(id);
    }

    @PostMapping("/properties/{id}/boundary")
    public ResponseEntity<Void> upsertBoundary(@PathVariable("id") UUID id, @Valid @RequestBody PropertyDtos.BoundaryRequest request) {
        propertyService.upsertBoundary(id, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/properties/{id}/zones")
    public PropertyDtos.ZoneResponse createZone(@PathVariable("id") UUID id, @Valid @RequestBody PropertyDtos.ZoneRequest request) {
        return propertyService.createZone(id, request);
    }

    @GetMapping("/properties/{id}/zones")
    public List<PropertyDtos.ZoneResponse> listZones(@PathVariable("id") UUID id) {
        return propertyService.listZones(id);
    }

    @PostMapping("/zones/{id}/plantings")
    public PropertyDtos.PlantingResponse createPlanting(@PathVariable("id") UUID zoneId, @Valid @RequestBody PropertyDtos.PlantingRequest request) {
        return propertyService.createPlanting(zoneId, request);
    }

    @GetMapping("/properties/{id}/plantings")
    public List<PropertyDtos.PlantingResponse> listPlantings(@PathVariable("id") UUID propertyId) {
        return propertyService.listPlantings(propertyId);
    }
}
