import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const sql = fs.readFileSync("FIX_AGT_SCHEMA.sql", "utf8");
  console.log("Applying AGT Schema Fix...");
  
  const { data, error } = await supabase.rpc("query_exec", { query: sql });
  
  if (error) {
    console.error("Error applying SQL:", error);
  } else {
    console.log("Migration applied successfully:", data);
  }
}

run();
