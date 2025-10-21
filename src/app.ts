import { dirname, join } from "node:path";
import AutoLoad, { AutoloadPluginOptions } from "@fastify/autoload";
import { FastifyPluginAsync, FastifyServerOptions } from "fastify";
import { fileURLToPath } from "node:url";

import "dotenv/config";

export interface AppOptions
  extends FastifyServerOptions,
    Partial<AutoloadPluginOptions> {}

const options: AppOptions = {};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  await fastify.register(import("@fastify/swagger"), {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Event Scheduler API",
        description: "API documentation for the Event Scheduler application",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://localhost:${process.env.PORT || 3000}`,
          description: "Development Server",
        },
      ],
      // tags: [
      //   { name: "user", description: "User related end-points" },
      //   { name: "code", description: "Code related end-points" },
      // ],
      // components: {
      //   securitySchemes: {
      //     apiKey: {
      //       type: "apiKey",
      //       name: "apiKey",
      //       in: "header",
      //     },
      //   },
      // },
      externalDocs: {
        url: "https://swagger.io",
        description: "Find more info here",
      },
    },
  });

  fastify.register(import("@fastify/swagger-ui"), {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });

  // Place here your custom code!
  fastify.setErrorHandler(function (error, request, reply) {
    console.error(error);
  });
  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application

  fastify.register(AutoLoad, {
    dir: join(__dirname, "plugins"),
    options: opts,
  });

  // This loads all plugins defined in routes
  // define your routes in one of these

  fastify.register(AutoLoad, {
    dir: join(__dirname, "routes"),
    options: opts,
  });
};

export default app;
export { app, options };
