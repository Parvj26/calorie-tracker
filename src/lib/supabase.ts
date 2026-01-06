import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjbozzkghpmvxpnoazwu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm96emtnaHBtdnhwbm9hend1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjY5MDUsImV4cCI6MjA4MzI0MjkwNX0.dTlnsv0zhtcCDUT4e59KWeNFOM3phesksPKPaqLLzew';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
