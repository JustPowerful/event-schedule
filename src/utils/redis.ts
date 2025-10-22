import { createClient } from "redis";
import "dotenv/config";

const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = process.env.REDIS_PORT || "6379";
const REDIS_TLS = (process.env.REDIS_TLS || "false").toLowerCase() === "true";
const REDIS_URL =
  process.env.REDIS_URL ||
  `${REDIS_TLS ? "rediss" : "redis"}://${REDIS_HOST}:${REDIS_PORT}`;

// Singleton Redis client
const clientConfig: any = {
  url: REDIS_URL,
  password: REDIS_PASSWORD,
};

const client = createClient(clientConfig);

client.on("error", (err) => console.error("Redis Client Error", err));

await client.connect();

console.log("✓ Redis connected successfully");

export default client;
