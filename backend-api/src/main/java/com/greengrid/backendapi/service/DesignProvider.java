package com.greengrid.backendapi.service;

import java.util.List;
import java.util.UUID;

public interface DesignProvider {

    String providerKey();

    ProviderResult generate(UUID propertyId, UUID zoneId, String prompt, String style, List<String> photoPaths);

    record ProviderResult(String providerRequestId, List<String> generatedUrls) {}
}
