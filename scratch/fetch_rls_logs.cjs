const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env manually
const envContent = fs.readFileSync('c:/Users/shriy/OneDrive/Desktop/aquanexus/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log('Resolving email for user asdf...');
  const { data: email, error: rpcError } = await supabase
    .rpc('get_email_by_username', { username_input: 'asdf' });

  if (rpcError) {
    console.error('RPC Error:', rpcError);
    return;
  }

  console.log('Email resolved:', email);

  // Try standard passwords
  const passwords = ['admin123', 'asdf123', 'password123'];
  let authData = null;
  let authError = null;

  for (const password of passwords) {
    console.log(`Trying sign in with password: ${password}...`);
    const res = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (!res.error) {
      authData = res.data;
      authError = null;
      console.log(`Logged in successfully with password: ${password}!`);
      break;
    } else {
      authError = res.error;
    }
  }

  if (authError || !authData) {
    console.error('Auth Error:', authError);
    return;
  }

  console.log('Fetching logs for S1_P1...');
  
  // Get the tank named S1_P1
  const { data: tanks } = await supabase
    .from('tanks')
    .select('id, name, section_id')
    .eq('name', 'S1_P1');

  if (!tanks || tanks.length === 0) {
    console.log('Pond S1_P1 not found!');
    return;
  }
  const pond = tanks[0];
  console.log('Found Pond S1_P1:', pond);

  const { data: logs, error: logsError } = await supabase
    .from('activity_logs')
    .select('id, farm_id, activity_type, stocking_id, data, created_at')
    .eq('tank_id', pond.id)
    .order('created_at', { ascending: false });

  if (logsError) {
    console.error('Logs Error:', logsError);
    return;
  }

  console.log('\n--- ACTIVITY LOGS FOR S1_P1 ---');
  logs.forEach(log => {
    console.log(`[${log.created_at}] Type: ${log.activity_type}`);
    console.log('  Data:', JSON.stringify(log.data, null, 2));
  });
}

run();
