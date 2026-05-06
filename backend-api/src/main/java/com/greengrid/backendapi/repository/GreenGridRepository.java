package com.greengrid.backendapi.repository;

import com.greengrid.backendapi.dto.PropertyDtos;
import com.greengrid.backendapi.dto.PlantCatalogDtos;
import com.greengrid.backendapi.dto.TaskDtos;
import com.greengrid.backendapi.seed.PlantCatalogSeed;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class GreenGridRepository {

    private static final UUID DEMO_USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String IMAGE_SOURCE_COMMONS = "Wikimedia Commons";
    private final JdbcTemplate jdbcTemplate;

    public GreenGridRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        ensureSeedData();
    }

    private void ensureSeedData() {
        jdbcTemplate.update("""
                merge into app_user key(id) values (?, ?, ?, ?)
                """, DEMO_USER_ID, "demo@greengrid.app", "GreenGrid Demo", Timestamp.valueOf(LocalDateTime.now()));

        for (PlantCatalogSeed.Row row : PlantCatalogSeed.ROWS) {
            insertPlant(row);
        }
    }

    private static String imageAttribution(String licenseLine) {
        return "Image hosted on Wikimedia Commons. Stated license: " + licenseLine
                + ". Verify photographer and legal terms on the Commons file page linked from image_url.";
    }

    private void insertPlant(PlantCatalogSeed.Row row) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from plants_catalog where scientific_name = ?",
                Integer.class,
                row.scientificName()
        );
        if (count != null && count > 0) {
            return;
        }
        jdbcTemplate.update("""
                insert into plants_catalog(id, common_name, scientific_name, usda_min_zone, usda_max_zone, light_needs, water_cadence, is_native_us, image_url, image_source, image_license, image_attribution, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                row.commonName(),
                row.scientificName(),
                row.usdaMinZone(),
                row.usdaMaxZone(),
                row.lightNeeds(),
                row.waterCadence(),
                row.nativeUs(),
                row.imageUrl(),
                IMAGE_SOURCE_COMMONS,
                row.imageLicense(),
                imageAttribution(row.imageLicense()),
                Timestamp.valueOf(LocalDateTime.now())
        );
    }

    public PropertyDtos.PropertyResponse createProperty(PropertyDtos.CreatePropertyRequest request) {
        UUID id = UUID.randomUUID();
        LocalDateTime createdAt = LocalDateTime.now();
        jdbcTemplate.update("""
                insert into property(id, user_id, name, address_line, city, state_code, postal_code, country_code, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id, DEMO_USER_ID, request.name(), request.addressLine(), request.city(), request.stateCode(),
                request.postalCode(), request.countryCode(), Timestamp.valueOf(createdAt));
        return new PropertyDtos.PropertyResponse(
                id, request.name(), request.addressLine(), request.city(), request.stateCode(), request.postalCode(), request.countryCode(), createdAt
        );
    }

    public Optional<PropertyDtos.PropertyResponse> getProperty(UUID propertyId) {
        List<PropertyDtos.PropertyResponse> rows = jdbcTemplate.query("""
                select id, name, address_line, city, state_code, postal_code, country_code, created_at
                from property where id = ?
                """, propertyMapper(), propertyId);
        return rows.stream().findFirst();
    }

    public void upsertBoundary(UUID propertyId, String polygonJson) {
        Integer count = jdbcTemplate.queryForObject("select count(*) from yard_boundary where property_id = ?", Integer.class, propertyId);
        if (count != null && count > 0) {
            jdbcTemplate.update("update yard_boundary set polygon_json = ?, updated_at = ? where property_id = ?",
                    polygonJson, Timestamp.valueOf(LocalDateTime.now()), propertyId);
        } else {
            jdbcTemplate.update("""
                    insert into yard_boundary(id, property_id, polygon_json, updated_at)
                    values (?, ?, ?, ?)
                    """, UUID.randomUUID(), propertyId, polygonJson, Timestamp.valueOf(LocalDateTime.now()));
        }
    }

    public PropertyDtos.ZoneResponse createZone(UUID propertyId, PropertyDtos.ZoneRequest request) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into zone(id, property_id, name, sun_level, soil_type, irrigation_type, slope, notes, polygon_json, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                id, propertyId, request.name(), request.sunLevel(), request.soilType(), request.irrigationType(),
                request.slope(), request.notes(), request.polygonJson(), Timestamp.valueOf(LocalDateTime.now()));
        return new PropertyDtos.ZoneResponse(id, propertyId, request.name(), request.sunLevel(), request.soilType(), request.irrigationType(),
                request.slope(), request.notes(), request.polygonJson());
    }

    public List<PropertyDtos.ZoneResponse> listZones(UUID propertyId) {
        return jdbcTemplate.query("""
                select id, property_id, name, sun_level, soil_type, irrigation_type, slope, notes, polygon_json
                from zone where property_id = ? order by created_at asc
                """, zoneMapper(), propertyId);
    }

    public PropertyDtos.PlantingResponse createPlanting(UUID zoneId, PropertyDtos.PlantingRequest request) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into planting(id, zone_id, plant_catalog_id, nickname, quantity, health_status, planted_on, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?)
                """, id, zoneId, request.plantCatalogId(), request.nickname(), request.quantity(),
                request.healthStatus(), request.plantedOn(), Timestamp.valueOf(LocalDateTime.now()));

        return jdbcTemplate.queryForObject("""
                select p.id, p.zone_id, p.plant_catalog_id, c.common_name, c.image_url, p.nickname, p.quantity, p.health_status, p.planted_on
                from planting p
                join plants_catalog c on c.id = p.plant_catalog_id
                where p.id = ?
                """, plantingMapper(), id);
    }

    public List<PropertyDtos.PlantingResponse> listPlantingsByProperty(UUID propertyId) {
        return jdbcTemplate.query("""
                select p.id, p.zone_id, p.plant_catalog_id, c.common_name, c.image_url, p.nickname, p.quantity, p.health_status, p.planted_on
                from planting p
                join zone z on z.id = p.zone_id
                join plants_catalog c on c.id = p.plant_catalog_id
                where z.property_id = ?
                order by p.created_at desc
                """, plantingMapper(), propertyId);
    }

    public List<PlantCatalogDtos.PlantCatalogItemResponse> listCatalogPlants() {
        return jdbcTemplate.query("""
                select id, common_name, scientific_name, usda_min_zone, usda_max_zone, light_needs, water_cadence, image_url, image_source, image_license, image_attribution
                from plants_catalog order by common_name asc
                """, (rs, rowNum) -> new PlantCatalogDtos.PlantCatalogItemResponse(
                UUID.fromString(rs.getString("id")),
                rs.getString("common_name"),
                rs.getString("scientific_name"),
                rs.getInt("usda_min_zone"),
                rs.getInt("usda_max_zone"),
                rs.getString("light_needs"),
                rs.getString("water_cadence"),
                rs.getString("image_url"),
                rs.getString("image_source"),
                rs.getString("image_license"),
                rs.getString("image_attribution")
        ));
    }

    public UUID createDesignRequest(UUID propertyId, UUID zoneId, String prompt, String style, String providerKey) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into design_request(id, property_id, zone_id, prompt, style, provider_key, status, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?)
                """, id, propertyId, zoneId, prompt, style, providerKey, "completed", Timestamp.valueOf(LocalDateTime.now()));
        return id;
    }

    public void setProviderRequestId(UUID requestId, String providerRequestId) {
        jdbcTemplate.update("update design_request set provider_request_id = ? where id = ?", providerRequestId, requestId);
    }

    public PropertyDtos.DesignOutputResponse addDesignOutput(UUID requestId, String outputUrl, String label) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into design_output(id, design_request_id, output_url, label, selected, created_at)
                values (?, ?, ?, ?, false, ?)
                """, id, requestId, outputUrl, label, Timestamp.valueOf(LocalDateTime.now()));
        return new PropertyDtos.DesignOutputResponse(id, outputUrl, label, false);
    }

    public Optional<PropertyDtos.DesignRequestResponse> getDesignRequest(UUID requestId) {
        List<PropertyDtos.DesignRequestResponse> rows = jdbcTemplate.query("""
                select id, property_id, zone_id, prompt, style, provider_key, status
                from design_request where id = ?
                """, (rs, rowNum) -> new PropertyDtos.DesignRequestResponse(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("property_id")),
                rs.getString("zone_id") == null ? null : UUID.fromString(rs.getString("zone_id")),
                rs.getString("prompt"),
                rs.getString("style"),
                rs.getString("provider_key"),
                rs.getString("status"),
                listDesignOutputs(UUID.fromString(rs.getString("id")))
        ), requestId);
        return rows.stream().findFirst();
    }

    public List<PropertyDtos.DesignOutputResponse> listDesignOutputs(UUID requestId) {
        return jdbcTemplate.query("""
                select id, output_url, label, selected
                from design_output where design_request_id = ? order by created_at asc
                """, (rs, rowNum) -> new PropertyDtos.DesignOutputResponse(
                UUID.fromString(rs.getString("id")),
                rs.getString("output_url"),
                rs.getString("label"),
                rs.getBoolean("selected")
        ), requestId);
    }

    public Optional<UUID> getPropertyIdByOutputId(UUID outputId) {
        List<UUID> ids = jdbcTemplate.query("""
                select dr.property_id
                from design_output do1
                join design_request dr on dr.id = do1.design_request_id
                where do1.id = ?
                """, (rs, rowNum) -> UUID.fromString(rs.getString("property_id")), outputId);
        return ids.stream().findFirst();
    }

    public Optional<UUID> getZoneIdByOutputId(UUID outputId) {
        List<UUID> ids = jdbcTemplate.query("""
                select dr.zone_id
                from design_output do1
                join design_request dr on dr.id = do1.design_request_id
                where do1.id = ? and dr.zone_id is not null
                """, (rs, rowNum) -> UUID.fromString(rs.getString("zone_id")), outputId);
        return ids.stream().findFirst();
    }

    public void markOutputSelected(UUID outputId) {
        jdbcTemplate.update("""
                update design_output
                set selected = case when id = ? then true else false end
                where design_request_id = (select design_request_id from design_output where id = ?)
                """, outputId, outputId);
    }

    public void createCareTask(UUID propertyId, UUID zoneId, UUID plantingId, String title, String detail, LocalDate dueOn, String priority) {
        jdbcTemplate.update("""
                insert into care_task(id, property_id, zone_id, planting_id, title, detail, due_on, priority, completed, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, false, ?)
                """,
                UUID.randomUUID(), propertyId, zoneId, plantingId, title, detail, dueOn, priority, Timestamp.valueOf(LocalDateTime.now()));
    }

    public List<TaskDtos.TodayTaskResponse> listTodayTasks(UUID propertyId) {
        return jdbcTemplate.query("""
                select id, title, detail, priority, due_on, completed
                from care_task
                where property_id = ? and due_on <= current_date
                order by due_on asc
                """, (rs, rowNum) -> new TaskDtos.TodayTaskResponse(
                UUID.fromString(rs.getString("id")),
                rs.getString("title"),
                rs.getString("detail"),
                rs.getString("priority"),
                rs.getDate("due_on").toLocalDate(),
                rs.getBoolean("completed")
        ), propertyId);
    }

    public Optional<Integer> latestPlanVersionNumber(UUID propertyId) {
        Integer version = jdbcTemplate.queryForObject(
                "select max(version_number) from plan_version where property_id = ?",
                Integer.class,
                propertyId
        );
        return Optional.ofNullable(version);
    }

    public UUID createPlanVersion(UUID propertyId, UUID sourceDesignOutputId, int versionNumber) {
        UUID planVersionId = UUID.randomUUID();
        jdbcTemplate.update("""
                insert into plan_version(id, property_id, source_design_output_id, version_number, created_at)
                values (?, ?, ?, ?, ?)
                """, planVersionId, propertyId, sourceDesignOutputId, versionNumber, Timestamp.valueOf(LocalDateTime.now()));
        return planVersionId;
    }

    public void createPlanItem(
            UUID planVersionId,
            UUID zoneId,
            String itemType,
            String title,
            String detail,
            LocalDate scheduledOn,
            String priority
    ) {
        jdbcTemplate.update("""
                insert into plan_item(id, plan_version_id, zone_id, item_type, title, detail, scheduled_on, priority, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                UUID.randomUUID(),
                planVersionId,
                zoneId,
                itemType,
                title,
                detail,
                scheduledOn,
                priority,
                Timestamp.valueOf(LocalDateTime.now())
        );
    }

    public Optional<UUID> firstPropertyId() {
        List<UUID> ids = jdbcTemplate.query("select id from property order by created_at asc limit 1",
                (rs, rowNum) -> UUID.fromString(rs.getString("id")));
        return ids.stream().findFirst();
    }

    private RowMapper<PropertyDtos.PropertyResponse> propertyMapper() {
        return (rs, rowNum) -> new PropertyDtos.PropertyResponse(
                UUID.fromString(rs.getString("id")),
                rs.getString("name"),
                rs.getString("address_line"),
                rs.getString("city"),
                rs.getString("state_code"),
                rs.getString("postal_code"),
                rs.getString("country_code"),
                rs.getTimestamp("created_at").toLocalDateTime()
        );
    }

    private RowMapper<PropertyDtos.ZoneResponse> zoneMapper() {
        return (rs, rowNum) -> new PropertyDtos.ZoneResponse(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("property_id")),
                rs.getString("name"),
                rs.getString("sun_level"),
                rs.getString("soil_type"),
                rs.getString("irrigation_type"),
                rs.getString("slope"),
                rs.getString("notes"),
                rs.getString("polygon_json")
        );
    }

    private RowMapper<PropertyDtos.PlantingResponse> plantingMapper() {
        return new RowMapper<>() {
            @Override
            public PropertyDtos.PlantingResponse mapRow(ResultSet rs, int rowNum) throws SQLException {
                LocalDate plantedOn = rs.getDate("planted_on") == null ? null : rs.getDate("planted_on").toLocalDate();
                return new PropertyDtos.PlantingResponse(
                        UUID.fromString(rs.getString("id")),
                        UUID.fromString(rs.getString("zone_id")),
                        UUID.fromString(rs.getString("plant_catalog_id")),
                        rs.getString("common_name"),
                        rs.getString("image_url"),
                        rs.getString("nickname"),
                        rs.getInt("quantity"),
                        rs.getString("health_status"),
                        plantedOn
                );
            }
        };
    }
}
