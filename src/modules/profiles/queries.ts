import 'server-only'
import { requireUser } from '@/modules/auth/session'

export async function getMyProfile(): Promise<{ displayName: string } | null> {
  const { supabase, userId } = await requireUser()
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? { displayName: data.display_name } : null
}
