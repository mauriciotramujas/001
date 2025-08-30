import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://rmbaasdfpwmqhisgjoxo.supabase.co";// import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtYmFhc2RmcHdtcWhpc2dqb3hvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzg5MjIxMiwiZXhwIjoyMDY5NDY4MjEyfQ.Rx9sg_BzN_EATdxWgOhB8Bnm80Wyl5xFHrenfBwSvEM"; //import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
