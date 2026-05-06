# Kansas Data Pipeline File Naming Ideas

Use consistent, sortable file naming for future Kansas ingestion jobs and outputs.

## Proposed Pattern

`kansas_<domain>_<dataset>_<granularity>_<yyyymmdd>.<ext>`

## Examples

- `kansas_weather_noaa_daily_20260505.csv`
- `kansas_plants_native_catalog_full_20260505.json`
- `kansas_frost_dates_county_annual_20260505.csv`
- `kansas_watering_guidance_zone_weekly_20260505.json`

## Notes

- Use lowercase snake_case.
- Keep dates in `yyyymmdd`.
- Prefer explicit domain and granularity to reduce ambiguity.
