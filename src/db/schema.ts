import { uuid, pgTable, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstname: varchar("firstname").notNull(),
  lastname: varchar("lastname").notNull(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
});
