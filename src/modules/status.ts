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

  const [totalArticles, irrelevantArticles, approvedArticles, oldArticles] =
    await Promise.all([
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
    ]);

  return {
    totalArticles,
    irrelevantArticles,
    approvedArticles,
    oldArticles,
    cutoffDate: cutoffDateOnly,
  };
}
