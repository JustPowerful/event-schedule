import { createClient } from "redis";
import "dotenv/config";

const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Singleton Redis client
const clientConfig: any = {
  url: "redis://localhost:6379",
  password: REDIS_PASSWORD,
};

const client = createClient(clientConfig);

client.on("error", (err) => console.error("Redis Client Error", err));

await client.connect();

console.log("✓ Redis connected successfully");

export default client;
