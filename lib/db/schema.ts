import {
  boolean,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  timezone: text("timezone").default("Africa/Johannesburg").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const tradingAccount = pgTable("trading_account", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  serverTz: text("server_tz").notNull().default("GMT+2/+3"),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const importBatch = pgTable("import_batch", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id")
    .notNull()
    .references(() => tradingAccount.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  format: text("format").notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  parsedMs: integer("parsed_ms").notNull().default(0),
  positionsInFile: integer("positions_in_file").notNull(),
  newTrades: integer("new_trades").notNull(),
  alreadyImported: integer("already_imported").notNull(),
  newCashFlows: integer("new_cash_flows").notNull(),
  warnings: integer("warnings").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const trade = pgTable(
  "trade",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => tradingAccount.id, { onDelete: "cascade" }),
    importId: text("import_id").references(() => importBatch.id, {
      onDelete: "set null",
    }),
    mt5PositionId: text("mt5_position_id").notNull(),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(),
    volume: numeric("volume", { precision: 12, scale: 4 }).notNull(),
    openTime: timestamp("open_time", { withTimezone: true }).notNull(),
    closeTime: timestamp("close_time", { withTimezone: true }).notNull(),
    openPrice: numeric("open_price", { precision: 18, scale: 8 }).notNull(),
    closePrice: numeric("close_price", { precision: 18, scale: 8 }).notNull(),
    stopLoss: numeric("stop_loss", { precision: 18, scale: 8 }),
    takeProfit: numeric("take_profit", { precision: 18, scale: 8 }),
    commission: numeric("commission", { precision: 14, scale: 2 })
      .notNull()
      .default("0"),
    swap: numeric("swap", { precision: 14, scale: 2 }).notNull().default("0"),
    profit: numeric("profit", { precision: 14, scale: 2 }).notNull(),
    exitReason: text("exit_reason").notNull(),
    initialStop: numeric("initial_stop", { precision: 18, scale: 8 }),
    rating: integer("rating"),
    notes: text("notes"),
    playbookId: text("playbook_id").references(() => playbook.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("trade_account_position").on(
      table.accountId,
      table.mt5PositionId,
    ),
  ],
);

export const cashFlow = pgTable(
  "cash_flow",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id")
      .notNull()
      .references(() => tradingAccount.id, { onDelete: "cascade" }),
    importId: text("import_id").references(() => importBatch.id, {
      onDelete: "set null",
    }),
    mt5DealId: text("mt5_deal_id").notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    time: timestamp("time", { withTimezone: true }).notNull(),
    comment: text("comment"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cash_flow_account_deal").on(table.accountId, table.mt5DealId),
  ],
);

export const playbook = pgTable("playbook", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tag = pgTable(
  "tag",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    name: text("name").notNull(),
  },
  (table) => [
    uniqueIndex("tag_user_category_name").on(
      table.userId,
      table.category,
      table.name,
    ),
  ],
);

export const tradeTag = pgTable(
  "trade_tag",
  {
    tradeId: text("trade_id")
      .notNull()
      .references(() => trade.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.tradeId, table.tagId] })],
);

export const journalEntry = pgTable(
  "journal_entry",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    plan: text("plan").notNull().default(""),
    happened: text("happened").notNull().default(""),
    lessons: text("lessons").notNull().default(""),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex("journal_user_date").on(table.userId, table.date)],
);
