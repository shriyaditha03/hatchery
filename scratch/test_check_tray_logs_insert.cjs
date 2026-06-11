const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const record = {
    activity_type: 'Check Tray',
    data: {
      comments: 'Testing logs'
    }
  };

  const { data, error } = await supabase.from('activity_logs').insert(record).select();
  if (error) {
    console.error('Insert Failed:', error.message);
  } else {
    console.log('Insert Succeeded:', data);
    if (data && data[0]) {
      await supabase.from('activity_logs').delete().eq('id', data[0].id);
      console.log('Cleanup complete.');
    }
  }
}

testInsert();
