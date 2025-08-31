// Supabase project configuration checker
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

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== Supabase Project Configuration Check ===');
console.log('URL:', supabaseUrl);
console.log('Project ID:', supabaseUrl.split('.')[0].split('//')[1]);

async function checkProjectSettings() {
  try {
    console.log('\n1. Testing basic connectivity...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    console.log('Basic connection:', error ? 'FAILED' : 'OK');
    if (error) {
      console.log('Connection error:', error.message);
      return;
    }

    console.log('\n2. Testing auth configuration...');
    
    // Test signup with a realistic email format
    const testEmail = `testuser${Date.now()}@gmail.com`;
    const testResult = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpassword123'
    });
    console.log('Test email used:', testEmail);
    
    console.log('Signup test result:', {
      userCreated: !!testResult.data?.user,
      sessionCreated: !!testResult.data?.session,
      confirmationRequired: !testResult.data?.session && !!testResult.data?.user,
      error: testResult.error?.message
    });
    
    if (testResult.data?.user && !testResult.data?.session) {
      console.log('🔍 EMAIL CONFIRMATION IS REQUIRED');
      console.log('   This means:');
      console.log('   - Users must click confirmation email before they can login');
      console.log('   - If emails are not being sent, users cannot complete registration');
    } else if (testResult.data?.session) {
      console.log('✅ EMAIL CONFIRMATION IS DISABLED');
      console.log('   Users can login immediately after signup');
    }

    console.log('\n3. Checking profiles table and trigger...');
    
    if (testResult.data?.user) {
      const userId = testResult.data.user.id;
      
      // Wait a moment for trigger to potentially fire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (profileError && profileError.code === 'PGRST116') {
        console.log('❌ Profile was NOT automatically created');
        console.log('   This suggests the auth trigger is not working');
      } else if (profile) {
        console.log('✅ Profile was automatically created');
        console.log('   Trigger is working correctly');
      } else {
        console.log('⚠️  Profile check inconclusive:', profileError?.message);
      }
      
      // Clean up test user
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log('   Test user cleaned up');
      } catch (cleanupError) {
        console.log('   Could not clean up test user (normal for anon key)');
      }
    }
    
    console.log('\n4. Auth settings analysis...');
    console.log('Based on the test results:');
    
    if (testResult.data?.user && !testResult.data?.session) {
      console.log('❌ PROBLEM: Email confirmation is required but emails may not be configured');
      console.log('');
      console.log('🔧 SOLUTIONS:');
      console.log('   Option 1: Configure SMTP in Supabase Dashboard > Authentication > Settings');
      console.log('   Option 2: Disable email confirmation in Auth settings (not recommended for production)');
      console.log('   Option 3: Use Magic Link authentication instead');
      console.log('');
      console.log('📋 To check/fix in Supabase Dashboard:');
      console.log('   1. Go to Authentication > Settings');
      console.log('   2. Check "Enable email confirmations" setting');
      console.log('   3. Check "SMTP settings" if confirmations are enabled');
      console.log('   4. Verify "Site URL" and "Redirect URLs" settings');
    } else if (testResult.error) {
      console.log('❌ PROBLEM: Signup is failing entirely');
      console.log('   Error:', testResult.error.message);
    } else {
      console.log('✅ Auth configuration appears to be working');
    }
    
  } catch (error) {
    console.error('Configuration check failed:', error.message);
  }
}

// Run the check
checkProjectSettings().then(() => {
  console.log('\n=== Configuration Check Complete ===');
  console.log('Review the results above and follow the suggested solutions.');
}).catch(err => {
  console.error('Check script failed:', err);
});