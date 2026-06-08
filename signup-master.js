import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kciodmfxrnixzfdgcewf.supabase.co';
const supabaseAnonKey = 'sb_publishable_Ucl6IWssV3TeNNZEzZsl2Q_8PjNVFiJ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function signupMaster() {
  const email = 'master@arisecrm.com';
  const password = 'AriseAdmin@2026';
  
  console.log(`Attempting to sign up user: ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: 'Master Admin'
      }
    }
  });

  if (signUpError) {
    console.error('❌ Sign Up Error:', signUpError.message);
    console.log('\n👉 If the error says "User already exists", please run the DELETE SQL command first in your Supabase SQL Editor and try running this script again.');
    return;
  }

  console.log('\n==================================================');
  console.log('✅ SIGN UP INITIATED SUCCESSFULLY!');
  console.log('User ID:', signUpData.user?.id);
  console.log('==================================================\n');
  console.log('👉 NEXT STEP: Run the following SQL queries in your Supabase SQL Editor to confirm the email and link the profile:\n');
  console.log(`-- 1. Confirm the email for the new user`);
  console.log(`UPDATE auth.users SET email_confirmed_at = NOW() WHERE id = '${signUpData.user?.id}';`);
  console.log(`\n-- 2. Link the superadmin profile in the public users table`);
  console.log(`INSERT INTO public.users (id, company_id, name, email, role, is_default_password)`);
  console.log(`VALUES ('${signUpData.user?.id}', '00000000-0000-0000-0000-000000000000', 'Master Admin', 'master@arisecrm.com', 'superadmin', false)`);
  console.log(`ON CONFLICT (id) DO UPDATE SET role = 'superadmin';`);
  console.log('\n==================================================');
}

signupMaster();
