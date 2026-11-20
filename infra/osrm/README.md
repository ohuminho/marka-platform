# MARKA Mobility — self-hosted OSRM for Angola

This directory prepares a MARKA-operated OSRM routing engine using free/open-source software and the free Angola OpenStreetMap extract.

- Routing engine: [Project OSRM](https://github.com/Project-OSRM/osrm-backend), BSD-licensed.
- Road data: [Geofabrik Angola extract](https://download.geofabrik.de/africa/angola/), derived from OpenStreetMap and distributed under ODbL 1.0.
- Default routing profile: OSRM's `car.lua` (initially used for taxi and mototáxi; motorcycle-specific routing requires separate profile design and field validation).
- Algorithm: MLD, the OSRM project's recommended default for most deployments.

## Requirements

- Linux host or development machine with Docker Engine and the Docker Compose plugin.
- Enough free disk space and memory for the Angola extract and the processed road graph. The extract itself is approximately 80 MB at the time of writing; the processed graph needs additional space.
- No API key or paid routing subscription.

## Prepare the Angola road graph

From the repository root:

```sh
sh infra/osrm/prepare-angola.sh
```

The script downloads the latest Angola `.osm.pbf` extract, verifies its MD5 checksum, then runs OSRM extraction, partitioning and customization in the official OSRM container.

The first graph preparation is CPU- and memory-intensive. Do not run it inside a Vercel Function.

## Start the routing service

```sh
docker compose -f infra/osrm/docker-compose.yml up -d
```

The service listens on `http://127.0.0.1:5000` on the host. It is deliberately bound to loopback and is not exposed directly to the public internet.

Test the API locally (replace the sample coordinates with two known, drivable locations):

```sh
curl 'http://127.0.0.1:5000/route/v1/driving/13.4050,-8.8383;13.4200,-8.8300?overview=false'
```

A successful response has `"code":"Ok"` and at least one route with positive `distance` and `duration`.

## Connect MARKA to the host

The MARKA backend already reads `MOBILITY_ROUTING_BASE_URL`. After the host is provisioned, place an HTTPS reverse proxy with access controls in front of OSRM and set this Vercel environment variable to that private/protected endpoint, for example:

```env
MOBILITY_ROUTING_BASE_URL=https://routing.your-domain.example/
```

The example hostname is illustrative only; do not configure it literally. Do not expose port 5000 publicly without authentication, request limits and network controls. Keep the public demo endpoint out of the production path once the self-hosted endpoint has passed route and fare validation.

## Operational constraints

- OSRM and the data download are free; a continuously available production host, electricity, bandwidth and storage are not automatically free.
- Vercel Functions are not a suitable place to run the persistent OSRM graph service. The OSRM service must run on an always-on machine/container reachable by the MARKA backend.
- This repository setup does not provision a server, create DNS, or change production environment variables.
- Before production activation, test route coverage across Luanda and other intended service areas, verify the returned road distance/time, load-test concurrency, and pin the exact OSRM image version that passed validation.
- OpenStreetMap attribution must be shown in the product: “© OpenStreetMap contributors”. ODbL terms apply to the data; review them before redistributing a derived database.

## Updating the road data

Re-run `sh infra/osrm/prepare-angola.sh` during a maintenance window to download and rebuild the graph from the latest extract. The running service should be restarted after a successful rebuild.
