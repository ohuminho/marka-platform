import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

type LandmarkInput = {
  name: string;
  aliases?: string[];
  province?: string | null;
  municipality?: string | null;
  category?: string;
  latitude: number;
  longitude: number;
  source: string;
  sourceRef: string;
  verifiedAt: string;
};

type NormalizedLandmark = {
  name: string;
  normalizedName: string;
  aliases: string[];
  countryCode: "AO";
  province: string | null;
  municipality: string | null;
  category: string;
  latitude: number;
  longitude: number;
  source: string;
  sourceRef: string;
  verifiedAt: Date;
  isActive: true;
};

const prisma = new PrismaClient();

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-AO")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`Invalid "${field}": expected non-empty text (max ${max}).`);
  }
  return value.trim();
}

function parseLandmark(value: unknown, index: number): NormalizedLandmark {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Record ${index + 1} must be an object.`);
  }

  const item = value as Record<string, unknown>;
  const name = requiredText(item.name, "name", 180);
  const normalizedName = normalize(name);
  if (!normalizedName) throw new Error(`Record ${index + 1}: name normalizes to an empty value.`);

  const latitude = item.latitude;
  const longitude = item.longitude;
  if (typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error(`Record ${index + 1}: latitude must be a finite number between -90 and 90.`);
  }
  if (typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error(`Record ${index + 1}: longitude must be a finite number between -180 and 180.`);
  }
  // Broad Angola mainland + Cabinda envelope; not a substitute for national polygon validation.
  if (latitude < -18.1 || latitude > -4.2 || longitude < 11.5 || longitude > 24.1) {
    throw new Error(`Record ${index + 1}: coordinates fall outside the Angola validation envelope.`);
  }

  const source = requiredText(item.source, "source", 32).toUpperCase();
  if (!["OPENSTREETMAP", "OFFICIAL", "FIELD_VERIFIED", "PARTNER_VERIFIED"].includes(source)) {
    throw new Error(`Record ${index + 1}: source must be OPENSTREETMAP, OFFICIAL, FIELD_VERIFIED or PARTNER_VERIFIED.`);
  }
  const sourceRef = requiredText(item.sourceRef, "sourceRef", 255);
  const isOsmReference = /^osm:(node|way|relation)\/\d+$/.test(sourceRef);
  let isHttpsReference = false;
  try {
    const referenceUrl = new URL(sourceRef);
    isHttpsReference = referenceUrl.protocol === "https:" && Boolean(referenceUrl.hostname);
  } catch {
    isHttpsReference = false;
  }
  if (!isOsmReference && !isHttpsReference) {
    throw new Error(`Record ${index + 1}: sourceRef must be an HTTPS URL or an osm:node/ID, osm:way/ID or osm:relation/ID reference.`);
  }
  const verifiedAtRaw = requiredText(item.verifiedAt, "verifiedAt", 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(verifiedAtRaw)) {
    throw new Error(`Record ${index + 1}: verifiedAt must be an ISO 8601 timestamp with timezone.`);
  }
  const verifiedAt = new Date(verifiedAtRaw);
  if (Number.isNaN(verifiedAt.getTime())) {
    throw new Error(`Record ${index + 1}: verifiedAt must be a valid ISO date.`);
  }

  const aliasesInput = item.aliases ?? [];
  if (!Array.isArray(aliasesInput) || aliasesInput.length > 20 || aliasesInput.some((alias) => typeof alias !== "string" || alias.trim().length > 180)) {
    throw new Error(`Record ${index + 1}: aliases must contain at most 20 strings of up to 180 characters.`);
  }
  const aliases = [...new Set(
    (aliasesInput as string[])
      .map((alias) => normalize(alias))
      .filter((alias) => alias && alias !== normalizedName),
  )];

  const province = item.province == null ? null : requiredText(item.province, "province", 100);
  const municipality = item.municipality == null ? null : requiredText(item.municipality, "municipality", 120);
  const category = item.category == null ? "PLACE" : requiredText(item.category, "category", 48).toUpperCase();

  return {
    name,
    normalizedName,
    aliases,
    countryCode: "AO",
    province,
    municipality,
    category,
    latitude,
    longitude,
    source,
    sourceRef,
    verifiedAt,
    isActive: true,
  };
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: npm run mobility:landmarks:import -- <path-to-json>");
  }

  const raw = await readFile(resolve(process.cwd(), inputPath), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Import file must contain a JSON array.");

  const records = parsed.map(parseLandmark);
  const uniqueKeys = new Set<string>();
  const uniqueSourceRefs = new Set<string>();
  for (const record of records) {
    const key = `${record.normalizedName}::${record.municipality ?? ""}`;
    if (uniqueKeys.has(key)) throw new Error(`Duplicate landmark in import: ${key}`);
    if (uniqueSourceRefs.has(record.sourceRef)) throw new Error(`Duplicate sourceRef in import: ${record.sourceRef}`);
    uniqueKeys.add(key);
    uniqueSourceRefs.add(record.sourceRef);
  }

  let created = 0;
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      const existing = await tx.mobilityLandmark.findFirst({
        where: {
          normalizedName: record.normalizedName,
          municipality: record.municipality,
        },
        select: { id: true },
      });

      if (existing) {
        await tx.mobilityLandmark.update({
          where: { id: existing.id },
          data: { ...record, updatedAt: new Date() },
        });
        updated += 1;
      } else {
        await tx.mobilityLandmark.create({ data: record });
        created += 1;
      }
    }
  });

  console.log(`Mobility landmark import complete: ${created} created, ${updated} updated, ${records.length} processed.`);
}

main()
  .catch((error) => {
    console.error("Mobility landmark import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
