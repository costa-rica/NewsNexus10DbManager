import { Op } from "sequelize";
import {
  Article,
  ArticleApproved,
  ArticleIsRelevant,
} from "newsnexus10db";

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type DeleteArticlesResult = {
  deletedCount: number;
  cutoffDate: string;
};

export async function deleteOldUnapprovedArticles(
  daysOldThreshold: number,
): Promise<DeleteArticlesResult> {
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

  const whereClause: Record<string, unknown> = {
    publishedDate: { [Op.lt]: cutoffDateOnly },
  };

  if (protectedIds.size > 0) {
    whereClause.id = { [Op.notIn]: Array.from(protectedIds) };
  }

  const deletedCount = await Article.destroy({ where: whereClause });

  return { deletedCount, cutoffDate: cutoffDateOnly };
}
