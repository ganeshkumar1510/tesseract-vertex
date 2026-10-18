import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase URL or anon key not found in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function validateSupabase() {
  try {
    // Perform a lightweight request to confirm the connection.
    // We try to query a table. Even if the table doesn't exist, 
    // reaching the database and getting a "relation does not exist" error
    // confirms our connection and API keys are valid.
    const { error } = await supabase.from('_dummy_connection_test_').select('*').limit(1);
    
    // The error "Could not find the table" proves we successfully connected to the database
    // and authenticated, but the dummy table doesn't exist.
    if (error && !error.message.includes('Could not find')) {
      console.error("❌ Supabase connection failed:", error.message);
      process.exit(1);
    }
    
    console.log("✅ Supabase connection successful! Environment variables are correctly configured.");
  } catch (e) {
    console.error("❌ Unexpected error while validating Supabase connection:", e);
    process.exit(1);
  }
}

validateSupabase();
