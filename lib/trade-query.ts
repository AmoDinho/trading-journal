import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  cashFlow,
  importBatch,
  playbook,
  tag,
  trade,
  tradeTag,
  tradingAccount,
} from "@/lib/db/schema";
import { tradeNet } from "@/lib/format";
import { historyVisible } from "@/lib/imports";

export type TradeRow = {
  id: string;
  accountId: string;
  accountName: string;
  symbol: string;
  side: string;
  volume: number;
  openTime: string;
  closeTime: string;
  openPrice: number;
  closePrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  commission: number;
  swap: number;
  profit: number;
  net: number;
  exitReason: string;
  initialStop: number | null;
  rating: number | null;
  notes: string;
  playbookId: string | null;
  tags: { id: string; category: string; name: string }[];
};

export async function loadTradeLog(userId: string) {
  const rows = await db
    .select({
      trade,
      accountName: tradingAccount.name,
    })
    .from(trade)
    .innerJoin(tradingAccount, eq(trade.accountId, tradingAccount.id))
    .leftJoin(importBatch, eq(trade.importId, importBatch.id))
    .where(and(eq(trade.userId, userId), historyVisible(trade.importId)));

  const tagRows = await db
    .select({
      tradeId: tradeTag.tradeId,
      id: tag.id,
      category: tag.category,
      name: tag.name,
    })
    .from(tradeTag)
    .innerJoin(tag, eq(tradeTag.tagId, tag.id));

  const tagsByTrade = new Map<string, TradeRow["tags"]>();
  for (const row of tagRows) {
    const list = tagsByTrade.get(row.tradeId) ?? [];
    list.push({ id: row.id, category: row.category, name: row.name });
    tagsByTrade.set(row.tradeId, list);
  }

  const trades: TradeRow[] = rows
    .map(({ trade: t, accountName }) => {
      const profit = Number(t.profit);
      const commission = Number(t.commission);
      const swap = Number(t.swap);
      return {
        id: t.id,
        accountId: t.accountId,
        accountName,
        symbol: t.symbol,
        side: t.side,
        volume: Number(t.volume),
        openTime: t.openTime.toISOString(),
        closeTime: t.closeTime.toISOString(),
        openPrice: Number(t.openPrice),
        closePrice: Number(t.closePrice),
        stopLoss: t.stopLoss == null ? null : Number(t.stopLoss),
        takeProfit: t.takeProfit == null ? null : Number(t.takeProfit),
        commission,
        swap,
        profit,
        net: tradeNet(profit, commission, swap),
        exitReason: t.exitReason,
        initialStop: t.initialStop == null ? null : Number(t.initialStop),
        rating: t.rating,
        notes: t.notes ?? "",
        playbookId: t.playbookId,
        tags: tagsByTrade.get(t.id) ?? [],
      };
    })
    .sort(
      (a, b) => new Date(b.closeTime).getTime() - new Date(a.closeTime).getTime(),
    );

  const accounts = await db
    .select({
      id: tradingAccount.id,
      name: tradingAccount.name,
    })
    .from(tradingAccount)
    .where(eq(tradingAccount.userId, userId));

  const playbooks = await db
    .select({ id: playbook.id, name: playbook.name })
    .from(playbook)
    .where(eq(playbook.userId, userId));

  const tags = await db
    .select({ id: tag.id, category: tag.category, name: tag.name })
    .from(tag)
    .where(eq(tag.userId, userId));

  const flows = await db
    .select({ flow: cashFlow })
    .from(cashFlow)
    .leftJoin(importBatch, eq(cashFlow.importId, importBatch.id))
    .where(and(eq(cashFlow.userId, userId), historyVisible(cashFlow.importId)));

  return {
    trades,
    accounts,
    playbooks,
    tags,
    cashFlows: flows.map(({ flow }) => ({
      id: flow.id,
      accountId: flow.accountId,
      type: flow.type,
      amount: Number(flow.amount),
      time: flow.time.toISOString(),
      comment: flow.comment,
    })),
  };
}
