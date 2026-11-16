import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseMobilityLandmarkRecords } from "../src/services/mobility/places/mobility-landmark-import.validation";

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const inputPath = args.find((argument) => argument !== "--dry-run");
  if (!inputPath) {
    throw new Error("Usage: npm run mobility:landmarks:import -- <path-to-json> [--dry-run]");
  }

  const raw = await readFile(resolve(process.cwd(), inputPath), "utf8");
  const parsed: unknown = JSON.parse(raw);
  const records = parseMobilityLandmarkRecords(parsed);

  if (dryRun) {
    console.log(`Mobility landmark dry run passed: ${records.length} valid record(s); no database writes performed.`);
    return;
  }

  let created = 0;
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const record of records) {
      const existingBySource = await tx.mobilityLandmark.findFirst({
        where: { sourceRef: record.sourceRef },
        select: { id: true },
      });
      const existing = existingBySource ?? await tx.mobilityLandmark.findFirst({
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
  }, { maxWait: 10_000, timeout: 60_000 });

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
