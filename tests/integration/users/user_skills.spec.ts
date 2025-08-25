import { test } from '@japa/runner'

import AddUserSkillCommand from '#actions/users/commands/add_user_skill_command'
import RemoveUserSkillCommand from '#actions/users/commands/remove_user_skill_command'
import UpdateUserSkillCommand from '#actions/users/commands/update_user_skill_command'
import {
  AddUserSkillDTO,
  RemoveUserSkillDTO,
  UpdateUserSkillDTO,
} from '#actions/users/dtos/request/user_skill_dtos'
import GetUserSkillsQuery, { GetUserSkillsDTO } from '#actions/users/queries/get_user_skills_query'
import { ProficiencyLevel } from '#constants/user_constants'
import SkillRepository from '#infra/skills/repositories/skill_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { SkillFactory, UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | User Skills', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('add skill command creates a queryable user skill with initial unreviewed stats', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({
      skill_name: 'TypeScript',
      category_code: 'technical',
    })
    const command = new AddUserSkillCommand(ExecutionContext.system(user.id))

    await command.handle(new AddUserSkillDTO(skill.id, ProficiencyLevel.JUNIOR))

    const skills = await new GetUserSkillsQuery(ExecutionContext.system(user.id)).handle(
      new GetUserSkillsDTO(user.id)
    )
    const stored = await SkillRepository.findByUserAndSkill(user.id, skill.id)

    assert.lengthOf(skills, 1)
    assert.equal(skills[0]?.skill_id, skill.id)
    assert.equal(skills[0]?.skill_name, 'TypeScript')
    assert.equal(skills[0]?.category_code, 'technical')
    assert.equal(skills[0]?.level_code, ProficiencyLevel.JUNIOR)
    assert.equal(stored?.hasBeenReviewed, false)
  })

  test('duplicate skill additions and inactive skills are both rejected without creating extra rows', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const activeSkill = await SkillFactory.create()
    const inactiveSkill = await SkillFactory.create({ is_active: false })
    const command = new AddUserSkillCommand(ExecutionContext.system(user.id))
    const query = new GetUserSkillsQuery(ExecutionContext.system(user.id))

    const cachedEmpty = await query.handle(new GetUserSkillsDTO(user.id))
    assert.lengthOf(cachedEmpty, 0)

    await command.handle(new AddUserSkillDTO(activeSkill.id, ProficiencyLevel.MIDDLE))
    await assert.rejects(() =>
      command.handle(new AddUserSkillDTO(activeSkill.id, ProficiencyLevel.SENIOR))
    )
    await assert.rejects(() =>
      command.handle(new AddUserSkillDTO(inactiveSkill.id, ProficiencyLevel.JUNIOR))
    )

    const skills = await query.handle(new GetUserSkillsDTO(user.id))
    assert.lengthOf(skills, 1)
  })

  test('owners can update their skill level while outsiders are blocked and category filters stay precise', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const outsider = await UserFactory.create()
    const technicalSkill = await SkillFactory.create({
      skill_name: 'Architecture',
      category_code: 'technical',
    })
    const softSkill = await SkillFactory.create({
      skill_name: 'Communication',
      category_code: 'soft_skill',
    })
    const addCommand = new AddUserSkillCommand(ExecutionContext.system(user.id))

    await addCommand.handle(new AddUserSkillDTO(technicalSkill.id, ProficiencyLevel.MIDDLE))
    await addCommand.handle(new AddUserSkillDTO(softSkill.id, ProficiencyLevel.JUNIOR))

    const storedTechnicalSkill = await SkillRepository.findByUserAndSkill(
      user.id,
      technicalSkill.id
    )
    if (!storedTechnicalSkill) {
      assert.fail('Expected technical skill to exist after add command')
      return
    }

    const query = new GetUserSkillsQuery(ExecutionContext.system(user.id))
    const cachedTechnicalOnly = await query.handle(new GetUserSkillsDTO(user.id, 'technical'))
    assert.equal(cachedTechnicalOnly[0]?.level_code, ProficiencyLevel.MIDDLE)

    await new UpdateUserSkillCommand(ExecutionContext.system(user.id)).handle(
      new UpdateUserSkillDTO(storedTechnicalSkill.id, ProficiencyLevel.LEAD)
    )
    await assert.rejects(() =>
      new UpdateUserSkillCommand(ExecutionContext.system(outsider.id)).handle(
        new UpdateUserSkillDTO(storedTechnicalSkill.id, ProficiencyLevel.MASTER)
      )
    )

    const technicalOnly = await query.handle(new GetUserSkillsDTO(user.id, 'technical'))

    assert.lengthOf(technicalOnly, 1)
    assert.equal(technicalOnly[0]?.skill_id, technicalSkill.id)
    assert.equal(technicalOnly[0]?.level_code, ProficiencyLevel.LEAD)
  })

  test('remove skill command deletes the owned skill and clears it from follow-up queries', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({
      skill_name: 'Testing',
      category_code: 'technical',
    })

    await new AddUserSkillCommand(ExecutionContext.system(user.id)).handle(
      new AddUserSkillDTO(skill.id, ProficiencyLevel.SENIOR)
    )

    const storedSkill = await SkillRepository.findByUserAndSkill(user.id, skill.id)
    if (!storedSkill) {
      assert.fail('Expected user skill to exist before removal')
      return
    }

    const query = new GetUserSkillsQuery(ExecutionContext.system(user.id))
    const cachedSkills = await query.handle(new GetUserSkillsDTO(user.id))
    assert.lengthOf(cachedSkills, 1)

    await new RemoveUserSkillCommand(ExecutionContext.system(user.id)).handle(
      new RemoveUserSkillDTO(storedSkill.id)
    )

    const skills = await query.handle(new GetUserSkillsDTO(user.id))
    const deletedSkill = await SkillRepository.findByUserAndSkill(user.id, skill.id)

    assert.lengthOf(skills, 0)
    assert.isNull(deletedSkill)
  })
})
