import { FastifyPluginAsync } from "fastify";

import { event } from "@/db/schema";
import {
  $ref,
  CreateEventInput,
  ListEventsInput,
  UpdateEventInput,
} from "@/schemas/event";
import { db } from "@/db";
import { and, asc, count, eq, gt, gte, lt, lte, ne, or } from "drizzle-orm";
import { authMiddleware } from "@/middleware/auth.middleware";

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
        const { title, description, date, startTime, endTime } = request.body;
        // check if there's an event with the the same date and the same time or a time between the starting time and the ending time
        // If there's an event like that, return an error
        const existingEvent = await db
          .select()
          .from(event)
          .where(
            and(
              eq(event.date, date),
              and(
                or(
                  and(
                    gte(event.startTime, startTime),
                    lt(event.startTime, endTime)
                  ),
                  and(
                    gt(event.endTime, startTime),
                    lte(event.endTime, endTime)
                  ),
                  and(
                    lte(event.startTime, startTime),
                    gte(event.endTime, endTime)
                  )
                )
              )
            )
          );

        if (existingEvent.length > 0)
          return reply.status(400).send({
            success: false,
            message: "An event already exists at the specified date and time",
          });

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
          event: newEvent[0],
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          message: "Failed to create event",
        });
      }
    }
  );

  fastify.patch<{
    Body: UpdateEventInput;
  }>(
    "/update",
    {
      schema: {
        body: $ref("updateEventSchema"),
      },
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        const { id, title, description, date, startTime, endTime } =
          request.body;

        // Fetch the old event data
        const oldEvent = await db.select().from(event).where(eq(event.id, id));
        if (oldEvent.length === 0)
          return reply.status(404).send({
            success: false,
            message: "Event not found",
          });

        const oldEventData = oldEvent[0];

        const existingEvent = await db
          .select()
          .from(event)
          .where(
            and(
              and(
                eq(event.date, date || oldEventData.date),
                and(
                  or(
                    and(
                      gte(event.startTime, startTime || oldEventData.startTime),
                      lt(event.startTime, endTime || oldEventData.endTime)
                    ),
                    and(
                      gt(event.endTime, startTime || oldEventData.startTime),
                      lte(event.endTime, endTime || oldEventData.endTime)
                    ),
                    and(
                      lte(event.startTime, startTime || oldEventData.startTime),
                      gte(event.endTime, endTime || oldEventData.endTime)
                    )
                  )
                )
              ),
              ne(event.id, id) // Exclude the current event being updated
            )
          );

        if (existingEvent.length > 0)
          return reply.status(400).send({
            success: false,
            message: "An event already exists at the specified date and time",
          });

        const updatedEvent = await db
          .update(event)
          .set({
            title,
            description,
            date,
            startTime,
            endTime,
          })
          .where(and(eq(event.id, id), eq(event.authorId, request.user.id)))
          .returning();

        return reply.status(200).send({
          success: true,
          message: "Event updated successfully",
          event: updatedEvent,
        });
      } catch (error) {
        return reply.status(500).send({
          success: false,
          message: "Failed to update event",
        });
      }
    }
  );

  fastify.delete<{
    Params: { id: string };
  }>(
    "/delete/:id",
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
};

export default eventRoutes;
