# GreenGrid

GreenGrid is a web app for mapping a home yard, keeping a planting inventory, generating design concepts from a photo and a prompt, and turning the chosen concept into care tasks.

It is for a homeowner planning their own yard. The local app uses one demo user and does not have accounts yet.

## Stack

- `frontend-web`: Next.js (App Router), React, and Tailwind CSS
- `backend-api`: Spring Boot on Java 17, Flyway, H2 by default, and Postgres when `DATABASE_URL` is set

## Run

### API

From `backend-api`:

```bash
./gradlew bootRun
```

The API listens on `http://localhost:8080`. Endpoints, the plant catalog, and database settings are in [backend-api/README.md](backend-api/README.md).

### Web

From `frontend-web`:

```bash
npm install
npm run dev
```

The app listens on `http://localhost:3000`. The Google Maps key and `NEXT_PUBLIC_API_BASE_URL` are documented in [frontend-web/README.md](frontend-web/README.md).

Copy placeholders from [.env.example](.env.example) into `frontend-web/.env.local` or the process environment. Do not commit real keys.

## Plans

Upcoming work is listed in [ROADMAP.md](ROADMAP.md).
