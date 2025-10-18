import { FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";

import { db } from "@/db";

const healthcheckRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/healthcheck", async (_request, reply) => {
    const apiStatus = "up" as const;

    let databaseStatus: "up" | "down" = "up";
    let databaseError: string | undefined;
    let databaseLatency: number | undefined;

    try {
      const startedAt = Date.now();
      await db.execute(sql`select 1`);
      databaseLatency = Date.now() - startedAt;
    } catch (error) {
      databaseStatus = "down";
      databaseError = error instanceof Error ? error.message : "Unknown error";
    }

    const responsePayload = {
      success: databaseStatus === "up",
      api: {
        status: apiStatus,
      },
      database: {
        status: databaseStatus,
        ...(databaseLatency !== undefined
          ? { latencyMs: databaseLatency }
          : {}),
        ...(databaseError ? { error: databaseError } : {}),
      },
      timestamp: new Date().toISOString(),
    };

    return reply
      .status(databaseStatus === "up" ? 200 : 503)
      .send(responsePayload);
  });
};

export default healthcheckRoutes;
