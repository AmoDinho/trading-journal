import { and, eq, inArray, isNull, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { cashFlow, importBatch, trade, tradingAccount } from "@/lib/db/schema";
import type { ParsedCashFlow, ParsedTrade } from "@/lib/mt5/types";
import type { z } from "zod";
import type { importPayloadSchema } from "@/lib/mt5/payload";

export function historyVisible(importId: AnyColumn): SQL {
  return sql`(${importId} is null or ${importBatch.deletedAt} is null)`;
}

export async function getOwnedAccount(userId: string, accountId: string) {
  const [account] = await db
    .select()
    .from(tradingAccount)
    .where(
      and(eq(tradingAccount.id, accountId), eq(tradingAccount.userId, userId)),
    )
    .limit(1);
  return account ?? null;
}

export async function previewImport(
  userId: string,
  accountId: string,
  trades: ParsedTrade[],
  cashFlows: ParsedCashFlow[],
) {
  const positionIds = trades.map((t) => t.mt5PositionId);
  const dealIds = cashFlows.map((c) => c.mt5DealId);

  const existingTrades =
    positionIds.length === 0
      ? []
      : await db
          .select({
            id: trade.id,
            positionId: trade.mt5PositionId,
            deletedAt: importBatch.deletedAt,
          })
          .from(trade)
          .leftJoin(importBatch, eq(trade.importId, importBatch.id))
          .where(
            and(
              eq(trade.userId, userId),
              eq(trade.accountId, accountId),
              inArray(trade.mt5PositionId, positionIds),
            ),
          );

  const existingFlows =
    dealIds.length === 0
      ? []
      : await db
          .select({
            id: cashFlow.id,
            dealId: cashFlow.mt5DealId,
            deletedAt: importBatch.deletedAt,
          })
          .from(cashFlow)
          .leftJoin(importBatch, eq(cashFlow.importId, importBatch.id))
          .where(
            and(
              eq(cashFlow.userId, userId),
              eq(cashFlow.accountId, accountId),
              inArray(cashFlow.mt5DealId, dealIds),
            ),
          );

  const activePositions = new Set(
    existingTrades.filter((t) => t.deletedAt == null).map((t) => t.positionId),
  );
  const hiddenTrades = new Map(
    existingTrades
      .filter((t) => t.deletedAt != null)
      .map((t) => [t.positionId, t.id]),
  );
  const activeDeals = new Set(
    existingFlows.filter((t) => t.deletedAt == null).map((t) => t.dealId),
  );
  const hiddenFlows = new Map(
    existingFlows.filter((t) => t.deletedAt != null).map((t) => [t.dealId, t.id]),
  );

  const newTrades = trades.filter(
    (t) => !activePositions.has(t.mt5PositionId) && !hiddenTrades.has(t.mt5PositionId),
  );
  const restoredTradeIds = trades.flatMap((t) => {
    const id = hiddenTrades.get(t.mt5PositionId);
    return id ? [id] : [];
  });
  const alreadyImported = trades.length - newTrades.length - restoredTradeIds.length;
  const newCashFlows = cashFlows.filter(
    (c) => !activeDeals.has(c.mt5DealId) && !hiddenFlows.has(c.mt5DealId),
  );
  const restoredFlowIds = cashFlows.flatMap((c) => {
    const id = hiddenFlows.get(c.mt5DealId);
    return id ? [id] : [];
  });

  return {
    newTrades,
    restoredTradeIds,
    alreadyImported,
    newCashFlows,
    restoredFlowIds,
  };
}

export async function commitImport(
  userId: string,
  payload: z.infer<typeof importPayloadSchema>,
) {
  const { newTrades, restoredTradeIds, alreadyImported, newCashFlows, restoredFlowIds } =
    await previewImport(userId, payload.accountId, payload.trades, payload.cashFlows);

  const batch = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(importBatch)
      .values({
        userId,
        accountId: payload.accountId,
        filename: payload.meta.name,
        format: payload.meta.format,
        fileSizeBytes: payload.meta.size,
        parsedMs: payload.meta.parsedMs,
        positionsInFile: payload.trades.length,
        newTrades: newTrades.length + restoredTradeIds.length,
        alreadyImported,
        newCashFlows: newCashFlows.length + restoredFlowIds.length,
        warnings: payload.warnings.length,
      })
      .returning();

    if (!created) {
      throw new Error("Could not record import");
    }

    if (newTrades.length > 0) {
      await tx.insert(trade).values(
        newTrades.map((t) => ({
          userId,
          accountId: payload.accountId,
          importId: created.id,
          mt5PositionId: t.mt5PositionId,
          symbol: t.symbol,
          side: t.side,
          volume: String(t.volume),
          openTime: new Date(t.openTime),
          closeTime: new Date(t.closeTime),
          openPrice: String(t.openPrice),
          closePrice: String(t.closePrice),
          stopLoss: t.stopLoss == null ? null : String(t.stopLoss),
          takeProfit: t.takeProfit == null ? null : String(t.takeProfit),
          commission: String(t.commission),
          swap: String(t.swap),
          profit: String(t.profit),
          exitReason: t.exitReason,
        })),
      );
    }

    if (restoredTradeIds.length > 0) {
      await tx
        .update(trade)
        .set({ importId: created.id })
        .where(and(eq(trade.userId, userId), inArray(trade.id, restoredTradeIds)));
    }

    if (newCashFlows.length > 0) {
      await tx.insert(cashFlow).values(
        newCashFlows.map((c) => ({
          userId,
          accountId: payload.accountId,
          importId: created.id,
          mt5DealId: c.mt5DealId,
          type: c.type,
          amount: String(c.amount),
          time: new Date(c.time),
          comment: c.comment,
        })),
      );
    }

    if (restoredFlowIds.length > 0) {
      await tx
        .update(cashFlow)
        .set({ importId: created.id })
        .where(and(eq(cashFlow.userId, userId), inArray(cashFlow.id, restoredFlowIds)));
    }

    return created;
  });

  return {
    batch,
    newTrades: newTrades.length + restoredTradeIds.length,
    alreadyImported,
    newCashFlows: newCashFlows.length + restoredFlowIds.length,
  };
}

export async function softDeleteImport(userId: string, importId: string) {
  const [batch] = await db
    .update(importBatch)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(importBatch.id, importId),
        eq(importBatch.userId, userId),
        isNull(importBatch.deletedAt),
      ),
    )
    .returning({ id: importBatch.id });
  return batch ?? null;
}
