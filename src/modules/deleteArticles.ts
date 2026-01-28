import { Op } from "sequelize";
import {
  Article,
  ArticleApproved,
  ArticleIsRelevant,
} from "newsnexus10db";
import { logger } from "../config/logger";

const DELETE_BATCH_SIZE = 5000;

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

  const conditions: Record<string, unknown>[] = [
    { publishedDate: { [Op.lt]: cutoffDateOnly } },
  ];

  if (protectedIds.size > 0) {
    conditions.push({ id: { [Op.notIn]: Array.from(protectedIds) } });
  }

  const totalToDelete = await Article.count({
    where: { [Op.and]: conditions },
  });

  logger.info(
    `Found ${totalToDelete} articles eligible for deletion (before ${cutoffDateOnly}).`,
  );

  if (totalToDelete === 0) {
    return { deletedCount: 0, cutoffDate: cutoffDateOnly };
  }

  let deletedCount = 0;
  let lastId = 0;
  let batchNumber = 0;

  while (deletedCount < totalToDelete) {
    batchNumber += 1;
    const batchConditions = [
      ...conditions,
      { id: { [Op.gt]: lastId } },
    ];

    const rows = await Article.findAll({
      attributes: ["id"],
      where: { [Op.and]: batchConditions },
      order: [["id", "ASC"]],
      limit: DELETE_BATCH_SIZE,
      raw: true,
    });

    if (rows.length === 0) {
      break;
    }

    const ids = rows
      .map((row) => Number((row as { id?: number }).id))
      .filter((id) => Number.isFinite(id));

    if (ids.length === 0) {
      break;
    }

    await Article.destroy({ where: { id: { [Op.in]: ids } } });
    deletedCount += ids.length;
    lastId = ids[ids.length - 1];

    logger.info(
      `Deleted ${deletedCount} of ${totalToDelete} articles (batch ${batchNumber}).`,
    );
  }

  return { deletedCount, cutoffDate: cutoffDateOnly };
}
