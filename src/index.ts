import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { DEFAULT_DELETE_DAYS, parseCliArgs } from "./modules/cli";
import { DatabaseStatus } from "./types/status";

dotenv.config();

const { logger } = require("./config/logger") as typeof import("./config/logger");
const { initModels, sequelize } = require("newsnexus10db") as typeof import("newsnexus10db");

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logStatus(status: DatabaseStatus): void {
  logger.info("Database status summary:");
  logger.info(`- Total articles: ${status.totalArticles}`);
  logger.info(
    `- Articles marked not relevant: ${status.irrelevantArticles}`,
  );
  logger.info(`- Articles approved: ${status.approvedArticles}`);
  logger.info(
    `- Articles older than ${status.cutoffDate}: ${status.oldArticles}`,
  );
}

async function ensureDatabaseExists(): Promise<void> {
  const dbDir = process.env.PATH_DATABASE;
  const dbName = process.env.NAME_DB;

  if (!dbDir || !dbName) {
    throw new Error("Missing PATH_DATABASE or NAME_DB environment variables");
  }

  const dbPath = path.join(dbDir, dbName);

  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`🆕 Database not found. Creating new database at ${dbPath}`);
    await sequelize.sync();
  }
}

(async () => {
  try {
    const options = parseCliArgs(process.argv.slice(2));

    initModels();
    await ensureDatabaseExists();

    const { getDatabaseStatus } = await import("./modules/status");
    const { deleteOldUnapprovedArticles } = await import(
      "./modules/deleteArticles"
    );
    const { importZipFileToDatabase } = await import("./modules/zipImport");

    if (options.zipFilePath) {
      logger.info(`Importing database updates from zip: ${options.zipFilePath}`);
      const result = await importZipFileToDatabase(options.zipFilePath);
      logger.info(
        `Imported ${result.totalRecords} records across ${result.importedTables.length} tables`,
      );
      if (result.skippedFiles.length > 0) {
        logger.warn(
          `Skipped files with no matching model: ${result.skippedFiles.join(", ")}`,
        );
      }
    }

    if (options.deleteArticlesDays !== undefined) {
      const days = options.deleteArticlesDays ?? DEFAULT_DELETE_DAYS;
      logger.info(
        `Deleting articles older than ${days} days without relevance or approval`,
      );
      const result = await deleteOldUnapprovedArticles(days);
      logger.info(
        `Deleted ${result.deletedCount} articles older than ${result.cutoffDate}`,
      );
    }

    const status = await getDatabaseStatus();
    logStatus(status);

    await sequelize.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Fatal error: ${message}`, { error });
    console.error(message);
    await delay(100);
    process.exit(1);
  }
})();
