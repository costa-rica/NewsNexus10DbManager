import AdmZip from "adm-zip";
import csvParser from "csv-parser";
import fs from "fs";
import os from "os";
import path from "path";
import * as db from "newsnexus10db";
import { sequelize } from "newsnexus10db";
import { logger } from "../config/logger";

type ImportZipResult = {
  totalRecords: number;
  importedTables: string[];
  skippedFiles: string[];
};

type ModelRegistry = Record<string, { bulkCreate: Function }>;

function getModelRegistry(): ModelRegistry {
  const registry: ModelRegistry = {};

  for (const [name, value] of Object.entries(db)) {
    if (value && typeof (value as { bulkCreate?: Function }).bulkCreate === "function") {
      registry[name] = value as { bulkCreate: Function };
    }
  }

  return registry;
}

async function collectCsvFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(rootDir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await collectCsvFiles(fullPath)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".csv")) {
      results.push(fullPath);
    }
  }

  return results;
}

async function readCsvFile(filePath: string): Promise<Record<string, string>[]> {
  const records: Record<string, string>[] = [];

  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => records.push(row))
      .on("end", () => resolve())
      .on("error", (error) => reject(error));
  });

  return records;
}

export async function importZipFileToDatabase(
  zipFilePath: string,
): Promise<ImportZipResult> {
  const registry = getModelRegistry();
  const resolvedPath = path.resolve(zipFilePath);

  await fs.promises.access(resolvedPath, fs.constants.R_OK);

  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "newsnexus-db-import-"),
  );

  const skippedFiles: string[] = [];
  const importedTables: string[] = [];
  let totalRecords = 0;

  try {
    const zip = new AdmZip(resolvedPath);
    zip.extractAllTo(tempDir, true);

    const csvFiles = await collectCsvFiles(tempDir);

    if (csvFiles.length === 0) {
      throw new Error("No CSV files found inside the zip file");
    }

    logger.info("Disabling foreign key constraints for import");
    await sequelize.query("PRAGMA foreign_keys = OFF;");

    for (const csvFile of csvFiles) {
      const tableName = path.basename(csvFile, ".csv");
      const model = registry[tableName];

      if (!model) {
        skippedFiles.push(path.basename(csvFile));
        continue;
      }

      const records = await readCsvFile(csvFile);

      if (records.length === 0) {
        continue;
      }

      await model.bulkCreate(records, { ignoreDuplicates: true });
      totalRecords += records.length;
      if (!importedTables.includes(tableName)) {
        importedTables.push(tableName);
      }
    }

    logger.info("Re-enabling foreign key constraints after import");
    await sequelize.query("PRAGMA foreign_keys = ON;");

    return { totalRecords, importedTables, skippedFiles };
  } catch (error) {
    await sequelize.query("PRAGMA foreign_keys = ON;");
    throw error;
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}
