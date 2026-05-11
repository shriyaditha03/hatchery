const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const { data, error } = await supabase.from('activity_logs').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('Error fetching activity_logs:', error);
  } else {
    console.log('activity_logs count:', data); // Wait, head:true returns empty data usually
  }

  // List all tables using RPC if available, or just check some common ones
  const tables = ['activity_logs', 'farms', 'sections', 'tanks', 'profiles'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`Table ${table}: ${error ? error.message : count + ' rows'}`);
  }
}

checkTables();
