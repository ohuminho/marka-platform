import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

async function findTestFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findTestFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      (entry.name.endsWith(".test.ts") ||
        entry.name.endsWith(".spec.ts"))
    ) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

async function main(): Promise<void> {
  const testsRoot = join(process.cwd(), "tests", "unit");
  const testFiles = await findTestFiles(testsRoot);

  if (testFiles.length === 0) {
    console.log("No unit tests found.");
    return;
  }

  console.log(`Running ${testFiles.length} unit test file(s)...`);

  for (const testFile of testFiles) {
    console.log(`\n→ ${testFile}`);

    await import(pathToFileURL(testFile).href);
  }

  console.log("\nAll unit tests passed.");
}

main().catch((error) => {
  console.error("\nUnit tests failed.");
  console.error(error);
  process.exitCode = 1;
});
