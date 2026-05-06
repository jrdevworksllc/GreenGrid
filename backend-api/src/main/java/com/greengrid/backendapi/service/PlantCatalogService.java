package com.greengrid.backendapi.service;

import com.greengrid.backendapi.dto.PlantCatalogDtos;
import com.greengrid.backendapi.repository.GreenGridRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PlantCatalogService {

    private final GreenGridRepository repository;

    public PlantCatalogService(GreenGridRepository repository) {
        this.repository = repository;
    }

    public List<PlantCatalogDtos.PlantCatalogItemResponse> listCatalogPlants() {
        return repository.listCatalogPlants();
    }
}
