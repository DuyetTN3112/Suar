import type { PolicyResult } from '#domain/shared/policy_result'
import { PolicyResult as PR } from '#domain/shared/policy_result'

export interface OrganizationCreationContext {
  actorIsActive: boolean
}

export interface OrganizationSlugInput {
  name: string
  slug?: string | null
}

export function canCreateOrganization(ctx: OrganizationCreationContext): PolicyResult {
  if (!ctx.actorIsActive) {
    return PR.deny('Creator không tồn tại hoặc không active', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function normalizeOrganizationName(name: string): string {
  return name.trim()
}

export function normalizeOrganizationSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')
}

export function resolveOrganizationBaseSlug(input: OrganizationSlugInput): string {
  const normalizedSlug =
    typeof input.slug === 'string' && input.slug.trim().length > 0
      ? normalizeOrganizationSlug(input.slug)
      : ''

  if (normalizedSlug.length > 0) {
    return normalizedSlug
  }

  return normalizeOrganizationSlug(input.name)
}

export function buildOrganizationSlugCandidate(baseSlug: string, attempt: number): string {
  if (attempt <= 0) {
    return baseSlug
  }

  return `${baseSlug}-${String(attempt)}`
}

export async function resolveUniqueOrganizationSlug(
  baseSlug: string,
  slugExists: (candidate: string) => Promise<boolean>,
  maxAttempts: number = 1000
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    const candidate = buildOrganizationSlugCandidate(baseSlug, attempt)
    if (!(await slugExists(candidate))) {
      return candidate
    }
  }

  return null
}
