import { CliOptions } from "../types/cli";

export const DEFAULT_DELETE_DAYS = 180;

function parseNumber(value: string, flagName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    throw new Error(`Invalid value for ${flagName}: ${value}`);
  }
  return parsed;
}

export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg.startsWith("--delete_articles")) {
      let value: string | undefined;

      if (arg.includes("=")) {
        value = arg.split("=")[1];
      } else if (args[i + 1] && !args[i + 1].startsWith("--")) {
        value = args[i + 1];
        i += 1;
      }

      if (!value) {
        options.deleteArticlesDays = DEFAULT_DELETE_DAYS;
      } else {
        options.deleteArticlesDays = parseNumber(value, "--delete_articles");
      }

      continue;
    }

    if (arg.startsWith("--zip_file")) {
      let value: string | undefined;

      if (arg.includes("=")) {
        value = arg.split("=")[1];
      } else if (args[i + 1] && !args[i + 1].startsWith("--")) {
        value = args[i + 1];
        i += 1;
      }

      if (!value) {
        throw new Error("--zip_file requires a full path argument");
      }

      options.zipFilePath = value;
      continue;
    }
  }

  return options;
}
