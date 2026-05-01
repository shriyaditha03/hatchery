
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingTypes() {
  console.log('Fetching existing activity types from activity_charts...');
  
  const { data, error } = await supabase
    .from('activity_charts')
    .select('activity_type')
    .limit(1000);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const types = new Set(data.map(d => d.activity_type));
  console.log('DATABASE APPROVED NAMES:', Array.from(types));
}

checkExistingTypes();
