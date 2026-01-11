/**
 * Seed script to create demo coach user
 *
 * Run with: npx tsx scripts/seed-demo-coach.ts
 *
 * Prerequisites:
 * 1. Create a user in Supabase Auth with email: democoach@caltracker.app
 * 2. Get the user's UUID from Supabase dashboard
 * 3. Set DEMO_COACH_ID below
 * 4. Make sure the coach_clients migration has been run
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = 'https://jjbozzkghpmvxpnoazwu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const DEMO_COACH_ID = process.env.DEMO_COACH_ID || '';
const DEMO_CLIENT_ID = 'cb48025b-a7ee-4f3b-9f74-cbe84c15ce51'; // Existing demo user

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function seedDemoCoach() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('Please set SUPABASE_SERVICE_KEY environment variable');
    console.log('\nRun with: SUPABASE_SERVICE_KEY=your_key DEMO_COACH_ID=uuid npx tsx scripts/seed-demo-coach.ts');
    console.log('\nGet the service_role key from: Supabase Dashboard > Settings > API > service_role');
    process.exit(1);
  }

  if (!DEMO_COACH_ID) {
    console.error('Please set DEMO_COACH_ID environment variable');
    console.log('\nFirst create the coach user in Supabase Auth:');
    console.log('1. Go to Supabase Dashboard > Authentication > Users');
    console.log('2. Click "Add user" > "Create new user"');
    console.log('3. Email: demodemocoach@caltracker.app, Password: CoachDemo123!');
    console.log('4. Copy the user UUID and set DEMO_COACH_ID=uuid');
    process.exit(1);
  }

  console.log('Seeding demo coach data...\n');

  // 1. Generate a unique coach code
  const coachCode = 'DEMO' + Math.random().toString(36).substring(2, 6).toUpperCase();
  console.log(`1. Generated coach code: ${coachCode}`);

  // 2. Create/update coach profile
  console.log('\n2. Creating coach profile...');
  const { error: profileError } = await supabase.from('user_profiles').upsert({
    user_id: DEMO_COACH_ID,
    email: 'democoach@caltracker.app',
    display_name: 'Demo Coach',
    first_name: 'Demo',
    last_name: 'Coach',
    role: 'coach',
    coach_code: coachCode,
  }, { onConflict: 'user_id' });

  if (profileError) {
    console.error('  Error creating profile:', profileError.message);

    // If coach_code column doesn't exist, the migration hasn't been run
    if (profileError.message.includes('coach_code')) {
      console.error('\n❌ The coach_clients migration has not been run!');
      console.error('Please run the migration first:');
      console.error('1. Go to Supabase Dashboard > SQL Editor');
      console.error('2. Paste the contents of supabase/migrations/coach_clients.sql');
      console.error('3. Run the migration');
      process.exit(1);
    }
  } else {
    console.log('  Profile created successfully');
  }

  // 3. Check if demo client exists
  console.log('\n3. Checking demo client...');
  const { data: clientProfile } = await supabase
    .from('user_profiles')
    .select('user_id, first_name, last_name, email')
    .eq('user_id', DEMO_CLIENT_ID)
    .single();

  if (!clientProfile) {
    console.log('  Demo client not found. Run seed-demo-user.ts first to create the demo client.');
    console.log('  Skipping coach-client connection...');
  } else {
    console.log(`  Found demo client: ${clientProfile.first_name} ${clientProfile.last_name}`);

    // 4. Create coach-client connection (already accepted)
    console.log('\n4. Creating coach-client connection...');
    const { error: connectionError } = await supabase.from('coach_clients').upsert({
      coach_id: DEMO_COACH_ID,
      client_id: DEMO_CLIENT_ID,
      status: 'accepted',
      requested_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      responded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'coach_id,client_id' });

    if (connectionError) {
      console.error('  Error creating connection:', connectionError.message);
    } else {
      console.log('  Connection created (status: accepted)');
    }
  }

  console.log('\n✅ Demo coach seeded successfully!');
  console.log('\n=== Demo Coach Credentials ===');
  console.log('Email: democoach@caltracker.app');
  console.log('Password: CoachDemo123! (or whatever you set)');
  console.log(`Coach Code: ${coachCode}`);
  console.log('\nThe coach can now log in and see the demo client in their dashboard.');
}

seedDemoCoach().catch(console.error);
