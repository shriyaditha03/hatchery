
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log('Testing insert into activity_charts with Broodstock Discard...');
  
  const record = {
    hatchery_id: '80371a53-f725-472d-946f-c1f93f6c88e7', // Hardcoded dummy ID
    farm_id: '80371a53-f725-472d-946f-c1f93f6c88e7',
    activity_type: 'Broodstock Discard',
    scheduled_date: '2026-05-01',
    scheduled_time: '12:00',
    planned_data: { item: 'Discard', instructions: 'Test' },
    is_completed: false
  };

  const { error } = await supabase.from('activity_charts').insert(record);

  if (error) {
    console.error('INSERT ERROR:', JSON.stringify(error, null, 2));
  } else {
    console.log('Insert successful! Wait, if it was successful, then why did it fail in the browser?');
  }
}

testInsert();
