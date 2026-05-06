# GreenGrid Frontend Web

Next.js web app for GreenGrid yard mapping, design studio, and care dashboard workflows.

## Requirements

- Node.js 20+
- npm 10+

## Stack

- **Next.js** (App Router) + **React**
- **Tailwind CSS v4** via `@tailwindcss/postcss` and `postcss.config.mjs`
- **shadcn/ui** (registry preset **base-nova**, `@base-ui/react` primitives) — UI pieces live under `src/components/ui`
- **`components.json`** — shadcn config (aliases, Tailwind CSS entry path)
- **Path alias** `@/*` → `src/*` (see `tsconfig.json`)

### Styling and brand

- Global styles: `src/app/globals.css` (`@import "tailwindcss"`, theme tokens, GreenGrid surfaces).
- Brand tokens include `--gg-bg`, `--gg-gradient-start/end`, `--gg-border`, `--gg-brand-deep`, mapped alongside shadcn semantic variables (`--primary`, `--ring`, etc.).
- The **`shadcn` npm package** is a **devDependency** so `@import "shadcn/tailwind.css"` resolves during builds (preset styles for base-nova).

### Adding UI components

From `frontend-web`:

```bash
npx shadcn@latest add <component>
```

## Run

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

```bash
npm run build
```

## Backend API Configuration

Frontend reads backend from:

- `NEXT_PUBLIC_API_BASE_URL` (optional)
- Defaults to `http://localhost:8080`

Example:

```bash
set NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
npm run dev
```

## Google Maps Setup

The onboarding map step uses Google Maps JavaScript API (with Places + Drawing libraries).

1. Create `frontend-web/.env.local` with:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

2. Ensure your Google Cloud project has these APIs enabled:

   - Maps JavaScript API
   - Places API

3. Start frontend as usual:

```bash
npm run dev
```

If the key is missing or Maps fails to load, onboarding shows a fallback alert instead of the map.

## Current Pages/Sections

- Guided onboarding wizard (6 steps):
  - Welcome/goal
  - Property basics
  - Map/zone setup (interactive Google Maps boundary + zone drawing)
  - Existing plants
  - Upload photos + prompt
  - Review + activate plan
- Dashboard view with zone, inventory, and task summaries

## Notes

- UI uses **Tailwind** utilities and **shadcn/ui** components for layout, forms, and feedback.
- Setup + backend interactions are separated for maintainability:
  - `src/hooks/useGreenGridWorkspace.ts`
  - `src/lib/api.ts`
  - `src/components/OnboardingFlow.tsx`
  - `src/components/DashboardView.tsx`
- The page expects backend API availability for full flows.
- Plant catalog responses are expected in camelCase (`commonName`, `scientificName`, `imageUrl`).
- Inventory/list views render plant thumbnails using `imageUrl` with `/placeholder-plant.svg` fallback.
- TODO: surface image license attribution metadata in UI once backend attribution fields are added.
