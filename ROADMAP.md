# Roadmap

About 21 hours of work, using data the app already collects. API keys stay in the environment. [.env.example](.env.example) lists the names and never holds real values.

## Next

### Remember the yard (~4 hours)

The database is in-memory H2, and the page keeps the current property in React state, so a refresh forgets the garden. Switch local development to a file-backed database, list properties, and restore the latest yard after a refresh. This stays a single demo user, without login.

### Weather-aware care (~6 hours)

Applying a design always creates the same two tasks and ignores each plant's water cadence. Build today's tasks from the inventory. Use the Open-Meteo forecast for the property city, with no API key: skip watering when rain is coming, and add a frost warning near a freeze. Show the due date, and let a task be marked done.

### Plants that fit this yard (~5 hours)

The catalog already stores USDA range, light, water need, and a native flag. The web app currently drops the first three. Map the postal code to a USDA zone, show hardiness and water need in the picker, warn when light or zone does not match the bed, and add a native-only filter.

### Design preview from the zone photo (~6 hours)

Concept images are placeholder URLs. Add a second design provider that calls an image API only when `DESIGN_API_KEY` is set. With no key, keep the mock provider so the app still runs.

## Later

- A plant-to-buy list and a phased install tied to the budget band on the design form.
- Plant identification from a photo the user already uploaded, with that API key only in the environment.
- A frost planting calendar for the property.
- Accounts, once there is a second user.
