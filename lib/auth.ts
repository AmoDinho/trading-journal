import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { account, session, tradingAccount, user, verification } from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      timezone: {
        type: "string",
        required: false,
        defaultValue: "Africa/Johannesburg",
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (created) => {
          await db.insert(tradingAccount).values({
            userId: created.id,
            name: "Personal",
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});
