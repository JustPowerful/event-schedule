import { z } from "zod";
import { buildJsonSchemas } from "fastify-zod";

const eventCore = {
  title: z.string().min(1),
  description: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
};

const createEventSchema = z.object({
  ...eventCore,
  recurrenceType: z
    .enum(["none", "daily", "weekly", "monthly"])
    .default("none"),
  recurrenceInterval: z.number().min(1).optional(),
  recurrenceEndDate: z.string().min(1).optional(),
});

const deleteEventSchema = z.object({
  id: z.string().min(1),
});

const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().min(1),
});

// createEventSchema already contains recurrenceEndDate, so we can just use a partial of it
const updateRecurringEventSchema = createEventSchema.partial().extend({
  id: z.string().min(1),
});

const listEventsSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  limit: z.number().min(1).default(5),
  page: z.number().min(1).default(1),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type DeleteEventInput = z.infer<typeof deleteEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type UpdateRecurringEventInput = z.infer<
  typeof updateRecurringEventSchema
>;
export type ListEventsInput = z.infer<typeof listEventsSchema>;

export const { schemas: eventSchemas, $ref } = buildJsonSchemas(
  {
    createEventSchema,
    deleteEventSchema,
    updateEventSchema,
    updateRecurringEventSchema,
    listEventsSchema,
  },
  { $id: "EventSchema" }
);
