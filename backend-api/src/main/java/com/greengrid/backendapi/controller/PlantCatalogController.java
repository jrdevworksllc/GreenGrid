package com.greengrid.backendapi.controller;

import com.greengrid.backendapi.dto.PlantCatalogDtos;
import com.greengrid.backendapi.service.PlantCatalogService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PlantCatalogController {

    private final PlantCatalogService plantCatalogService;

    public PlantCatalogController(PlantCatalogService plantCatalogService) {
        this.plantCatalogService = plantCatalogService;
    }

    @GetMapping("/plants/catalog")
    public List<PlantCatalogDtos.PlantCatalogItemResponse> listCatalogPlants() {
        return plantCatalogService.listCatalogPlants();
    }
}
