import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

const databaseUrl = `postgresql://${process.env.POSTGRES_USERNAME}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
export const db = drizzle(databaseUrl);
