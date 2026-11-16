# MARKA Mobility landmark catalogue import

The catalogue is global and intentionally not pre-populated with guessed coordinates. Import only places whose position and source can be checked. A country code narrows searches when requested; it does not restrict the platform to one country.

## Input format

Pass a UTF-8 JSON file containing an array of records:

```json
[
  {
    "name": "Verified place name",
    "aliases": ["Common local spelling", "Alternative name"],
    "countryCode": "AO",
    "province": "Luanda",
    "municipality": "Municipality name",
    "category": "SHOPPING_CENTRE",
    "latitude": -8.000000,
    "longitude": 13.000000,
    "source": "OPENSTREETMAP",
    "sourceRef": "osm:node/123456789",
    "verifiedAt": "2026-11-16T10:00:00Z"
  }
]
```

The coordinates and source reference above are illustrative placeholders and must never be imported as real place data. Set `countryCode` to the place country using its ISO 3166-1 alpha-2 code (for example `AO`, `PT`, `BR`, `US`, or `FR`).

## Validation and update behaviour

- `name`, coordinates, source, source reference and verification timestamp are mandatory.
- Coordinates must be numeric latitude/longitude values inside the global geographic ranges; country-specific polygon validation is not inferred from the country code.
- `countryCode` is a two-letter ISO 3166-1 alpha-2 code. It defaults to `AO` only for backward compatibility; international records must set it explicitly.\n- `source` must be `OPENSTREETMAP`, `OFFICIAL`, `FIELD_VERIFIED` or `PARTNER_VERIFIED`.
- `sourceRef` must be an HTTPS URL or an explicit `osm:node/ID`, `osm:way/ID` or `osm:relation/ID` reference, and is unique in the catalogue.
- `verifiedAt` must be an ISO 8601 timestamp with timezone.
- Up to 20 aliases are accepted; aliases and names are normalized for case and diacritics.
- Duplicate country + normalized name + municipality records in one file are rejected before writing.
- Existing records are matched first by stable `sourceRef`, then by country + normalized name + municipality. Unrelated records are never deleted.
- The import runs in a database transaction. A failed record rolls back the batch.

## Run

After the `MobilityLandmark` migration has been applied to the target database:

First validate the file without writing to the database:

```bash
npm run mobility:landmarks:import -- ./path/to/verified-landmarks.json --dry-run
```

If validation succeeds and the migration is applied, import:

```bash
npm run mobility:landmarks:import -- ./path/to/verified-landmarks.json
```

Do not run this against production until the migration is confirmed and the input file has been reviewed. OpenStreetMap-derived data must retain appropriate ODbL attribution and source references in MARKA's data and product documentation.
