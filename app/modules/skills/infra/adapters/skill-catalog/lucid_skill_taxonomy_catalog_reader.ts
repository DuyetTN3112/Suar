import { createHash } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  SkillTaxonomyCatalogReader,
  SkillTaxonomyCatalogSnapshot,
  SkillTaxonomySourceTerm,
} from '#modules/skills/actions/ports/outbound/skill_taxonomy_catalog_reader'
import Skill from '#modules/skills/infra/models/skill-catalog/skill'
import {
  SKILL_CATEGORY_LABELS,
  SKILL_CATEGORY_ORDER,
} from '#modules/skills/public_contracts/skill_constants'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'

type TaxonomyTerm = SkillTaxonomySourceTerm['term']
type TaxonomyAlias = TaxonomyTerm['aliases'][number]

interface RevisionRow {
  readonly category_fingerprint: string
  readonly revision: string | number
}

const NAMESPACE = 'skills'
const CATEGORY_PREFIX = 'category-'

function categoryRef(categoryCode: string) {
  return { namespace: NAMESPACE, termId: `${CATEGORY_PREFIX}${categoryCode}` }
}

function aliasKind(value: string): TaxonomyAlias['kind'] {
  return /^[A-Z0-9.+#-]{1,12}$/u.test(value.trim()) ? 'abbreviation' : 'synonym'
}

function aliasReviewState(source: string): TaxonomyAlias['reviewState'] {
  return ['manual', 'reviewed', 'curated'].includes(source.trim().toLocaleLowerCase('en-US'))
    ? 'reviewed'
    : 'suggested'
}

function normalizeLocale(locale: string): string {
  const candidate = locale.trim().replaceAll('_', '-')
  try {
    return (Intl.getCanonicalLocales(candidate)[0] ?? 'en').toLocaleLowerCase('en-US')
  } catch {
    return 'en'
  }
}

function categoryFingerprint(): string {
  const canonicalCategories = SKILL_CATEGORY_ORDER.map((categoryCode) => ({
    categoryCode,
    labels: SKILL_CATEGORY_LABELS[categoryCode],
  }))
  return createHash('sha256').update(JSON.stringify(canonicalCategories), 'utf8').digest('hex')
}

function positiveSafeRevision(value: string | number): number {
  const revision = Number(value)
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new PersistedDataIntegrityException('Skill taxonomy revision is invalid')
  }
  return revision
}

function categoryTerms(version: number): SkillTaxonomySourceTerm[] {
  return SKILL_CATEGORY_ORDER.map((categoryCode) => {
    const labels = SKILL_CATEGORY_LABELS[categoryCode]
    return {
      term: {
        ref: categoryRef(categoryCode),
        version,
        status: 'active',
        labels: { en: labels.label, vi: labels.labelVi },
        aliases: [],
        parentRefs: [],
        metadata: { termType: 'category', categoryCode },
      },
      visibility: { kind: 'public' },
    }
  })
}

function skillTerm(skill: Skill, version: number): SkillTaxonomySourceTerm {
  const aliases: TaxonomyAlias[] = skill.aliases.map((alias) => ({
    locale: normalizeLocale(alias.locale),
    value: alias.alias,
    kind: aliasKind(alias.alias),
    reviewState: aliasReviewState(alias.source),
  }))
  const term: TaxonomyTerm = {
    ref: { namespace: NAMESPACE, termId: skill.id },
    version,
    // is_active is reversible in the Skills domain. `retired` is terminal in
    // taxonomy, so an inactive skill is deliberately projected as deprecated.
    status: skill.is_active ? 'active' : 'deprecated',
    labels: { en: skill.skill_name },
    aliases,
    parentRefs: [categoryRef(skill.category_code)],
    metadata: {
      termType: 'skill',
      skillCode: skill.skill_code,
      categoryCode: skill.category_code,
      displayType: skill.display_type,
    },
  }
  return { term, visibility: { kind: 'public' } }
}

export class LucidSkillTaxonomyCatalogReader implements SkillTaxonomyCatalogReader {
  async loadSnapshot(): Promise<SkillTaxonomyCatalogSnapshot> {
    return db.transaction(
      async (trx) => {
        const revisionResult: unknown = await trx.rawQuery(
          'SELECT revision, category_fingerprint FROM skill_taxonomy_revision WHERE singleton = TRUE'
        )
        const revisionRow = (revisionResult as { rows?: RevisionRow[] }).rows?.[0]
        if (!revisionRow || revisionRow.category_fingerprint !== categoryFingerprint()) {
          // Category constants are source truth too. A category change must ship
          // with a migration that advances this durable revision and fingerprint.
          throw new PersistedDataIntegrityException('Skill taxonomy category revision is unavailable')
        }
        const version = positiveSafeRevision(revisionRow.revision)
        const skills = await Skill.query({ client: trx })
          .preload('aliases', (query) => {
            void query.orderBy('alias', 'asc').orderBy('id', 'asc')
          })
          .orderBy('sort_order', 'asc')
          .orderBy('id', 'asc')

        return {
          version,
          // The existing skills schema has no organization ownership column.
          // Claiming private vocabulary support here would leak globally, so this
          // adapter explicitly publishes only global terms and fails if that changes.
          organizationVocabulary: 'unsupported',
          terms: [...categoryTerms(version), ...skills.map((skill) => skillTerm(skill, version))],
        }
      },
      { isolationLevel: 'repeatable read' }
    )
  }
}
