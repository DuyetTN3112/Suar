import { test } from '@japa/runner'

import {
  mapTalentSearchDiscoveryHit,
  TALENT_SEARCH_DISCOVERY_BINDINGS,
} from '#modules/search/infra/adapters/search-discovery/talents/talent_search_discovery_bindings'
import { TALENT_SEARCH_INDEX_MAPPINGS } from '#modules/search/infra/repositories/entity-search/talents/talent_search_index_repository'

test.group('Talent Search discovery bindings', () => {
  test('maps a multi-label hit with stable talent identity and an allowlisted document', ({
    assert,
  }) => {
    const source = {
      user_id: 'talent-1',
      username: 'ada',
      display_name: 'Ada Lovelace',
      headline: 'Search engineer',
      bio: 'Builds reliable discovery systems',
      skill_ids: ['skill-search', 'skill-search', 'skill-postgres'],
      canonical_skill_ids: ['skills:skill-search', 'skills:skill-postgres'],
      canonical_skill_ids_known: true,
      canonical_skill_ids_count: 2,
      skill_category_refs: ['skills:category-platform'],
      skill_category_refs_known: true,
      skill_category_refs_count: 1,
      approved_skill_aliases_text: 'ES TypeScript',
      skill_evidence: [{
        skill_id: 'skills:skill-search',
        proficiency_order: 11,
        proficiency_code: 'l10',
        source: 'reviewed',
        review_state: 'reviewed',
      }],
      skill_evidence_known: true,
      skill_taxonomy_versions: ['skills:7'],
      skill_assignment_provenance: ['explicit'],
      skill_assignment_review_states: ['reviewed'],
      technologies: ['postgres', 'postgres', 'typescript'],
      business_domains: ['fintech', 'fintech'],
      problem_categories: ['discovery'],
      task_types: ['backend', 'backend'],
      trust_score: 0.92,
      completed_tasks: 12,
      updated_at: '2026-08-09T00:00:00.000Z',
      available_from: '2026-09-01',
      status: 'active',
      is_searchable: true,
      secret_provider_field: 'must-not-leak',
    }

    const hit = mapTalentSearchDiscoveryHit({ id: 'talent-1', source, score: 8 })

    assert.equal(hit.id, 'talent:talent-1')
    assert.equal(hit.entityType, 'talent')
    assert.equal(hit.entityId, 'talent-1')
    assert.equal(hit.source, 'talents')
    assert.deepEqual(hit.presentation, {
      title: 'ada',
      url: '/org/talents/open/talent-1',
      sourceLabel: 'Talent name',
      snippets: ['Search engineer'],
      breadcrumbs: [],
      primaryActionLabel: 'Open talent',
    })
    assert.deepEqual(hit.document.skills, ['skill-search', 'skill-postgres'])
    assert.deepEqual(hit.document.canonicalSkills, ['skills:skill-search', 'skills:skill-postgres'])
    assert.deepEqual(hit.document.skillCategories, ['skills:category-platform'])
    assert.equal(hit.document.approvedSkillAliasesText, 'ES TypeScript')
    assert.deepEqual(hit.document.skillTaxonomyVersions, ['skills:7'])
    assert.deepEqual(hit.document.skillAssignmentProvenance, ['explicit'])
    assert.deepEqual(hit.document.skillAssignmentReviewStates, ['reviewed'])
    assert.deepEqual(hit.document.skillEvidence, [{
      skillId: 'skills:skill-search',
      proficiencyOrder: 11,
      proficiencyCode: 'l10',
      source: 'reviewed',
      reviewState: 'reviewed',
    }])
    assert.equal(hit.document.availableFrom, '2026-09-01')
    assert.deepEqual(hit.document.technologies, ['postgres', 'typescript'])
    assert.deepEqual(hit.document.businessDomains, ['fintech'])
    assert.deepEqual(hit.document.taskTypes, ['backend'])
    assert.notProperty(hit.document, 'status')
    assert.notProperty(hit.document, 'is_searchable')
    assert.notProperty(hit.document, 'secret_provider_field')
  })

  test('rejects a hit whose source identity does not match the provider identity', ({ assert }) => {
    assert.throws(
      () =>
        mapTalentSearchDiscoveryHit({
          id: 'talent-other',
          source: {
            user_id: 'talent-1',
            username: 'ada',
            display_name: 'Ada Lovelace',
            trust_score: 0.9,
            completed_tasks: 1,
            updated_at: '2026-08-09T00:00:00.000Z',
          },
          score: 1,
        }),
      'Talent discovery hit identity mismatch'
    )
  })

  test('binds every semantic path to a strict production index mapping', ({ assert }) => {
    const mappedPaths = new Set(Object.keys(TALENT_SEARCH_INDEX_MAPPINGS.properties ?? {}))

    for (const binding of Object.values(TALENT_SEARCH_DISCOVERY_BINDINGS)) {
      for (const path of [binding.path, binding.presencePath, binding.cardinalityPath]) {
        if (path !== undefined) assert.isTrue(mappedPaths.has(path), `Missing mapping: ${path}`)
      }
    }
  })
})
