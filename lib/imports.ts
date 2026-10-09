import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cashFlow, importBatch, trade, tradingAccount } from "@/lib/db/schema";
import type { ParsedCashFlow, ParsedTrade } from "@/lib/mt5/types";
import type { z } from "zod";
import type { importPayloadSchema } from "@/lib/mt5/payload";

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
          .select({ id: trade.mt5PositionId })
          .from(trade)
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
          .select({ id: cashFlow.mt5DealId })
          .from(cashFlow)
          .where(
            and(
              eq(cashFlow.userId, userId),
              eq(cashFlow.accountId, accountId),
              inArray(cashFlow.mt5DealId, dealIds),
            ),
          );

  const knownPositions = new Set(existingTrades.map((t) => t.id));
  const knownDeals = new Set(existingFlows.map((t) => t.id));
  const newTrades = trades.filter((t) => !knownPositions.has(t.mt5PositionId));
  const alreadyImported = trades.length - newTrades.length;
  const newCashFlows = cashFlows.filter((c) => !knownDeals.has(c.mt5DealId));

  return { newTrades, alreadyImported, newCashFlows, knownPositions, knownDeals };
}

export async function commitImport(
  userId: string,
  payload: z.infer<typeof importPayloadSchema>,
) {
  const { newTrades, alreadyImported, newCashFlows } = await previewImport(
    userId,
    payload.accountId,
    payload.trades,
    payload.cashFlows,
  );

  const [batch] = await db
    .insert(importBatch)
    .values({
      userId,
      accountId: payload.accountId,
      filename: payload.meta.name,
      format: payload.meta.format,
      fileSizeBytes: payload.meta.size,
      parsedMs: payload.meta.parsedMs,
      positionsInFile: payload.trades.length,
      newTrades: newTrades.length,
      alreadyImported,
      newCashFlows: newCashFlows.length,
      warnings: payload.warnings.length,
    })
    .returning();

  if (!batch) {
    throw new Error("Could not record import");
  }

  if (newTrades.length > 0) {
    await db.insert(trade).values(
      newTrades.map((t) => ({
        userId,
        accountId: payload.accountId,
        importId: batch.id,
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

  if (newCashFlows.length > 0) {
    await db.insert(cashFlow).values(
      newCashFlows.map((c) => ({
        userId,
        accountId: payload.accountId,
        importId: batch.id,
        mt5DealId: c.mt5DealId,
        type: c.type,
        amount: String(c.amount),
        time: new Date(c.time),
        comment: c.comment,
      })),
    );
  }

  return {
    batch,
    newTrades: newTrades.length,
    alreadyImported,
    newCashFlows: newCashFlows.length,
  };
}
