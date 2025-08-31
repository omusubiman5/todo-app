// Setup authentication trigger in Supabase
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

console.log('=== Setting up Supabase Auth Trigger ===');

async function setupAuthTrigger() {
  try {
    console.log('1. Creating profiles table if it doesn\'t exist...');
    
    // First, create the profiles table
    const { error: tableError } = await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          display_name TEXT,
          bio TEXT,
          avatar_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
        );
        
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        
        -- Create or replace policies
        DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
        CREATE POLICY "Users can view own profile" ON public.profiles
          FOR SELECT USING (auth.uid() = id);
          
        DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;  
        CREATE POLICY "Users can insert own profile" ON public.profiles
          FOR INSERT WITH CHECK (auth.uid() = id);
          
        DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
        CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = id);
        
        GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;
      `
    });
    
    if (tableError && !tableError.message.includes('already exists')) {
      console.log('Note: Could not create via RPC (expected with anon key)');
      console.log('Manual SQL execution required in Supabase dashboard');
    } else {
      console.log('✅ Profiles table setup complete');
    }

    console.log('\n2. Testing current trigger status...');
    
    // Test if trigger is working
    const testEmail = `triggertest${Date.now()}@gmail.com`;
    const signupResult = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpass123456'
    });
    
    if (signupResult.error) {
      console.log('❌ Signup test failed:', signupResult.error.message);
      return;
    }
    
    if (signupResult.data?.user) {
      console.log('✅ Test user created:', signupResult.data.user.id);
      
      // Wait for trigger
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if profile was created
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signupResult.data.user.id)
        .single();
        
      if (profile) {
        console.log('✅ Auth trigger is working! Profile was created automatically');
        console.log('   Profile data:', profile);
      } else {
        console.log('❌ Auth trigger is NOT working');
        console.log('   Profile error:', profileError?.message);
        
        console.log('\n📋 MANUAL SETUP REQUIRED:');
        console.log('Please run this SQL in your Supabase SQL Editor:');
        console.log('');
        console.log('```sql');
        console.log('-- Create the trigger function');
        console.log('CREATE OR REPLACE FUNCTION public.handle_new_user()');
        console.log('RETURNS TRIGGER');
        console.log('LANGUAGE plpgsql');
        console.log('SECURITY DEFINER SET search_path = public');
        console.log('AS $$');
        console.log('BEGIN');
        console.log('  INSERT INTO public.profiles (id, display_name)');
        console.log('  VALUES (');
        console.log('    NEW.id,');
        console.log('    COALESCE(NEW.raw_user_meta_data->>\'display_name\', NEW.email)');
        console.log('  );');
        console.log('  RETURN NEW;');
        console.log('END;');
        console.log('$$;');
        console.log('');
        console.log('-- Create the trigger');
        console.log('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
        console.log('CREATE TRIGGER on_auth_user_created');
        console.log('  AFTER INSERT ON auth.users');
        console.log('  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();');
        console.log('```');
      }
    }
    
    console.log('\n3. Checking current auth settings...');
    
    // Test with existing user
    const existingSignup = await supabase.auth.signUp({
      email: 'testtodoapp2025@gmail.com',
      password: 'testpass123456'
    });
    
    if (existingSignup.data?.user) {
      console.log('User creation: SUCCESS');
      console.log('Session created:', !!existingSignup.data.session);
      console.log('Email confirmed:', !!existingSignup.data.user.email_confirmed_at);
    } else if (existingSignup.error) {
      console.log('Existing user signup result:', existingSignup.error.message);
    }
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  }
}

setupAuthTrigger().then(() => {
  console.log('\n=== Setup Complete ===');
  console.log('If trigger setup failed, please run the SQL manually in Supabase Dashboard > SQL Editor');
}).catch(err => {
  console.error('Setup script failed:', err);
});