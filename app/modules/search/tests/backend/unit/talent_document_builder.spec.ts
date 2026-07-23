import { test } from '@japa/runner'

import type {
  TalentSearchDocumentReader,
  TalentSearchDocumentRecord,
} from '#modules/search/actions/ports/outbound/talent_search_document_reader'
import { TalentSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/talents/talent_search_document_builder'

test.group('Unit | Talent Search Document Builder', () => {
  test('maps talent search record from domain reader into search document', async ({ assert }) => {
    const builder = new TalentSearchDocumentBuilder({
      findTalentSearchDocumentRecord: (userId: string) => {
        assert.equal(userId, 'user-1')

        return Promise.resolve({
          userId,
          username: 'elastic_architect',
          headline: 'Search platform engineer',
          bio: 'Distributed systems and search relevance specialist',
          status: 'active',
          isSearchable: true,
          skills: [
            { skillId: 'skill-1', skillName: 'Elasticsearch' },
            { skillId: 'skill-2', skillName: 'TypeScript' },
          ],
          publicAccomplishments: [],
          trustScore: 87,
          completedTasks: 14,
          reviewedSkillsCount: 2,
          importedSkillsCount: 1,
          underDisputeSkillsCount: 0,
          latestConfidenceSignal: 'high',
          updatedAt: '2026-07-04T02:00:00.000Z',
        } satisfies TalentSearchDocumentRecord)
      },
    } satisfies TalentSearchDocumentReader)

    const document = await builder.build('user-1')

    assert.deepEqual(document, {
      user_id: 'user-1',
      username: 'elastic_architect',
      display_name: 'elastic_architect',
      headline: 'Search platform engineer',
      bio: 'Distributed systems and search relevance specialist',
      status: 'active',
      is_active: true,
      is_searchable: true,
      skill_ids: ['skill-1', 'skill-2'],
      skill_ids_known: true,
      skill_ids_count: 2,
      skills_text: 'Elasticsearch TypeScript',
      canonical_skill_ids: [],
      canonical_skill_ids_known: false,
      canonical_skill_ids_count: 0,
      skill_category_refs: [],
      skill_category_refs_known: false,
      skill_category_refs_count: 0,
      approved_skill_aliases_text: '',
      skill_taxonomy_versions: [],
      skill_assignment_provenance: [],
      skill_assignment_review_states: [],
      accomplishments_text: '',
      business_domains: [],
      business_domains_known: true,
      business_domains_count: 0,
      problem_categories: [],
      problem_categories_known: true,
      problem_categories_count: 0,
      task_types: [],
      task_types_known: true,
      task_types_count: 0,
      technologies: [],
      technologies_known: true,
      technologies_count: 0,
      trust_score: 87,
      completed_tasks: 14,
      reviewed_skills_count: 2,
      imported_skills_count: 1,
      under_dispute_skills_count: 0,
      latest_confidence_signal: 'high',
      updated_at: '2026-07-04T02:00:00.000Z',
    })
  })

  test('indexes only public accomplishment vocabulary for talent discovery', async ({ assert }) => {
    const builder = new TalentSearchDocumentBuilder({
      findTalentSearchDocumentRecord: () => Promise.resolve({
        userId: 'user-2',
        username: 'public_builder',
        headline: null,
        bio: null,
        status: 'active',
        isSearchable: true,
        skills: [],
        publicAccomplishments: [
          {
            title: 'Checkout reliability',
            conciseStatement: 'Reduced payment failure rate',
            action: 'improved',
            object: 'checkout',
            taskType: 'incident_response',
            businessDomain: 'commerce',
            problemCategory: 'reliability',
            role: 'owner',
            ownershipLevel: 'primary_owner',
            verificationStatus: 'verified',
            confidenceBand: 'high',
            publishedAt: '2026-07-01T00:00:00.000Z',
            technology: ['TypeScript'],
            deliverableSummaries: ['Failure dashboard'],
            outcomeSummaries: ['Lowered failed payments'],
            capabilityLabels: ['Observability'],
          },
        ],
        trustScore: 0,
        completedTasks: 0,
        reviewedSkillsCount: 0,
        importedSkillsCount: 0,
        underDisputeSkillsCount: 0,
        latestConfidenceSignal: null,
        updatedAt: '2026-07-04T02:00:00.000Z',
      }),
    })

    const document = await builder.build('user-2')

    assert.deepEqual(document?.business_domains, ['commerce'])
    assert.deepEqual(document?.problem_categories, ['reliability'])
    assert.deepEqual(document?.task_types, ['incident_response'])
    assert.deepEqual(document?.technologies, ['TypeScript'])
    assert.include(document?.accomplishments_text, 'Failure dashboard')
    assert.notInclude(document?.accomplishments_text, 'reviewer')
  })

  test('preserves the authoritative skill taxonomy projection separately from labels', async ({
    assert,
  }) => {
    const builder = new TalentSearchDocumentBuilder({
      findTalentSearchDocumentRecord: () =>
        Promise.resolve({
          userId: 'user-3',
          username: 'canonical_builder',
          headline: null,
          bio: null,
          status: 'active',
          isSearchable: true,
          skills: [
            {
              skillId: 'skill-1',
              skillName: 'Elasticsearch',
              canonicalRef: 'skills:skill-1',
              categoryRefs: ['skills:category-technology'],
              approvedAliases: ['ES'],
              taxonomyVersion: 9,
              assignmentProvenance: 'explicit',
              assignmentReviewState: 'reviewed',
            },
          ],
          publicAccomplishments: [],
          trustScore: 0,
          completedTasks: 0,
          reviewedSkillsCount: 1,
          importedSkillsCount: 0,
          underDisputeSkillsCount: 0,
          latestConfidenceSignal: null,
          updatedAt: '2026-07-04T02:00:00.000Z',
        } satisfies TalentSearchDocumentRecord),
    })

    const document = await builder.build('user-3')

    assert.deepEqual(
      {
      canonical_skill_ids: ['skills:skill-1'],
      canonical_skill_ids_known: true,
      canonical_skill_ids_count: 1,
      skill_category_refs: ['skills:category-technology'],
      skill_category_refs_known: true,
      skill_category_refs_count: 1,
      approved_skill_aliases_text: 'ES',
      skill_taxonomy_versions: ['skills:9'],
      skill_assignment_provenance: ['explicit'],
      skill_assignment_review_states: ['reviewed'],
      },
      {
        canonical_skill_ids: document?.canonical_skill_ids,
        canonical_skill_ids_known: document?.canonical_skill_ids_known,
        canonical_skill_ids_count: document?.canonical_skill_ids_count,
        skill_category_refs: document?.skill_category_refs,
        skill_category_refs_known: document?.skill_category_refs_known,
        skill_category_refs_count: document?.skill_category_refs_count,
        approved_skill_aliases_text: document?.approved_skill_aliases_text,
        skill_taxonomy_versions: document?.skill_taxonomy_versions,
        skill_assignment_provenance: document?.skill_assignment_provenance,
        skill_assignment_review_states: document?.skill_assignment_review_states,
      }
    )
  })

  test('preserves the source availability date as a separate date field', async ({ assert }) => {
    const builder = new TalentSearchDocumentBuilder({
      findTalentSearchDocumentRecord: () =>
        Promise.resolve({
          userId: 'user-4',
          username: 'available_builder',
          headline: null,
          bio: null,
          status: 'active',
          isSearchable: true,
          skills: [],
          availableFrom: '2026-09-01',
          publicAccomplishments: [],
          trustScore: 0,
          completedTasks: 0,
          reviewedSkillsCount: 0,
          importedSkillsCount: 0,
          underDisputeSkillsCount: 0,
          latestConfidenceSignal: null,
          updatedAt: '2026-08-09T00:00:00.000Z',
        }),
    })

    const document = await builder.build('user-4')

    assert.equal(document?.available_from, '2026-09-01')
    assert.notProperty(document, 'availableFrom')
  })

  test('keeps proficiency attached to its skill for same-object filtering', async ({ assert }) => {
    const builder = new TalentSearchDocumentBuilder({
      findTalentSearchDocumentRecord: () =>
        Promise.resolve({
          userId: 'user-5',
          username: 'proficiency_builder',
          headline: null,
          bio: null,
          status: 'active',
          isSearchable: true,
          skills: [
            {
              skillId: 'skill-search',
              skillName: 'Search',
              proficiencyCode: 'l10',
              proficiencyOrder: 11,
              evidenceSource: 'reviewed',
              evidenceReviewState: 'reviewed',
            },
            {
              skillId: 'skill-design',
              skillName: 'Design',
              proficiencyCode: 'l4',
              proficiencyOrder: 5,
              evidenceSource: 'reviewed',
              evidenceReviewState: 'reviewed',
            },
          ],
          publicAccomplishments: [],
          trustScore: 0,
          completedTasks: 0,
          reviewedSkillsCount: 2,
          importedSkillsCount: 0,
          underDisputeSkillsCount: 0,
          latestConfidenceSignal: null,
          updatedAt: '2026-08-09T00:00:00.000Z',
        }),
    })

    const document = await builder.build('user-5')

    assert.deepEqual(document?.skill_evidence, [
      {
        skill_id: 'skill-search',
        proficiency_code: 'l10',
        proficiency_order: 11,
        source: 'reviewed',
        review_state: 'reviewed',
      },
      {
        skill_id: 'skill-design',
        proficiency_code: 'l4',
        proficiency_order: 5,
        source: 'reviewed',
        review_state: 'reviewed',
      },
    ])
  })
})
