// knexfile.ts
import type { Knex } from "knex";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DB_HOST) throw new Error("Missing DB_HOST");
if (!process.env.DB_PORT) throw new Error("Missing DB_PORT");
if (!process.env.DB_USER) throw new Error("Missing DB_USER");
if (!process.env.DB_PASS) throw new Error("Missing DB_PASS");
if (!process.env.DB_NAME) throw new Error("Missing DB_NAME");

const config: Knex.Config = {
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  },
  migrations: {
    tableName: "knex_migrations",
    directory: path.resolve(__dirname, "migrations")
  },
  seeds: {
    directory: path.resolve(__dirname, "seeds")
  }
};

export default config;
