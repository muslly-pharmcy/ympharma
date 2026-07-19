import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl || '', supabaseKey || '')

// Auth helpers
export const signIn = (email: string, password: string) => 
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getCurrentUser = () => supabase.auth.getUser()

// Database helpers
export const fetchTable = async (table: string, options?: { limit?: number; order?: string }) => {
  let query = supabase.from(table).select('*')
  if (options?.limit) query = query.limit(options.limit)
  if (options?.order) query = query.order(options.order, { ascending: false })
  return query
}

export const insertRecord = (table: string, data: Record<string, unknown>) =>
  supabase.from(table).insert(data).select()

export const updateRecord = (table: string, id: string, data: Record<string, unknown>) =>
  supabase.from(table).update(data).eq('id', id).select()

export const deleteRecord = (table: string, id: string) =>
  supabase.from(table).delete().eq('id', id)
