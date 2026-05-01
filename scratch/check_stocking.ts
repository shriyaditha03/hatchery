import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStocking() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('stocking_id, activity_type, created_at, data')
    .eq('activity_type', 'Stocking')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching logs:", error);
    return;
  }

  console.log("Recent Stocking Logs:");
  data.forEach(log => {
    console.log(`- Created: ${log.created_at}, SID: ${log.stocking_id}, Data SID: ${log.data?.stockingId}`);
  });
}

checkStocking();
