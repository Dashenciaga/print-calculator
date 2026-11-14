import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './publicConfig'

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  )
}