const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const record = {
    hatchery_id: 'd9b7f5e1-8c3b-4b2a-9e1d-8c3b4b2a9e1d', // dummy / existing uuid format
    farm_id: null,
    section_id: null,
    tank_id: null,
    activity_type: 'Check Tray',
    scheduled_date: '2026-06-11',
    scheduled_time: '12:00 PM',
    planned_data: {
      item: 'Check Tray',
      timeSlot: 'Slot 1'
    },
    is_completed: false
  };

  const { data, error } = await supabase.from('activity_charts').insert(record).select();
  if (error) {
    console.error('Insert Failed:', error.message);
  } else {
    console.log('Insert Succeeded:', data);
    // Cleanup
    if (data && data[0]) {
      await supabase.from('activity_charts').delete().eq('id', data[0].id);
      console.log('Cleanup complete.');
    }
  }
}

testInsert();
