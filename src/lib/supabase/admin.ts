import { createClient } from '@supabase/supabase-js'

// Service-role client for server-only operations (cron jobs, admin tasks).
// Never expose to the browser — only import in API routes.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
