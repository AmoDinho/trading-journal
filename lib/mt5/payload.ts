import { z } from "zod";

export const parsedTradeSchema = z.object({
  mt5PositionId: z.string().min(1),
  symbol: z.string().min(1),
  side: z.enum(["long", "short"]),
  volume: z.number().positive(),
  openTime: z.string(),
  closeTime: z.string(),
  openPrice: z.number().nonnegative(),
  closePrice: z.number().nonnegative(),
  stopLoss: z.number().nullable(),
  takeProfit: z.number().nullable(),
  commission: z.number(),
  swap: z.number(),
  profit: z.number(),
  exitReason: z.enum(["stop_out", "stop_loss", "take_profit", "manual"]),
});

export const parsedCashFlowSchema = z.object({
  mt5DealId: z.string().min(1),
  type: z.enum(["deposit", "withdrawal"]),
  amount: z.number(),
  time: z.string(),
  comment: z.string().nullable(),
});

export const warningSchema = z.object({
  kind: z.literal("partial_close"),
  positionId: z.string(),
  dealCount: z.number().int().positive(),
});

export const fileMetaSchema = z.object({
  name: z.string().min(1),
  size: z.number().int().nonnegative(),
  format: z.enum(["xlsx", "csv", "html"]),
  parsedMs: z.number().int().nonnegative(),
});

export const importPayloadSchema = z.object({
  accountId: z.string().min(1),
  meta: fileMetaSchema,
  reportNetProfit: z.number().nullable(),
  trades: z.array(parsedTradeSchema),
  cashFlows: z.array(parsedCashFlowSchema),
  warnings: z.array(warningSchema),
});
