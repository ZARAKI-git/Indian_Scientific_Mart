import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export const CATALOGUE_TAG = "catalogue";

/**
 * Anonymous, cookie-less client for public catalogue reads (RLS applies).
 * Reads go through Next's data cache for at most 5 minutes, tagged so admin
 * edits and re-ingestion can purge them at once (revalidateTag).
 */
let publicClient: SupabaseClient | null = null;
export function publicDb(): SupabaseClient {
  publicClient ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300, tags: [CATALOGUE_TAG] } }) },
  });
  return publicClient;
}

/** Session-bound client for the admin area (RLS checks is_admin()). */
export async function sessionDb(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          /* called from a Server Component: middleware refreshes the session instead */
        }
      },
    },
  });
}

/** Service-role client. Server only; used to write quote requests and refresh counts. */
let serviceClient: SupabaseClient | null = null;
export function serviceDb(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  serviceClient ??= createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) } });
  return serviceClient;
}
