# Map / Geo / Discovery Architecture

## Layer responsibilities

### 1) Map rendering layer (Flutter map UI)
- Owns camera/viewport state, gesture state, selected pin state, and map loading UI.
- Never parses raw geo-provider payloads.
- Can render even when geo labeling/geocoding fails.

### 2) Geo layer (`MapGeoClient`)
- Uses geo endpoints (`/v1/geocode`, `/v1/reverse-geocode`) only for text-to-location and area labels.
- Geo failures are surfaced as non-blocking UI status (for example, stale/missing area label).
- Geo is not used as place discovery truth.

### 3) Perbug discovery layer (`PlaceDiscoveryClient`)
- Uses backend map discovery endpoint (`/v1/places/map-discovery`) for pins and search-this-area.
- Returns canonical place IDs and place preview fields.
- Discovery failures show pin/result failure state while the map viewport remains interactive.

## Data model boundaries

- `GeocodeResult` / `ReverseGeocodeResult`: geo-only models.
- `MapViewport` / `SearchAreaContext`: map interaction and viewport inputs.
- `MapPin` / `PlacePreviewSummary`: canonical discovery output models.

Raw Nominatim responses are not consumed directly in map widgets.

## Degradation behavior

- If geo is down: map still renders, existing discovery pins remain usable, area labels can be unavailable.
- If discovery is down: map still renders, pin panel shows retryable discovery error.
- If map provider fails in future SDK integration: show map error/retry state separately from geo/discovery states.

## Canonical place identity

- Map pins use `canonicalPlaceId` as their primary identifier.
- Search-this-area and nearby flows are backend-discovery backed.
