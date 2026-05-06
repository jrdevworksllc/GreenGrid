# GreenGrid Backend API

Spring Boot backend for GreenGrid full-feature yard mapping, design, and care workflows.

## Requirements

- Java 17

## Run

```bash
./gradlew bootRun
```

Backend starts on `http://localhost:8080`.

If port `8080` is taken:

```bash
./gradlew bootRun --args="--server.port=8081"
```

## Core Endpoints

- `GET /api/health`
- `POST /api/properties`
- `GET /api/properties/{id}`
- `POST /api/properties/{id}/boundary`
- `POST /api/properties/{id}/zones`
- `GET /api/properties/{id}/zones`
- `POST /api/zones/{id}/plantings`
- `GET /api/properties/{id}/plantings`
- `GET /api/plants/catalog`
- `POST /api/design/requests` (multipart form with `propertyId`, `zoneId?`, `prompt`, `style`, optional `photos`)
- `GET /api/design/requests/{id}`
- `POST /api/design/outputs/{id}/apply`
- `GET /api/tasks/today?propertyId={id}`

## Notes

- Uses Flyway migrations and H2 by default for local development.
- Postgres can be enabled through `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`.
- AI rendering is currently implemented with a mock single-provider adapter via `DesignProvider`.
- Controllers are split by module (`PropertyController`, `DesignController`, `TaskController`, `PlantCatalogController`) and route through service layer classes.

## Data Contracts (selected)

- `GET /api/plants/catalog` now returns typed fields:
  - `id`, `commonName`, `scientificName`, `usdaMinZone`, `usdaMaxZone`, `lightNeeds`, `waterCadence`, `imageUrl`, `imageSource`, `imageLicense`, `imageAttribution`
- `GET /api/tasks/today` now returns typed fields:
  - `id`, `title`, `detail`, `priority`, `dueOn`, `completed`
- `POST /api/design/outputs/{id}/apply` returns:
  - `status`, `outputId`, `planVersionId`, `versionNumber`

## Plan Versioning

- Applying a design output creates immutable plan artifacts:
  - `plan_version` (property-scoped incrementing version number)
  - `plan_item` rows linked to each version
- Current flow also creates `care_task` rows so existing dashboard/task UX remains stable.

## Plant catalog images (Wikimedia Commons)

- Seed plants use direct `upload.wikimedia.org` URLs produced by Wikimedia Commons file metadata. Each row stores `image_source` (typically `Wikimedia Commons`), a short `image_license` label from the file page, and `image_attribution` reminding users to confirm photographer and terms on the Commons file page.
- **Stability caveat:** Commons may rename or rotate files; URLs are stable for a given file hash path but can break if a file is deleted, moved, or replaced. For production, mirror approved assets or use your own CDN with controlled objects.
- Licenses vary (public domain, CC BY, CC BY-SA, CC0, etc.); comply with each file’s terms on Wikimedia Commons before reuse outside this demo.
