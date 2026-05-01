
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkRecentSales() {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('activity_type', 'Nauplii Sale')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- RECENT NAUPLII SALES ---');
  data.forEach(log => {
    console.log(`ID: ${log.id}`);
    console.log(`Created At: ${log.created_at}`);
    console.log(`Batch ID: ${log.data?.selectedBatchId || log.data?.sourceBatchId}`);
    console.log(`Sale Type: ${log.data?.saleType}`);
    console.log(`Is Closed: ${log.data?.isBatchClosed}`);
    console.log(`Total Gross: ${log.data?.totalGross}`);
    console.log('---------------------------');
  });
}

checkRecentSales();
