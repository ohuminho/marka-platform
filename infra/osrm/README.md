# MARKA Mobility — self-hosted OSRM for all Angola

This directory prepares a MARKA-operated OSRM routing engine from the free OpenStreetMap extract for the **entire territory of Angola**. It is not a Luanda-only setup.

Angola's current administrative division has **21 provinces, 326 municipalities and 378 communes** under Law 14/24. The single Geofabrik Angola country extract is the source dataset for the national routing graph; we do not download a separate paid map for each province.

- Routing engine: [Project OSRM](https://github.com/Project-OSRM/osrm-backend), BSD-licensed.
- Road data: [Geofabrik Angola extract](https://download.geofabrik.de/africa/angola/), derived from OpenStreetMap and distributed under ODbL 1.0.
- Default routing profile: OSRM's `car.lua` (initially used for taxi and mototáxi; motorcycle-specific routing requires separate profile design and field validation).
- Algorithm: MLD.
- No paid routing API, API key, or per-request routing fee is required when MARKA operates its own instance.

## National coverage and data-quality policy

The country extract covers Angola geographically, but it does **not** guarantee that every street, bairro, village, dirt road or newly built road is mapped or routable. Coverage quality depends on the OpenStreetMap road data available for each place.

MARKA must therefore validate the network progressively across all 21 provinces, not just Luanda. The national acceptance checklist must include:
1. Route tests between the provincial capital/administrative seat and other mapped locations in each province.
2. Tests across municipal seats and inter-provincial corridors.
3. Checks for disconnected roads, missing bridges/ferries, access restrictions, one-way streets and implausible detours.
4. A clear “route unavailable in this area” response when the road network cannot produce a valid route. Never invent straight-line distance, duration or fare.

The map display, place search/geocoding and OSRM road routing are separate capabilities. A visible map tile does not prove that a road route exists. Map tiles and place-search services also need their own national coverage and usage review.

## Requirements

- Linux host or development machine with Docker Engine and the Docker Compose plugin.
- Enough free disk space, memory and CPU for the full Angola extract and processed national road graph. The extract is updated regularly; check the current size on Geofabrik before downloading.
- A persistent, always-on host is required for production service. Vercel Functions are not a suitable place to run the OSRM graph engine.
- No paid API key or routing subscription.

## Prepare the national Angola road graph

From the repository root:

```sh
sh infra/osrm/prepare-angola.sh
```

The script downloads the latest Angola `.osm.pbf` country extract, verifies its MD5 checksum, then runs OSRM extraction, partitioning and customization in the OSRM container.

The first graph preparation is CPU- and memory-intensive. Do not run it inside a Vercel Function. Do not commit the downloaded extract or generated graph files to Git.

## Start the routing service

```sh
docker compose -f infra/osrm/docker-compose.yml up -d
```

The service listens on `http://127.0.0.1:5000` on the host. It is deliberately bound to loopback and is not exposed directly to the public internet.

Test the API locally using two known, drivable coordinates in Angola:

```sh
curl 'http://127.0.0.1:5000/route/v1/driving/LONGITUDE_1,LATITUDE_1;LONGITUDE_2,LATITUDE_2?overview=false'
```

Replace the placeholders with numeric longitude/latitude values. A successful response has `"code":"Ok"` and at least one route with positive `distance` and `duration`. Repeat tests in every province; one successful Luanda request is not national validation.

## Connect MARKA to the host

The MARKA backend already reads `MOBILITY_ROUTING_BASE_URL`. After the host is provisioned, place an HTTPS reverse proxy with access controls in front of OSRM and set this Vercel environment variable to that protected endpoint, for example:

```env
MOBILITY_ROUTING_BASE_URL=https://routing.your-domain.example/
```

The example hostname is illustrative only; do not configure it literally. Do not expose port 5000 publicly without authentication, request limits and network controls. Keep the public demo endpoint out of the production path once the self-hosted national endpoint has passed route and fare validation.

## Operational constraints

- OSRM software and the Geofabrik country extract are free; a continuously available production host, electricity, bandwidth and storage are not automatically free.
- This repository setup does not provision a server, create DNS, change production environment variables, or switch production away from the public OSRM demo.
- Before production activation, test route coverage across all 21 provinces and intended service corridors, verify road distance/time and server-side fares, load-test concurrency, and pin the exact OSRM image version that passed validation.
- Display OpenStreetMap attribution: “© OpenStreetMap contributors”. ODbL terms apply to the data and derived databases; review them before redistributing a derived database.

## Updating the national road data

Re-run `sh infra/osrm/prepare-angola.sh` during a maintenance window to download and rebuild the latest country graph. The running service should be restarted after a successful rebuild. Before replacing the active graph, validate the new graph and retain a rollback copy.
