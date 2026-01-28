import { Op } from "sequelize";
import {
  Article,
  ArticleApproved,
  ArticleIsRelevant,
} from "newsnexus10db";
import { DatabaseStatus } from "../types/status";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getDatabaseStatus(
  daysOldThreshold = 180,
): Promise<DatabaseStatus> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOldThreshold);
  const cutoffDateOnly = toDateOnly(cutoffDate);

  const [relevantRows, approvedRows] = await Promise.all([
    ArticleIsRelevant.findAll({
      attributes: ["articleId"],
      raw: true,
    }),
    ArticleApproved.findAll({
      attributes: ["articleId"],
      raw: true,
    }),
  ]);

  const protectedIds = new Set<number>();

  for (const row of relevantRows) {
    const articleId = Number((row as { articleId?: number }).articleId);
    if (Number.isFinite(articleId)) {
      protectedIds.add(articleId);
    }
  }

  for (const row of approvedRows) {
    const articleId = Number((row as { articleId?: number }).articleId);
    if (Number.isFinite(articleId)) {
      protectedIds.add(articleId);
    }
  }

  const deletableConditions: Record<string, unknown>[] = [
    { publishedDate: { [Op.lt]: cutoffDateOnly } },
  ];

  if (protectedIds.size > 0) {
    deletableConditions.push({ id: { [Op.notIn]: Array.from(protectedIds) } });
  }

  const [
    totalArticles,
    irrelevantArticles,
    approvedArticles,
    oldArticles,
    deletableOldArticles,
  ] = await Promise.all([
    Article.count(),
    ArticleIsRelevant.count({
      where: { isRelevant: false },
      distinct: true,
      col: "articleId",
    }),
    ArticleApproved.count({
      distinct: true,
      col: "articleId",
    }),
    Article.count({
      where: { publishedDate: { [Op.lt]: cutoffDateOnly } },
    }),
    Article.count({ where: { [Op.and]: deletableConditions } }),
  ]);

  return {
    totalArticles,
    irrelevantArticles,
    approvedArticles,
    oldArticles,
    deletableOldArticles,
    cutoffDate: cutoffDateOnly,
  };
}
