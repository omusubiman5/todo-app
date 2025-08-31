// Detailed Supabase signup status debugging
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read environment variables
const envContent = fs.readFileSync('.env.local', 'utf8');
const lines = envContent.split('\n');
let supabaseUrl = '';
let supabaseKey = '';

lines.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1];
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1];
  }
});

console.log('=== Supabase Signup Status Investigation ===');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey?.length);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignupProcess() {
  const testEmail = 'testtodoapp2025@gmail.com'; // Use a real email for testing
  const testPassword = 'testpass123456';
  
  console.log('\n1. Testing signup process...');
  console.log('Email:', testEmail);
  
  try {
    // Step 1: Try signup
    console.log('\n=== STEP 1: Attempting signup ===');
    const signupResult = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: 'http://localhost:3003/',
        data: {
          display_name: testEmail.split('@')[0]
        }
      }
    });
    
    console.log('Signup Result:', {
      hasUser: !!signupResult.data?.user,
      userId: signupResult.data?.user?.id,
      userEmail: signupResult.data?.user?.email,
      emailConfirmed: signupResult.data?.user?.email_confirmed_at,
      createdAt: signupResult.data?.user?.created_at,
      hasSession: !!signupResult.data?.session,
      hasError: !!signupResult.error,
      errorMessage: signupResult.error?.message,
      errorStatus: signupResult.error?.status,
      errorCode: signupResult.error?.code
    });
    
    if (signupResult.error) {
      console.log('Full error object:', JSON.stringify(signupResult.error, null, 2));
      return;
    }
    
    if (signupResult.data?.user) {
      console.log('\n=== USER CREATED SUCCESSFULLY ===');
      console.log('User ID:', signupResult.data.user.id);
      console.log('Email confirmed:', signupResult.data.user.email_confirmed_at ? 'YES' : 'NO');
      console.log('Session created:', signupResult.data.session ? 'YES' : 'NO');
      
      // Step 2: Check if user exists in auth.users
      console.log('\n=== STEP 2: Checking auth.users table ===');
      try {
        // Try to get current session (should work if email confirmation is not required)
        const sessionResult = await supabase.auth.getSession();
        console.log('Current session exists:', !!sessionResult.data?.session);
        
        // Try to get user
        const userResult = await supabase.auth.getUser();
        console.log('Can retrieve user:', !!userResult.data?.user);
        console.log('User data:', userResult.data?.user ? 'Present' : 'Missing');
        
        if (userResult.error) {
          console.log('User retrieval error:', userResult.error.message);
        }
        
      } catch (err) {
        console.log('Session/User check failed:', err.message);
      }
      
      // Step 3: Check profiles table
      console.log('\n=== STEP 3: Checking profiles table ===');
      try {
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signupResult.data.user.id);
        
        if (profileError) {
          console.log('Profile query error:', profileError.message);
          console.log('Error details:', JSON.stringify(profileError, null, 2));
        } else {
          console.log('Profile exists:', profiles && profiles.length > 0 ? 'YES' : 'NO');
          if (profiles && profiles.length > 0) {
            console.log('Profile data:', profiles[0]);
          }
        }
      } catch (err) {
        console.log('Profile check failed:', err.message);
      }
      
      // Step 4: Check if tables exist
      console.log('\n=== STEP 4: Checking table existence ===');
      try {
        // Try to query profiles table structure
        const { data: tableInfo, error: tableError } = await supabase
          .rpc('get_table_info', { table_name: 'profiles' })
          .single();
        
        if (tableError) {
          console.log('Table info query failed (this is expected if RPC doesn\'t exist)');
          // Try a simple select to see if table exists
          const { error: simpleError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
          
          if (simpleError) {
            console.log('Profiles table issue:', simpleError.message);
            if (simpleError.message.includes('does not exist') || simpleError.message.includes('relation') || simpleError.message.includes('table')) {
              console.log('🚨 PROFILES TABLE DOES NOT EXIST!');
            }
          } else {
            console.log('Profiles table exists and is accessible');
          }
        }
      } catch (err) {
        console.log('Table existence check failed:', err.message);
      }
    }
    
  } catch (error) {
    console.error('Signup test failed with exception:', error);
  }
}

// Run the test
testSignupProcess().then(() => {
  console.log('\n=== Diagnosis Complete ===');
  console.log('Check the results above to identify the issue.');
}).catch(err => {
  console.error('Test script failed:', err);
});