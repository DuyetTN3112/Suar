import { test } from '@japa/runner'

import GetTaskMetadataQuery from '#modules/tasks/actions/queries/get_task_metadata_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  SkillFactory,
} from '#tests/helpers/factories'

test.group('Integration | Task metadata query', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns canonical proficiency metadata instead of runtime legacy scale rows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await SkillFactory.create({
      skill_name: 'TypeScript',
      category_code: 'technology',
    })

    const query = new GetTaskMetadataQuery(makeSystemTaskActionContext(owner.id), taskExternalDeps)
    const result = await query.execute(org.id)

    assert.equal(result.proficiencyLevels[0]?.value, 'l0')
    assert.equal(result.proficiencyLevels[1]?.value, 'l1')
    assert.isTrue(result.proficiencyLevels.some((level) => level.value === 'l10'))
    assert.isFalse(result.proficiencyLevels.some((level) => level.value === 'senior'))
    assert.equal(result.availableSkills[0]?.categoryCode, 'technology')
  })
})
