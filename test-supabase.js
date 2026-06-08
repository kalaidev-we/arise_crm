import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kciodmfxrnixzfdgcewf.supabase.co';
const supabaseAnonKey = 'sb_publishable_Ucl6IWssV3TeNNZEzZsl2Q_8PjNVFiJ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing connection to:', supabaseUrl);
  
  // 1. Test Login
  console.log('Attempting login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@ariseagency.com',
    password: 'password123'
  });

  if (authError) {
    console.error('❌ Auth Error:', authError.message);
    return;
  }
  
  console.log('✅ Login successful! User ID:', authData.user.id);

  // 2. Test querying users table
  console.log('Querying users table...');
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error('❌ Profile Query Error:', profileError.message);
    console.error('Details:', profileError.details);
    console.error('Hint:', profileError.hint);
    return;
  }

  console.log('✅ Profile Query successful! Profile:', profile);
}

testConnection();
