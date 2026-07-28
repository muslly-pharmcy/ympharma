// Server-side Supabase client with service role key - bypasses RLS.
// Overwritten with Mock client to support fully functional local-only development.
import { supabase } from './client'

export const supabaseAdmin = supabase
