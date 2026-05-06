# GreenGrid Architecture (US Launch Foundation)

## Scope

GreenGrid now includes the first full-feature foundation for US-launch workflows:
- property setup
- zone mapping
- plant inventory
- photo + prompt AI design requests
- design apply-to-plan task generation

## Current Components

- `backend-api` (Spring Boot, Java 17)
  - Flyway-managed relational schema
  - Property/zone/planting/design/task APIs
  - Pluggable design-provider interface with single provider adapter (`mock-v1`)
- `frontend-web` (Next.js App Router)
  - End-to-end workflow page for onboarding, zone mapping, inventory, design, and tasks
  - GreenGrid design tokens for consistent UI theme

## Runtime Flow

1. User creates a property.
2. User adds zones and plantings.
3. User uploads photos and submits a design prompt.
4. Backend persists design request and calls provider adapter.
5. User applies an output, and backend creates care tasks.
6. Frontend shows updated daily tasks.

## Near-Term Evolution (Low-Cost Path)

- Add authentication and per-user authorization controls.
- Replace polygon JSON text input with a map drawing UI.
- Connect real AI image provider through `DesignProvider` adapter.
- Add regional defaults and constraints per state.

## Future Infrastructure Note

Keep infrastructure simple initially:

- Single Spring Boot service deployment
- Single Next.js deployment
- Managed Postgres for production
- Object storage for photos/renders
- Background scheduler for recurring care tasks
