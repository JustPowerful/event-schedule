import { FastifyPluginAsync } from "fastify";

import { event, recurringEvent } from "@/db/schema";
import {
  $ref,
  CreateEventInput,
  DeleteEventInput,
  ListEventsInput,
  UpdateEventInput,
  UpdateRecurringEventInput,
} from "@/schemas/event";
import { db } from "@/db";
import { and, asc, count, eq, gt, gte, lt, lte, ne, or } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth.middleware";

async function checkTimeConflict(
  database: typeof db,
  date: string,
  startTime: string,
  endTime: string,
  excludeEventId?: string
) {
  const conditions = [
    eq(event.date, date),
    eq(event.isCancelled, false),
    or(
      and(gte(event.startTime, startTime), lt(event.startTime, endTime)),
      and(gt(event.endTime, startTime), lte(event.endTime, endTime)),
      and(lte(event.startTime, startTime), gte(event.endTime, endTime))
    ),
  ];

  if (excludeEventId) {
    conditions.push(ne(event.id, excludeEventId));
  }

  const query = await database
    .select()
    .from(event)
    .where(and(...conditions));

  return query.length > 0;
}

async function generateRecurringInstances(
  startDate: string,
  endDate: string,
  recurrenceType: "daily" | "weekly" | "monthly",
  recurrenceInterval: number
) {
  const dates: string[] = [];
  const start = new Date(startDate);

  // Limit to 2 years into the future if no end date is provided
  let end: Date;
  if (!endDate || endDate === "") {
    end = new Date(start);
    end.setFullYear(end.getFullYear() + 2);
  } else {
    end = new Date(endDate);
  }

  let current = new Date(start);

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0]);

    switch (recurrenceType) {
      case "daily":
        current.setDate(current.getDate() + recurrenceInterval);
        break;
      case "weekly":
        current.setDate(current.getDate() + 7 * recurrenceInterval);
        break;
      case "monthly":
        current.setMonth(current.getMonth() + recurrenceInterval);
        break;
    }
  }

  return dates;
}

const eventRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{
    Querystring: ListEventsInput;
  }>(
    "/list",
    {
      schema: {
        querystring: $ref("listEventsSchema"),
      },
    },
    async (request, reply) => {
      // Getting events between the range of the following dates
      const { startDate, endDate, limit, page } = request.query;

      // Get insights about total items and total pages to help with pagination in the frontend later
      const totalItems = await db
        .select({ count: count() })
        .from(event)
        .where(and(gte(event.date, startDate), lte(event.date, endDate)));
      const totalPages = Math.ceil(totalItems[0].count / limit);

      const events = await db
        .select()
        .from(event)
        .where(and(gte(event.date, startDate), lte(event.date, endDate)))
        .limit(limit)
        .offset((page - 1) * limit)
        .orderBy(asc(event.date), asc(event.startTime));

      return reply.status(200).send({
        success: true,
        message: "Events fetched successfully",
        events,
        totalItems: totalItems[0].count,
        totalPages,
      });
    }
  );

  fastify.post<{ Body: CreateEventInput }>(
    "/create",
    {
      schema: {
        body: $ref("createEventSchema"),
      },
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const {
          title,
          description,
          date,
          startTime,
          endTime,
          recurrenceType = "none",
          recurrenceInterval = 1,
          recurrenceEndDate,
        } = request.body;

        if (recurrenceType === "none") {
          const conflict = await checkTimeConflict(
            db,
            date,
            startTime,
            endTime
          );

          if (conflict) {
            return reply.status(400).send({
              success: false,
              message: "An event already exists at the specified date and time",
            });
          }

          const newEvent = await db
            .insert(event)
            .values({
              title,
              description,
              date,
              startTime,
              endTime,
              authorId: request.user.id,
            })
            .returning();
          return reply.status(201).send({
            success: true,
            message: "Event created successfully",
            event: newEvent,
          });
        }

        // if the event is recurring
        const [parentEvent] = await db
          .insert(recurringEvent)
          .values({
            title,
            description,
            startDate: date,
            startTime,
            endTime,
            recurrenceType,
            recurrenceInterval: recurrenceInterval || 1,
            recurrenceEndDate: recurrenceEndDate || null,
            authorId: request.user.id,
          })
          .returning();

        const dates = await generateRecurringInstances(
          date,
          recurrenceEndDate || "",
          recurrenceType,
          recurrenceInterval || 1
        );

        const conflicts = [];
        for (const eventDate of dates) {
          const conflict = await checkTimeConflict(
            db,
            eventDate,
            startTime,
            endTime
          );
          if (conflict) {
            conflicts.push({
              date: eventDate,
            });
          }
        }

        if (conflicts.length > 0) {
          await db
            .delete(recurringEvent)
            .where(eq(recurringEvent.id, parentEvent.id));
          return reply.status(400).send({
            success: false,
            message:
              "Recurring event conflicts with existing events on some dates",
            conflicts,
          });
        }
        // Create all instances
        const instances = await db
          .insert(event)
          .values(
            dates.map((eventDate) => ({
              title,
              description,
              date: eventDate,
              startTime,
              endTime,
              authorId: request.user.id,
              recurringEventId: parentEvent.id,
            }))
          )
          .returning();

        return reply.status(201).send({
          success: true,
          message: "Recurring event created successfully",
          recurringEvent: parentEvent,
          instances,
        });
      } catch (error) {
        console.log(error);
        return reply.status(500).send({
          success: false,
          message: "Failed to create event",
        });
      }
    }
  );

  fastify.patch<{ Body: UpdateEventInput }>(
    "/instance/:id",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const { id, description, startTime, endTime } = request.body;

      // fetch the recurring event data
      const recurringEventData = await db
        .select()
        .from(event)
        .where(and(eq(event.id, id), eq(event.authorId, request.user.id)));

      if (recurringEventData.length === 0)
        return reply.status(404).send({
          success: false,
          message: "Recurring event not found",
        });

      const [updatedRecurringEvent] = await db
        .update(event)
        .set({
          description: description || recurringEventData[0].description,
          startTime: startTime || recurringEventData[0].startTime,
          endTime: endTime || recurringEventData[0].endTime,
          isModified: true,
        })
        .where(
          and(
            eq(recurringEvent.id, id),
            eq(recurringEvent.authorId, request.user.id)
          )
        )
        .returning();

      return reply.status(200).send({
        success: true,
        message: "Recurring event instance updated successfully",
        event: updatedRecurringEvent,
      });
    }
  );

  fastify.patch<{ Body: UpdateRecurringEventInput }>(
    "/recurring",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      const { id, title, description, startTime, endTime, recurrenceEndDate } =
        request.body;

      // Check if parent recurring event exists
      const recurringEventData = await db
        .select()
        .from(recurringEvent)
        .where(
          and(
            eq(recurringEvent.id, id),
            eq(recurringEvent.authorId, request.user.id)
          )
        );

      if (recurringEventData.length === 0)
        return reply.status(404).send({
          success: false,
          message: "Recurring event not found",
        });

      // Update the parent recurring event
      const [updatedParentEvent] = await db
        .update(recurringEvent)
        .set({
          title: title || recurringEventData[0].title,
          description: description || recurringEventData[0].description,
          startTime: startTime || recurringEventData[0].startTime,
          endTime: endTime || recurringEventData[0].endTime,
          recurrenceEndDate:
            recurrenceEndDate || recurringEventData[0].recurrenceEndDate,
        })
        .returning();

      // Update all non-modified instances
      await db
        .update(event)
        .set({
          title: title || recurringEventData[0].title,
          description: description || recurringEventData[0].description,
          startTime: startTime || recurringEventData[0].startTime,
          endTime: endTime || recurringEventData[0].endTime,
        })
        .where(
          and(
            eq(event.recurringEventId, id),
            eq(event.isModified, false),
            gte(event.date, new Date().toISOString().split("T")[0])
          )
        );
      return reply.status(200).send({
        success: true,
        message: "Recurring event and its instances updated successfully",
        recurringEvent: updatedParentEvent,
      });
    }
  );

  fastify.delete<{
    Params: DeleteEventInput;
  }>(
    "/instance/:id",
    {
      schema: {
        params: $ref("deleteEventSchema"),
      },
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        await db
          .delete(event)
          .where(and(eq(event.id, id), eq(event.authorId, request.user.id)));
        return reply.status(200).send({
          success: true,
          message: "Event deleted successfully",
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          message: "Failed to delete event",
        });
      }
    }
  );

  fastify.delete<{
    Params: DeleteEventInput;
  }>("/recurring/:id", async (request, reply) => {
    const { id } = request.params;

    // Delete all instances
    await db
      .delete(event)
      .where(
        and(eq(event.recurringEventId, id), eq(event.authorId, request.user.id))
      );

    // Delete the parent recurring event
    await db
      .delete(recurringEvent)
      .where(
        and(
          eq(recurringEvent.id, id),
          eq(recurringEvent.authorId, request.user.id)
        )
      );

    return reply.status(200).send({
      success: true,
      message: "Recurring event and its instances deleted successfully",
    });
  });
};

export default eventRoutes;
