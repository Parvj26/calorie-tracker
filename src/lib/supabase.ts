import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jjbozzkghpmvxpnoazwu.supabase.co';
const supabaseAnonKey = 'AIyuW6727EwtzkSS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
