export type UserPermission =
  | 'justify'
  | 'resolve_apontamentos'
  | 'manage_vehicles'
  | 'manage_checklists'

export const ALL_PERMISSIONS: UserPermission[] = [
  'justify',
  'resolve_apontamentos',
  'manage_vehicles',
  'manage_checklists',
]

export type PermissionMeta = {
  key: UserPermission
  label: string
  description: string
}

export const PERMISSION_META: PermissionMeta[] = [
  {
    key: 'justify',
    label: 'Justificar ausências',
    description: 'Justificar checklists não realizados e apontamentos pendentes.',
  },
  {
    key: 'resolve_apontamentos',
    label: 'Resolver apontamentos',
    description: 'Marcar NCs como resolvidas e registrar reparos.',
  },
  {
    key: 'manage_vehicles',
    label: 'Gerenciar veículos',
    description: 'Cadastrar, editar e remover veículos da frota.',
  },
  {
    key: 'manage_checklists',
    label: 'Gerenciar checklists',
    description: 'Editar e excluir checklists enviados.',
  },
]

type PermissionUser = {
  role: 'super_admin' | 'admin' | 'user'
  permissions: UserPermission[]
}

export function hasPermission(user: PermissionUser | null | undefined, perm: UserPermission): boolean {
  if (!user) return false
  if (user.role === 'admin' || user.role === 'super_admin') return true
  return user.permissions.includes(perm)
}
