const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://uzecdpdwrhjcanszfcei.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU');

async function checkLogs() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, tank_id, data')
    .eq('activity_type', 'Nauplii Sale')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  console.log('--- Latest Nauplii Sale Logs ---');
  data.forEach(log => {
    console.log(`Log ID: ${log.id}`);
    console.log(`Tank ID: ${log.tank_id}`);
    console.log(`Movement Type: ${log.data?.movementType}`);
    const st = log.data?.saleTanks;
    if (st) {
        console.log(`Sale Tanks: ${st.map(t => `{id: ${t.id}, tankId: ${t.tankId}, saleMil: ${t.saleMil}}`).join(', ')}`);
    } else {
        console.log('Sale Tanks: none');
    }
    console.log('---');
  });
}

checkLogs();
