import { supabase } from './src/lib/supabase';

async function checkLogCount() {
  const farmId = 'cd66304f-178b-4914-9457-41476101f379'; // I should get the real farmId from the user or logs
  const today = new Date().toISOString().split('T')[0];
  
  const { data, count, error } = await supabase
    .from('activity_logs')
    .select('id, activity_type, created_at', { count: 'exact' })
    .eq('activity_type', 'Sourcing & Mating')
    .eq('farm_id', farmId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Count:', count);
  console.log('Logs:', data);
}

checkLogCount();
