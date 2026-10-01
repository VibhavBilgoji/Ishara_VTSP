import { createClient } from '@supabase/supabase-js'
import 'server-only'

/**
 * Service-role Supabase client — bypasses RLS.
 * Use only after verifying kiosk credentials, or in the secret exchange.
 * 
 * NEVER import this in client-side code or expose the service key.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
