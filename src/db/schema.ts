import { relations } from "drizzle-orm";
import { uuid, pgTable, varchar, date, time } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstname: varchar("firstname").notNull(),
  lastname: varchar("lastname").notNull(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
});

export const event = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title").notNull(),
  description: varchar("description").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
  authorId: uuid("author_id").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  events: many(event),
}));
