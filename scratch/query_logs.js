import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function main() {
  const { data: logs, error: lError } = await supabase
    .from('activity_logs')
    .select('id, activity_type, tank_id, data, created_at, farm_id');
  
  console.log('All Logs in DB:', logs?.length, 'Error:', lError);
  if (logs) {
    logs.forEach(log => {
      console.log(`Log [${log.activity_type}] - Tank: ${log.tank_id}, Farm: ${log.farm_id}, Created: ${log.created_at}`);
      console.log('  Data:', JSON.stringify(log.data));
    });
  }
}

main();
