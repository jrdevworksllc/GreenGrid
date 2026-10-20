package com.greengrid.backendapi.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PropertyWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void healthEndpointReturnsOkStatus() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.service").value("GreenGrid backend-api"));
    }

    @Test
    void createPropertyThenCreateAndListZones() throws Exception {
        String propertyPayload = """
                {
                  "name": "Maplewood Yard",
                  "addressLine": "100 Garden Lane",
                  "city": "Maplewood",
                  "stateCode": "KS",
                  "postalCode": "67202",
                  "countryCode": "US"
                }
                """;

        String propertyResponse = mockMvc.perform(
                        post("/api/properties")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(propertyPayload)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Maplewood Yard"))
                .andExpect(jsonPath("$.city").value("Maplewood"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode propertyJson = objectMapper.readTree(propertyResponse);
        UUID propertyId = UUID.fromString(propertyJson.get("id").asText());

        String zonePayload = """
                {
                  "name": "Fence Line Perennial Bed",
                  "sunLevel": "full-sun",
                  "soilType": "loam",
                  "irrigationType": "manual",
                  "slope": "flat",
                  "notes": "MVP test zone",
                  "polygonJson": "[{\\"lat\\":38.35,\\"lng\\":-97.02},{\\"lat\\":38.36,\\"lng\\":-97.03}]"
                }
                """;

        mockMvc.perform(
                        post("/api/properties/{id}/zones", propertyId)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(zonePayload)
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.propertyId").value(propertyId.toString()))
                .andExpect(jsonPath("$.name").value("Fence Line Perennial Bed"));

        mockMvc.perform(get("/api/properties/{id}/zones", propertyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Fence Line Perennial Bed"));
    }

    @Test
    void createPropertyValidatesRequiredFields() throws Exception {
        String invalidPayload = """
                {
                  "name": "",
                  "addressLine": "100 Garden Lane",
                  "city": "Maplewood",
                  "stateCode": "KS",
                  "postalCode": "67202",
                  "countryCode": "US"
                }
                """;

        mockMvc.perform(
                        post("/api/properties")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(invalidPayload)
                )
                .andExpect(status().isBadRequest());
    }
}
