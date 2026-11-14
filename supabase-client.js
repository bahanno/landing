// Direct Supabase Connection (Testing with VPN ON)
const SUPABASE_URL = "https://kpqwqoersgrwbzroobm.supabase.co";
const SUPABASE_KEY = "sb_publishable_w-IAJ0CfCrpwRDI_rC67wQ_Q4TJgvDc";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
