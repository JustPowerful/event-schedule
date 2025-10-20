import { relations } from "drizzle-orm";
import {
  uuid,
  pgTable,
  varchar,
  date,
  time,
  pgEnum,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const recurrenceTypeEnum = pgEnum("recurrence_type", [
  "none",
  "daily",
  "weekly",
  "monthly",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  firstname: varchar("firstname").notNull(),
  lastname: varchar("lastname").notNull(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
});

export const recurringEvent = pgTable("recurring_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title").notNull(),
  description: varchar("description").notNull(),
  startDate: date("start_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
  authorId: uuid("author_id").notNull(),
  // Recurrence fields
  recurrenceType: recurrenceTypeEnum("recurrence_type")
    .notNull()
    .default("none"),
  // How often the event recurs (e.g., every 2 days if "daily")
  // or (e.g., every 3 weeks if "weekly")
  recurrenceInterval: integer("recurrence_interval").notNull().default(1),
  // The limit of recurrence
  recurrenceEndDate: date("recurrence_end_date"),
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
  isCancelled: boolean("is_cancelled").notNull().default(false),
  isModified: boolean("is_modified").notNull().default(false),
  recurringEventId: uuid("recurring_event_id"),
});

export const usersRelations = relations(users, ({ many }) => ({
  events: many(event),
  recurringEvents: many(recurringEvent),
}));

export const recurringEventRelations = relations(
  recurringEvent,
  ({ one, many }) => ({
    author: one(users, {
      fields: [recurringEvent.authorId],
      references: [users.id],
    }),
    instances: many(event),
  })
);

export const eventRelations = relations(event, ({ one }) => ({
  author: one(users, {
    fields: [event.authorId],
    references: [users.id],
  }),
  recurringEvent: one(recurringEvent, {
    fields: [event.id],
    references: [recurringEvent.id],
  }),
}));
