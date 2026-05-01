
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
  console.log('Checking activity_charts table info...');
  
  const { data, error } = await supabase
    .from('activity_charts')
    .select('activity_type')
    .limit(100);

  if (error) {
    console.error('Error:', error);
    return;
  }

  const types = new Set(data.map(d => d.activity_type));
  console.log('Existing activity types in activity_charts:', Array.from(types));
}

checkConstraint();
