const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLogs() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('activity_type, data, stocking_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample logs (last 100):');
  data.forEach(log => {
    const sId = log.stocking_id || log.data?.stockingId || log.data?.stocking_id;
    console.log(`[${log.created_at}] Type: ${log.activity_type}, StockingID: ${sId || 'N/A'}`);
  });
}

checkLogs();
