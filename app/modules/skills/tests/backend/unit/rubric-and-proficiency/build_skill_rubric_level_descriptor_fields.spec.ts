import { test } from '@japa/runner'

import { buildSkillRubricLevelDescriptorFields } from '#modules/skills/infra/adapters/rubric-and-proficiency/build_skill_rubric_level_descriptor_fields'

test.group('buildSkillRubricLevelDescriptorFields', () => {
  test('maps detailed proficiency descriptors into rubric overlay fields', ({ assert }) => {
    const payload = buildSkillRubricLevelDescriptorFields({
      expected_knowledge: 'Knows service boundaries well',
      expected_execution: 'Ships medium-scope contracts safely',
      autonomy_descriptor: 'Works independently on normal scope',
      complexity_descriptor: 'Handles medium complexity',
      quality_descriptor: 'Maintains stable interfaces',
      collaboration_descriptor: 'Coordinates well with backend peers',
      observable_behaviors: ['Explains trade-offs'],
      positive_examples: ['Defines stable DTOs'],
      negative_examples: ['Ships breaking changes'],
      evidence_guidance: 'Use merged PRs and review notes',
      ceiling_guidance: 'Do not exceed L7 without repeated cross-service evidence',
    })

    assert.deepEqual(payload, {
      knowledge_expectations: ['Knows service boundaries well'],
      observable_behaviors: ['Explains trade-offs'],
      positive_examples: ['Defines stable DTOs'],
      negative_examples: ['Ships breaking changes'],
      evidence_guidance: 'Use merged PRs and review notes',
      expected_execution: 'Ships medium-scope contracts safely',
      autonomy_descriptor: 'Works independently on normal scope',
      complexity_descriptor: 'Handles medium complexity',
      quality_descriptor: 'Maintains stable interfaces',
      collaboration_descriptor: 'Coordinates well with backend peers',
      ceiling_guidance: 'Do not exceed L7 without repeated cross-service evidence',
    })
  })
})
