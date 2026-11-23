#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DATA_DIR="$ROOT_DIR/data"
IMAGE="${OSRM_IMAGE:-ghcr.io/project-osrm/osrm-backend:latest}"
PBF_URL="https://download.geofabrik.de/africa/angola-latest.osm.pbf"
MD5_URL="$PBF_URL.md5"

mkdir -p "$DATA_DIR"
cd "$DATA_DIR"

echo "Downloading the latest free Angola OpenStreetMap extract from Geofabrik..."
curl --fail --location --retry 3 "$PBF_URL" --output angola-latest.osm.pbf
curl --fail --location --retry 3 "$MD5_URL" --output angola-latest.osm.pbf.md5

echo "Verifying the downloaded extract..."
md5sum -c angola-latest.osm.pbf.md5

echo "Preparing the OSRM road graph (this can take several minutes)..."
docker pull "$IMAGE"
docker run --rm -t -v "$DATA_DIR:/data" "$IMAGE" \
  osrm-extract -p /opt/car.lua /data/angola-latest.osm.pbf
docker run --rm -t -v "$DATA_DIR:/data" "$IMAGE" \
  osrm-partition /data/angola-latest.osrm
docker run --rm -t -v "$DATA_DIR:/data" "$IMAGE" \
  osrm-customize /data/angola-latest.osrm

echo "OSRM graph prepared. Start it with: docker compose -f infra/osrm/docker-compose.yml up -d"
