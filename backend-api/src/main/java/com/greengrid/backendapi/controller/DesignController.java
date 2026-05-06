package com.greengrid.backendapi.controller;

import com.greengrid.backendapi.dto.DesignDtos;
import com.greengrid.backendapi.dto.PropertyDtos;
import com.greengrid.backendapi.service.DesignService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class DesignController {

    private final DesignService designService;

    public DesignController(DesignService designService) {
        this.designService = designService;
    }

    @PostMapping(value = "/design/requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PropertyDtos.DesignRequestResponse createDesignRequest(
            @RequestParam("propertyId") UUID propertyId,
            @RequestParam(value = "zoneId", required = false) UUID zoneId,
            @RequestParam("prompt") String prompt,
            @RequestParam("style") String style,
            @RequestPart(value = "photos", required = false) List<MultipartFile> photos
    ) {
        return designService.createDesignRequest(propertyId, zoneId, prompt, style, photos);
    }

    @GetMapping("/design/requests/{id}")
    public PropertyDtos.DesignRequestResponse getDesignRequest(@PathVariable("id") UUID requestId) {
        return designService.getDesignRequest(requestId);
    }

    @PostMapping("/design/outputs/{id}/apply")
    public DesignDtos.ApplyDesignResponse applyDesign(@PathVariable("id") UUID outputId) {
        return designService.applyDesign(outputId);
    }
}
