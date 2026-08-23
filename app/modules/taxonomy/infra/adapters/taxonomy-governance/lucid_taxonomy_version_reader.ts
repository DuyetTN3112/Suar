import db from '@adonisjs/lucid/services/db'

import { TaxonomyProviderUnavailableError } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

const TASK_METADATA_NAMESPACES = new Set([
  'business-domains',
  'problem-categories',
  'task-types',
  'technologies',
])

function validRevision(value: unknown): number | null {
  const revision = Number(value)
  return Number.isSafeInteger(revision) && revision > 0 ? revision : null
}

function validFingerprint(value: unknown): boolean {
  return typeof value === 'string' && /^[0-9a-f]{64}$/i.test(value)
}

export class LucidTaxonomyVersionReader {
  async getVersion(namespace: string): Promise<number> {
    if (namespace === 'skills') {
      const row = (await db
        .from('skill_taxonomy_revision')
        .select('revision', 'category_fingerprint')
        .where('singleton', true)
        .first()) as { revision?: unknown; category_fingerprint?: unknown } | undefined
      const revision = validRevision(row?.revision)
      if (revision !== null && validFingerprint(row?.category_fingerprint)) return revision
      throw new TaxonomyProviderUnavailableError(namespace)
    }

    if (!TASK_METADATA_NAMESPACES.has(namespace)) {
      throw new TaxonomyProviderUnavailableError(namespace)
    }
    const row = (await db
      .from('task_metadata_taxonomy_revisions')
      .select('revision', 'source_fingerprint')
      .where('namespace', namespace)
      .first()) as { revision?: unknown; source_fingerprint?: unknown } | undefined
    const revision = validRevision(row?.revision)
    if (revision !== null && validFingerprint(row?.source_fingerprint)) return revision
    throw new TaxonomyProviderUnavailableError(namespace)
  }
}
