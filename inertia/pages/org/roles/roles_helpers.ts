import { normalizeRoleCode } from '@/lib/access_ui'

export interface PermissionPresentation {
  key: string
  label: string
  description: string
  category: string
}

export interface RoleEntry {
  code: string
  label: string
  description: string
  permissions: PermissionPresentation[]
  permissionCount: number
  isBuiltIn: boolean
  memberCount: number
}

export interface RolePreset {
  name: string
  description?: string
  permissions: string[]
}

export interface OrganizationRolesPageProps {
  organization: {
    id: string
    name: string
    slug: string
    description: string | null
  }
  summary: {
    approvedMembers: number
    pendingInvitations: number
    builtInRoleCount: number
    customRoleCount: number
  }
  organizationRoles: RoleEntry[]
  permissionCatalog: PermissionPresentation[]
  rolePresets: RolePreset[]
}

export interface CustomRoleDraft {
  name: string
  description: string
  permissions: string[]
}

function getCsrfToken(): string {
  return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
}

export async function saveOrganizationRoles(customRoles: CustomRoleDraft[]): Promise<string> {
  const response = await fetch('/org/roles', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': getCsrfToken(),
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      custom_roles: customRoles.map((role) => ({
        name: normalizeRoleCode(role.name),
        description: role.description.trim(),
        permissions: [...new Set(role.permissions)].sort(),
      })),
    }),
  })

  const payload = (await response.json()) as {
    success?: boolean
    message?: string
  }

  if (!response.ok || !payload.success) {
    throw new Error(payload.message ?? 'Không thể cập nhật vai trò.')
  }

  return payload.message ?? 'Đã cập nhật vai trò tùy chỉnh.'
}
