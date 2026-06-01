import { supabase } from '../lib/supabase'
import type { UserPermission } from '../auth/permissions'

export async function fetchUserPermissions(userId: string): Promise<UserPermission[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.permission as UserPermission)
}

export async function saveUserPermissions(
  userId: string,
  permissions: UserPermission[],
): Promise<void> {
  const { data: current, error: readError } = await supabase
    .from('user_permissions')
    .select('permission')
    .eq('user_id', userId)

  if (readError) throw new Error(readError.message)

  const currentSet = new Set((current ?? []).map((r) => r.permission as UserPermission))
  const nextSet = new Set(permissions)

  const toAdd = permissions.filter((p) => !currentSet.has(p))
  const toRemove = [...currentSet].filter((p) => !nextSet.has(p))

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId)
      .in('permission', toRemove)
    if (error) throw new Error(error.message)
  }

  if (toAdd.length > 0) {
    const { error } = await supabase.from('user_permissions').insert(
      toAdd.map((permission) => ({ user_id: userId, permission })),
    )
    if (error) throw new Error(error.message)
  }
}
