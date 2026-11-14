// Supabase Direct Connection using Legacy Anon Key
const SUPABASE_URL = "https://kpqwqoersgrwbzroobm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwcXZ3cW9lcnNncndienJvb2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2MzM2MzgsImV4cCI6MjExMDIwOTYzOH0.bnqq6qj06C-7B9h5h_dDpXBe6Pkki_G4mA34KSWuS_w";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
