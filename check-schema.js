import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kciodmfxrnixzfdgcewf.supabase.co';
const supabaseAnonKey = 'sb_publishable_Ucl6IWssV3TeNNZEzZsl2Q_8PjNVFiJ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  console.log('Querying companies...');
  const { data: compData, error: compError } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  if (compError) {
    console.error('❌ companies error:', compError.message);
    console.error('Details:', compError.details);
    console.error('Hint:', compError.hint);
  } else {
    console.log('✅ companies queried successfully! Data count:', compData.length);
  }

  console.log('Querying users...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (userError) {
    console.error('❌ users error:', userError.message);
    console.error('Details:', userError.details);
    console.error('Hint:', userError.hint);
  } else {
    console.log('✅ users queried successfully! Data count:', userData.length);
  }
}

checkSchema();
