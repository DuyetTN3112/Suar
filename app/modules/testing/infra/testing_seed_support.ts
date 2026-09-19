import db from '@adonisjs/lucid/services/db'

import { testingDatabaseCleaner } from './testing_database_cleaner.js'

import { hashSavedFilterSemanticState } from '#modules/filtering/domain/saved-filter-views/saved_filter_view'
import { NodeFilterHashGenerator } from '#modules/filtering/infra/adapters/filtering-runtime/node_filter_hash_generator'
import { listCanonicalProficiencyLevelOptions } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_framework'
import { UserFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

export type TestingSkillImportance = 'low' | 'medium' | 'high' | 'critical'
export type TestingAuditSurface = 'system' | 'organization' | 'user'
export type TestingAuditScope = {
  surface: TestingAuditSurface
  user_id: string | null
  organization_id: string | null
}
export type TestingRoleSkillInput = {
  skill_name: string
  category_code: string
  importance: TestingSkillImportance
}

export const TESTING_TASK_METADATA_TAXONOMY_REVISIONS = [
  'business-domains',
  'problem-categories',
  'task-types',
  'technologies',
] as const

export const hashTestingSemanticState = (state: unknown): string =>
  (
    hashSavedFilterSemanticState as unknown as (
      value: unknown,
      generator: NodeFilterHashGenerator
    ) => string
  )(state, new NodeFilterHashGenerator())

export async function ensureTestingTaskMetadataTaxonomyRevisions(): Promise<void> {
  await db
    .table('task_metadata_taxonomy_revisions')
    .insert(
      TESTING_TASK_METADATA_TAXONOMY_REVISIONS.map((namespace) => ({
        namespace,
        revision: 1,
        source_fingerprint: '0'.repeat(64),
      }))
    )
    .onConflict('namespace')
    .ignore()
}

export function uniqueTestingAuditScopes(scopes: TestingAuditScope[]): TestingAuditScope[] {
  const seen = new Set<string>()
  const uniqueScopes: TestingAuditScope[] = []

  for (const scope of scopes) {
    const key = `${scope.surface}:${scope.user_id ?? ''}:${scope.organization_id ?? ''}`
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    uniqueScopes.push(scope)
  }

  return uniqueScopes
}

export async function findOrCreateTestingAuditUserByEmail(
  email: string,
  seedKey: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = (await db
    .from('users')
    .whereRaw('lower(email) = ?', [normalizedEmail])
    .select('id')
    .first()) as { id?: string } | undefined

  if (existing?.id) {
    return existing.id
  }

  const usernameSuffix = seedKey.replace(/[^a-z0-9]/gi, '_')
  const user = await UserFactory.create({
    email: normalizedEmail,
    username: `audit_user_${usernameSuffix}`,
  })
  return user.id
}

export async function getPreviousTestingAuditHash(): Promise<string | null> {
  if (!(await testingDatabaseCleaner.columnExists('audit_events', 'event_hash'))) {
    return null
  }

  const previous = (await db
    .from('audit_events')
    .whereNotNull('event_hash')
    .orderBy('occurred_at', 'desc')
    .orderBy('id', 'desc')
    .select('event_hash')
    .first()) as { event_hash?: string | null } | undefined

  return previous?.event_hash ?? null
}

export async function ensureTestingCanonicalProficiencyLevels(): Promise<Map<string, string>> {
  let scale = (await db
    .from('proficiency_scales')
    .where('is_active', true)
    .select('id')
    .first()) as { id: string } | null

  if (!scale?.id) {
    const existingScale = (await db
      .from('proficiency_levels')
      .select('scale_id as id')
      .first()) as { id: string } | null

    if (existingScale?.id) {
      await db.from('proficiency_scales').where('id', existingScale.id).update({ is_active: true })
      scale = existingScale
    } else {
      const scaleId = testId()
      await db.table('proficiency_scales').insert({
        id: scaleId,
        code: `testing-canonical-${scaleId.slice(0, 8)}`,
        name: 'Testing Canonical L0-L14',
        version: 1,
        is_active: true,
      })
      scale = { id: scaleId }
    }
  }

  const levelsByCode = new Map<string, string>()
  for (const option of listCanonicalProficiencyLevelOptions()) {
    const existingByCode = (await db
      .from('proficiency_levels')
      .where('code', option.value)
      .select('id')
      .first()) as { id: string } | null

    if (existingByCode?.id) {
      levelsByCode.set(option.value, existingByCode.id)
      continue
    }

    const existingByOrdinal = (await db
      .from('proficiency_levels')
      .where('ordinal', option.order)
      .select('id')
      .first()) as { id: string } | null

    if (existingByOrdinal?.id) {
      levelsByCode.set(option.value, existingByOrdinal.id)
      continue
    }

    const levelId = testId()
    await db.table('proficiency_levels').insert({
      id: levelId,
      scale_id: scale.id,
      ordinal: option.order,
      code: option.value,
      display_name: option.label,
      short_name: option.code,
      normalized_value: Number(((option.order - 1) / 14).toFixed(2)),
      sort_order: option.order,
    })
    levelsByCode.set(option.value, levelId)
  }

  return levelsByCode
}
