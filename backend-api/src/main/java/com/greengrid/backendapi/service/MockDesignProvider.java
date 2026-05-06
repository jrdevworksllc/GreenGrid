package com.greengrid.backendapi.service;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class MockDesignProvider implements DesignProvider {

    @Override
    public String providerKey() {
        return "mock-v1";
    }

    @Override
    public ProviderResult generate(UUID propertyId, UUID zoneId, String prompt, String style, List<String> photoPaths) {
        List<String> urls = new ArrayList<>();
        urls.add("https://images.greengrid.local/mock/" + UUID.randomUUID() + "?style=" + style.toLowerCase());
        urls.add("https://images.greengrid.local/mock/" + UUID.randomUUID() + "?style=" + style.toLowerCase() + "-alt");
        return new ProviderResult("mock-" + UUID.randomUUID(), urls);
    }
}
