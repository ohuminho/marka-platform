# MARKA Mobility landmark catalogue import

The catalogue is intentionally not pre-populated with guessed coordinates. Import only places whose position and source can be checked.

## Input format

Pass a UTF-8 JSON file containing an array of records:

```json
[
  {
    "name": "Verified place name",
    "aliases": ["Common local spelling", "Alternative name"],
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

The coordinates above are illustrative placeholders and must never be imported as real place data.

## Validation and update behaviour

- `name`, coordinates, source, source reference and verification timestamp are mandatory.
- Coordinates must be numeric and fall inside a broad Angola mainland/Cabinda envelope. This is a guardrail, not exact border-polygon validation.
- `source` must be `OPENSTREETMAP`, `OFFICIAL`, `FIELD_VERIFIED` or `PARTNER_VERIFIED`.
- `sourceRef` must be an HTTPS URL or an explicit `osm:node/ID`, `osm:way/ID` or `osm:relation/ID` reference.
- `verifiedAt` must be an ISO 8601 timestamp with timezone.
- Up to 20 aliases are accepted; aliases and names are normalized for case and diacritics.
- Duplicate normalized name + municipality records in one file are rejected before writing.
- Existing matching records are updated; unrelated records are never deleted.
- The import runs in a database transaction. A failed record rolls back the batch.

## Run

After the `MobilityLandmark` migration has been applied to the target database:

```bash
npm run mobility:landmarks:import -- ./path/to/verified-landmarks.json --dry-run\n\n# If validation succeeds and the migration is applied:\nnpm run mobility:landmarks:import -- ./path/to/verified-landmarks.json
```

Do not run this against production until the migration is confirmed and the input file has been reviewed. OpenStreetMap-derived data must retain appropriate ODbL attribution and source references in MARKA's data and product documentation.
