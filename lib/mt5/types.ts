export type ExitReason = "stop_out" | "stop_loss" | "take_profit" | "manual";
export type Side = "long" | "short";
export type CashFlowType = "deposit" | "withdrawal";
export type ReportFormat = "xlsx" | "csv" | "html";

export type ParsedTrade = {
  mt5PositionId: string;
  symbol: string;
  side: Side;
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
  exitReason: ExitReason;
};

export type ParsedCashFlow = {
  mt5DealId: string;
  type: CashFlowType;
  amount: number;
  time: string;
  comment: string | null;
};

export type ParseWarning = {
  kind: "partial_close";
  positionId: string;
  dealCount: number;
};

export type ParsedReport = {
  trades: ParsedTrade[];
  cashFlows: ParsedCashFlow[];
  openPositions: number;
  workingOrders: number;
  reportNetProfit: number | null;
  warnings: ParseWarning[];
  from: string | null;
  to: string | null;
};

export type FileMeta = {
  name: string;
  size: number;
  format: ReportFormat;
  parsedMs: number;
};

export function warningText(warning: ParseWarning): string {
  if (warning.kind === "partial_close") {
    return `Position ${warning.positionId} was partially closed in ${warning.dealCount} deals. It is imported once with total volume and average close price.`;
  }
  return "";
}
