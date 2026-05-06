package com.greengrid.backendapi.service;

import com.greengrid.backendapi.dto.DesignDtos;
import com.greengrid.backendapi.dto.PropertyDtos;
import com.greengrid.backendapi.repository.GreenGridRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class DesignService {

    private final GreenGridRepository repository;
    private final DesignProvider designProvider;
    private final FileStorageService fileStorageService;
    private final PropertyService propertyService;

    public DesignService(
            GreenGridRepository repository,
            DesignProvider designProvider,
            FileStorageService fileStorageService,
            PropertyService propertyService
    ) {
        this.repository = repository;
        this.designProvider = designProvider;
        this.fileStorageService = fileStorageService;
        this.propertyService = propertyService;
    }

    public PropertyDtos.DesignRequestResponse createDesignRequest(
            UUID propertyId,
            UUID zoneId,
            String prompt,
            String style,
            List<MultipartFile> photos
    ) {
        propertyService.ensurePropertyExists(propertyId);

        List<String> storedPhotoPaths = new ArrayList<>();
        try {
            storedPhotoPaths = fileStorageService.saveAll(photos == null ? List.of() : photos);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to process photo uploads");
        }

        UUID requestId = repository.createDesignRequest(propertyId, zoneId, prompt, style, designProvider.providerKey());
        DesignProvider.ProviderResult providerResult = designProvider.generate(
                propertyId,
                zoneId,
                prompt,
                style,
                storedPhotoPaths
        );
        repository.setProviderRequestId(requestId, providerResult.providerRequestId());
        int index = 1;
        for (String generatedUrl : providerResult.generatedUrls()) {
            repository.addDesignOutput(requestId, generatedUrl, "Option " + index++);
        }
        return repository.getDesignRequest(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR));
    }

    public PropertyDtos.DesignRequestResponse getDesignRequest(UUID requestId) {
        return repository.getDesignRequest(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Design request not found"));
    }

    public DesignDtos.ApplyDesignResponse applyDesign(UUID outputId) {
        UUID propertyId = repository.getPropertyIdByOutputId(outputId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Design output not found"));
        UUID zoneId = repository.getZoneIdByOutputId(outputId).orElse(null);

        repository.markOutputSelected(outputId);
        int nextVersion = repository.latestPlanVersionNumber(propertyId).orElse(0) + 1;
        UUID planVersionId = repository.createPlanVersion(propertyId, outputId, nextVersion);
        repository.createPlanItem(
                planVersionId,
                zoneId,
                "care_task",
                "Review applied design",
                "Convert selected render into phased planting updates.",
                LocalDate.now(),
                "high"
        );
        repository.createPlanItem(
                planVersionId,
                zoneId,
                "care_task",
                "Water newly planned beds",
                "Prepare irrigation schedule for planned zones.",
                LocalDate.now().plusDays(1),
                "medium"
        );
        repository.createCareTask(
                propertyId,
                zoneId,
                null,
                "Review applied design",
                "Convert selected render into phased planting updates.",
                LocalDate.now(),
                "high"
        );
        repository.createCareTask(
                propertyId,
                zoneId,
                null,
                "Water newly planned beds",
                "Prepare irrigation schedule for planned zones.",
                LocalDate.now().plusDays(1),
                "medium"
        );
        return new DesignDtos.ApplyDesignResponse("applied", outputId, planVersionId, nextVersion);
    }
}
