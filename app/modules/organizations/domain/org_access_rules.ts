import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import type { CustomRoleDefinition } from '#types/database'

export interface OrganizationDepartmentTemplate {
  id: string
  name: string
  description: string
  focus: string
  suggestedRoles: string[]
}

export interface OrganizationDepartmentCoverage extends OrganizationDepartmentTemplate {
  matchedRoles: string[]
  estimatedHeadcount: number
}

interface CustomRoleCandidate {
  name?: unknown
  description?: unknown
  permissions?: unknown
}

export const ORG_ROLE_PRESETS: CustomRoleDefinition[] = [
  {
    name: 'hr',
    description: 'Điều phối tuyển dụng, onboarding và vận hành con người.',
    permissions: [
      'can_manage_members',
      'can_invite_members',
      'can_approve_members',
      'can_view_audit_logs',
    ],
  },
  {
    name: 'cto',
    description: 'Dẫn dắt kiến trúc kỹ thuật và chuẩn triển khai của organization.',
    permissions: [
      'can_create_project',
      'can_manage_settings',
      'can_view_all_projects',
      'can_manage_integrations',
    ],
  },
  {
    name: 'project_manager',
    description: 'Điều phối danh mục dự án, nhân lực và nhịp bàn giao.',
    permissions: [
      'can_create_project',
      'can_manage_members',
      'can_view_all_projects',
      'can_invite_members',
    ],
  },
  {
    name: 'pm',
    description: 'Quản trị delivery, phối hợp project và follow-up tiến độ.',
    permissions: ['can_create_project', 'can_view_all_projects', 'can_manage_members'],
  },
]

export const ORG_DEPARTMENT_TEMPLATES: OrganizationDepartmentTemplate[] = [
  {
    id: 'leadership',
    name: 'Leadership',
    description: 'Khu vực định hướng chiến lược, ownership và quyết định hệ thống.',
    focus: 'Ownership, escalation, org strategy',
    suggestedRoles: ['org_owner', 'cto', 'project_manager'],
  },
  {
    id: 'people',
    name: 'People & Hiring',
    description: 'Điều phối con người, tuyển dụng và giữ nhịp nội bộ.',
    focus: 'Recruitment, onboarding, team operations',
    suggestedRoles: ['hr', 'people_ops', 'recruiter'],
  },
  {
    id: 'delivery',
    name: 'Delivery & PMO',
    description: 'Theo dõi dự án, tiến độ và cam kết bàn giao liên team.',
    focus: 'Portfolio execution, delivery governance',
    suggestedRoles: ['pm', 'project_manager', 'scrum_master'],
  },
  {
    id: 'engineering',
    name: 'Engineering',
    description: 'Nhóm kỹ thuật chịu trách nhiệm kiến trúc, build và vận hành sản phẩm.',
    focus: 'Architecture, implementation, technical standards',
    suggestedRoles: ['cto', 'tech_lead', 'backend_lead', 'frontend_lead'],
  },
]

function isCustomRoleCandidate(value: unknown): value is CustomRoleCandidate {
  return typeof value === 'object' && value !== null
}

export function normalizeRoleCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function sanitizeCustomRoleDefinitions(input: unknown): CustomRoleDefinition[] {
  if (!Array.isArray(input)) {
    return []
  }

  const seen = new Set<string>()
  const builtInRoles = new Set<string>(Object.values(OrganizationRole))
  const sanitized: CustomRoleDefinition[] = []

  for (const item of input) {
    if (!isCustomRoleCandidate(item)) {
      continue
    }

    const normalizedName = typeof item.name === 'string' ? normalizeRoleCode(item.name) : ''
    if (!normalizedName || builtInRoles.has(normalizedName) || seen.has(normalizedName)) {
      continue
    }

    const description =
      typeof item.description === 'string' && item.description.trim().length > 0
        ? item.description.trim().slice(0, 200)
        : undefined

    const permissionsInput = Array.isArray(item.permissions) ? item.permissions : []
    const permissions = [
      ...new Set(
        permissionsInput
          .filter((value): value is string => typeof value === 'string')
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      ),
    ]

    sanitized.push({
      name: normalizedName,
      permissions,
      ...(description ? { description } : {}),
    })
    seen.add(normalizedName)
  }

  return sanitized.slice(0, 24)
}

export function getAssignableOrganizationRoles(customRoles: unknown): string[] {
  return [
    OrganizationRole.ADMIN,
    OrganizationRole.MEMBER,
    ...sanitizeCustomRoleDefinitions(customRoles).map((role) => role.name),
  ]
}

export function buildOrganizationDepartmentCoverage(
  roleDistribution: ReadonlyMap<string, number>
): OrganizationDepartmentCoverage[] {
  return ORG_DEPARTMENT_TEMPLATES.map((department) => {
    const matchedRoles = department.suggestedRoles.filter((role) => roleDistribution.has(role))
    const estimatedHeadcount = matchedRoles.reduce(
      (total, role) => total + (roleDistribution.get(role) ?? 0),
      0
    )

    return {
      ...department,
      matchedRoles,
      estimatedHeadcount,
    }
  })
}
