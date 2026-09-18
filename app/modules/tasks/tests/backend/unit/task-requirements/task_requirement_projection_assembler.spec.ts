import { test } from '@japa/runner'

import {
  collectTaskRequirementReferenceIds,
  mapTaskRequirementProjections,
} from '#modules/tasks/actions/mappers/task-requirements/task_requirement_projection_mapper'

const requirement = {
  id: 'requirement-1',
  task_id: 'task-1',
  skill_id: 'skill-1',
  project_skill_id: 'project-skill-1',
  source_project_professional_role_id: null,
  source_role_skill_id: null,
  minimum_level_id: 'level-1',
  target_level_id: 'level-2',
  assessment_ceiling_level_id: null,
  rubric_version_id: 'rubric-version-1',
  required_public_proficiency_code: 'l4',
  proficiency_level_id: null,
  is_mandatory: true,
  importance: 'high' as const,
  weight: 2,
  requirement_source: 'manual' as const,
  requirement_notes: 'Required for delivery',
  created_at: '2026-07-26T00:00:00.000Z',
}

test.group('Unit | Task requirement projection assembler', () => {
  test('maps ordered Tasks-owned projections from already-loaded facts', ({ assert }) => {
    const requirements = [
      requirement,
      {
        ...requirement,
        id: 'requirement-2',
        skill_id: 'skill-2',
        minimum_level_id: null,
        target_level_id: null,
      },
    ]
    assert.deepEqual(collectTaskRequirementReferenceIds(requirements), {
      skillIds: ['skill-1', 'skill-2'],
      proficiencyLevelIds: ['level-1', 'level-2'],
    })

    const projections = mapTaskRequirementProjections(requirements, {
      skills: [
        {
          id: 'skill-2',
          name: 'Distributed Systems',
          code: 'distributed-systems',
          categoryCode: 'technology',
          iconUrl: null,
        },
        {
          id: 'skill-1',
          name: 'TypeScript',
          code: 'typescript',
          categoryCode: 'technology',
          iconUrl: '/icons/typescript.svg',
        },
      ],
      proficiencyLevels: [
        {
          id: 'level-2',
          code: 'l6',
          displayName: 'Independent',
          shortName: 'L6',
          ordinal: 6,
        },
        {
          id: 'level-1',
          code: 'l4',
          displayName: 'Developing',
          shortName: 'L4',
          ordinal: 4,
        },
      ],
    })
    assert.deepEqual(
      projections.map((projection) => projection.id),
      ['requirement-1', 'requirement-2']
    )
    assert.deepInclude(projections[0], {
      semantic_level_provenance: 'explicit_range',
      is_semantic_level_claimable: true,
      skill: {
        id: 'skill-1',
        skill_name: 'TypeScript',
        skill_code: 'typescript',
        category_code: 'technology',
        icon_url: '/icons/typescript.svg',
      },
      minimum_level: {
        id: 'level-1',
        code: 'l4',
        display_name: 'Developing',
        short_name: 'L4',
        ordinal: 4,
      },
      target_level: {
        id: 'level-2',
        code: 'l6',
        display_name: 'Independent',
        short_name: 'L6',
        ordinal: 6,
      },
    })
    assert.isNull(projections[1]?.minimum_level)
    assert.isNull(projections[1]?.target_level)
    assert.equal(projections[1]?.semantic_level_provenance, 'public_hint_only')
    assert.isFalse(projections[1]?.is_semantic_level_claimable)
  })

  test('fails closed for a suspicious legacy row whose one level was flattened into all slots', ({
    assert,
  }) => {
    const legacyFlattenedRequirement = {
      ...requirement,
      minimum_level_id: 'level-1',
      target_level_id: 'level-1',
      assessment_ceiling_level_id: 'level-1',
      rubric_version_id: null,
      project_skill_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
      requirement_source: 'manual' as const,
    }

    const [projection] = mapTaskRequirementProjections([legacyFlattenedRequirement], {
      skills: [
        {
          id: 'skill-1',
          name: 'TypeScript',
          code: 'typescript',
          categoryCode: 'technology',
          iconUrl: null,
        },
      ],
      proficiencyLevels: [
        {
          id: 'level-1',
          code: 'l4',
          displayName: 'Developing',
          shortName: 'L4',
          ordinal: 4,
        },
      ],
    })

    assert.equal(projection?.semantic_level_provenance, 'legacy_flattened_unverified')
    assert.isFalse(projection?.is_semantic_level_claimable)
  })

  test('fails closed when a referenced Skills fact is missing', ({ assert }) => {
    assert.throws(
      () =>
        mapTaskRequirementProjections([requirement], {
          skills: [],
          proficiencyLevels: [],
        }),
      'Task requirement projection is missing Skills reference facts'
    )
  })
})
