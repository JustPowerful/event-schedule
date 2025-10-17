import { FastifyInstance, FastifyServerOptions, fastify } from "fastify";

type Fastify = typeof fastify;

async function createServerApp(fastify: Fastify, opts: FastifyServerOptions) {
  const app: FastifyInstance = fastify(opts);
  app.register(import("./app.js")).ready((err) => {
    if (err) throw err;
    app.log.info("Server app is ready.");
  });

  return app;
}

const app = await createServerApp(fastify, {});

const port = process.env.SERVER_PORT || 8000;
const host = process.env.SERVER_HOST || "localhost";

app.listen({ host, port: Number(port) }, (err) => {
  console.log(`Server listening at http://${host}:${port}`);
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
