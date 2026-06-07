const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://uzecdpdwrhjcanszfcei.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZWNkcGR3cmhqY2Fuc3pmY2VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzUyNTQsImV4cCI6MjA4NjI1MTI1NH0.WXvNk4x2l7o8lgtN3YRpe81FO6-iFPx3KLGcPh09SaU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Resolving email for admin...');
  const { data: email, error: rpcError } = await supabase
    .rpc('get_email_by_username', { username_input: 'admin' });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
    return;
  }

  console.log('Email resolved:', email);

  console.log('Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'admin123'
  });

  if (authError) {
    console.error('Auth Error:', authError);
    return;
  }

  console.log('Authenticated successfully!');

  const { data: farms, error: farmsError } = await supabase
    .from('farms')
    .select('id, name, category');
  
  console.log('--- FARMS ---');
  console.log(JSON.stringify(farms, null, 2));

  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select('id, farm_id, activity_type, stocking_id, data, created_at')
    .order('created_at', { ascending: false });

  console.log('\n--- ACTIVITY LOGS ---');
  console.log(JSON.stringify(logs, null, 2));
}

run();
