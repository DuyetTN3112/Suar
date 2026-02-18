import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  mapProficiencyScale,
  mapSkillRubricLevel,
} from '#modules/admin/proficiency/controllers/mappers/response/proficiency_view_model_mapper'
import ProficiencyLevel from '#modules/skills/infra/models/proficiency_level'
import ProficiencyScale from '#modules/skills/infra/models/proficiency_scale'
import SkillRubricLevel from '#modules/skills/infra/models/skill_rubric_level'

function makeLevel(overrides: Partial<ProficiencyLevel> = {}): ProficiencyLevel {
  const level = new ProficiencyLevel()
  Object.assign(level, {
    id: 'level-1',
    scale_id: 'scale-1',
    ordinal: 7,
    code: 'l7',
    display_name: 'Middle Solid',
    short_name: 'L7',
    normalized_value: 0.5,
    generic_description: 'Consistently delivers medium-complexity work.',
    sort_order: 7,
    expected_knowledge: 'Understands maintainability and patterns.',
    expected_execution: 'Delivers medium-complexity work consistently.',
    autonomy_descriptor: 'Requires minimal supervision.',
    complexity_descriptor: 'Handles medium complexity comfortably.',
    quality_descriptor: 'Output is maintainable and team-compatible.',
    collaboration_descriptor: 'Reviews simple work by others constructively.',
    observable_behaviors: ['Designs module-level solutions'],
    positive_examples: ['Writes maintainable work'],
    negative_examples: ['Needs rescue on normal blockers'],
    evidence_guidance: 'Use accepted task outcomes and review rationale.',
    ceiling_guidance: 'Do not exceed L7 when ambiguity handling is not yet proven.',
    created_at: DateTime.now(),
    updated_at: DateTime.now(),
  } satisfies Partial<ProficiencyLevel>)
  Object.assign(level, overrides)
  return level
}

test.group('Admin proficiency view model', () => {
  test('maps frameworkDescriptor into proficiency scale levels', ({ assert }) => {
    const level = makeLevel()
    const scale = new ProficiencyScale()
    Object.assign(scale, {
      id: 'scale-1',
      code: 'system_default',
      name: 'System Default Scale',
      version: 5,
      is_active: true,
      effective_from: DateTime.now(),
      effective_to: null,
      created_at: DateTime.now(),
      updated_at: DateTime.now(),
    } satisfies Partial<ProficiencyScale>)
    Reflect.set(scale, 'levels', [level])

    const mapped = mapProficiencyScale(scale)

    assert.equal(mapped.levels[0]?.frameworkDescriptor.source, 'suar-kb-v5')
    assert.equal(mapped.levels[0]?.frameworkDescriptor.canonicalLevelCode, 'L7')
    assert.equal(mapped.levels[0]?.frameworkDescriptor.canonicalLevelName, 'Middle Solid')
  })

  test('maps rubric proficiency level detail consistently with JSON read surface', ({ assert }) => {
    const level = makeLevel()
    const rubricLevel = new SkillRubricLevel()
    Object.assign(rubricLevel, {
      id: 'rubric-level-1',
      proficiency_level_id: level.id,
      rubric_version_id: 'rubric-version-1',
      summary: 'Can design maintainable service contracts',
      knowledge_expectations: ['Understands HTTP contracts'],
      observable_behaviors: ['Explains trade-offs clearly'],
      independence_expectations: 'Works independently on medium scope',
      complexity_expectations: 'Handles medium complexity APIs',
      impact_scope_expectations: 'Affects service boundaries',
      positive_examples: ['Defines stable request/response semantics'],
      negative_examples: ['Ships ambiguous contracts'],
      evidence_guidance: 'Use merged PRs and review notes',
      expected_execution: 'Delivers medium-complexity work consistently.',
      autonomy_descriptor: 'Requires minimal supervision.',
      complexity_descriptor: 'Handles medium complexity comfortably.',
      quality_descriptor: 'Output is maintainable and team-compatible.',
      collaboration_descriptor: 'Reviews simple work by others constructively.',
      ceiling_guidance: 'Do not exceed L7 when ambiguity handling is not yet proven.',
      created_at: DateTime.now(),
      updated_at: DateTime.now(),
    } satisfies Partial<SkillRubricLevel>)
    Reflect.set(rubricLevel, 'level', level)

    const mapped = mapSkillRubricLevel(rubricLevel)

    assert.equal(mapped.proficiencyLevel.frameworkDescriptor.source, 'suar-kb-v5')
    assert.equal(mapped.proficiencyLevel.expectedKnowledge, level.expected_knowledge)
    assert.equal(mapped.proficiencyLevel.expectedExecution, level.expected_execution)
    assert.equal(mapped.proficiencyLevel.autonomyDescriptor, level.autonomy_descriptor)
    assert.equal(mapped.proficiencyLevel.complexityDescriptor, level.complexity_descriptor)
    assert.equal(mapped.proficiencyLevel.qualityDescriptor, level.quality_descriptor)
    assert.equal(
      mapped.proficiencyLevel.collaborationDescriptor,
      level.collaboration_descriptor
    )
    assert.deepEqual(mapped.proficiencyLevel.observableBehaviors, level.observable_behaviors)
    assert.equal(mapped.proficiencyLevel.evidenceGuidance, level.evidence_guidance)
    assert.equal(mapped.proficiencyLevel.ceilingGuidance, level.ceiling_guidance)
  })

  test('canonicalizes legacy level codes in view models before returning app-layer payloads', ({
    assert,
  }) => {
    const legacyLevel = makeLevel({
      code: 'middle',
      display_name: 'middle',
      short_name: 'mid',
    })

    const scale = new ProficiencyScale()
    Object.assign(scale, {
      id: 'scale-legacy',
      code: 'legacy_scale',
      name: 'Legacy Scale',
      version: 1,
      is_active: true,
      effective_from: DateTime.now(),
      effective_to: null,
      created_at: DateTime.now(),
      updated_at: DateTime.now(),
    } satisfies Partial<ProficiencyScale>)
    Reflect.set(scale, 'levels', [legacyLevel])

    const mappedScale = mapProficiencyScale(scale)
    assert.equal(mappedScale.levels[0]?.code, 'l7')
    assert.equal(mappedScale.levels[0]?.displayName, 'Middle Solid')
    assert.equal(mappedScale.levels[0]?.shortName, 'L7')

    const rubricLevel = new SkillRubricLevel()
    Object.assign(rubricLevel, {
      id: 'rubric-legacy',
      proficiency_level_id: legacyLevel.id,
      rubric_version_id: 'rubric-version-legacy',
      created_at: DateTime.now(),
      updated_at: DateTime.now(),
    } satisfies Partial<SkillRubricLevel>)
    Reflect.set(rubricLevel, 'level', legacyLevel)

    const mappedRubricLevel = mapSkillRubricLevel(rubricLevel)
    assert.equal(mappedRubricLevel.proficiencyLevel.code, 'l7')
    assert.equal(mappedRubricLevel.proficiencyLevel.displayName, 'Middle Solid')
    assert.equal(mappedRubricLevel.proficiencyLevel.shortName, 'L7')
  })
})
