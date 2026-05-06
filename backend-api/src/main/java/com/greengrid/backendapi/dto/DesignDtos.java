package com.greengrid.backendapi.dto;

import java.util.UUID;

public class DesignDtos {

    public record ApplyDesignResponse(
            String status,
            UUID outputId,
            UUID planVersionId,
            Integer versionNumber
    ) {}
}
