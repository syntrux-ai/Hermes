import { createClient } from '@supabase/supabase-js';
import { assertEnv, env } from '../../config/env.js';
import type { Database } from './supabase.types.js';

export const assertSupabaseConfigured = assertEnv;

export const supabase = createClient<Database>(env.supabaseUrl || 'http://127.0.0.1:54321', env.supabaseServiceRoleKey || 'dev-placeholder', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
