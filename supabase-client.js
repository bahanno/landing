// Supabase Initialization via Cloudflare Proxy
const SUPABASE_URL = "https://api.bahanno50.workers.dev";
const SUPABASE_KEY = "sb_publishable_w-IAJ0CfCrpwRDI_rC67wQ_Q4TJgvDc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
