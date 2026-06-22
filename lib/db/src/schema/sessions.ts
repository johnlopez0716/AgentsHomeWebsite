import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const sessionsTable = pgTable("auth_sessions", {
  token: text("token").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  title: text("title").notNull(),
  sisuId: text("sisu_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export type Session = typeof sessionsTable.$inferSelect;
