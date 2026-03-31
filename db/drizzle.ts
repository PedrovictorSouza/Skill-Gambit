import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const configuredDb = process.env.DATABASE_URL
  ? drizzle(neon(process.env.DATABASE_URL), { schema })
  : null;

type Database = NonNullable<typeof configuredDb>;

const db: Database =
  configuredDb ??
  (new Proxy({} as Database, {
    get() {
      throw new Error(
        "Database is not configured. Set DATABASE_URL or run the app in frontend-only mode."
      );
    },
  }) as Database);

export default db;
