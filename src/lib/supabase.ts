import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'

type SupabaseClient = SupabaseClientType<any, 'public', any>

function requireEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getPublicSupabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

let client: SupabaseClient | null = null
let adminClient: SupabaseClient | null = null

export function getSupabase() {
  if (!client) {
    client = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getPublicSupabaseKey() ?? requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    )
  }
  return client
}

// Server-side only — never expose to client.
export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    )
  }
  return adminClient
}

function lazyClient(getClient: () => SupabaseClient): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const actualClient = getClient()
      const value = Reflect.get(actualClient, prop)
      return typeof value === 'function' ? value.bind(actualClient) : value
    },
  })
}

export const supabase = lazyClient(getSupabase)
export const supabaseAdmin = lazyClient(getSupabaseAdmin)
