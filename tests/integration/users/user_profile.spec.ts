import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import AddUserSkillCommand from '#actions/users/commands/add_user_skill_command'
import { AddUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'
import GetUserProfileQuery, {
  GetUserProfileDTO,
} from '#actions/users/queries/get_user_profile_query'
import { ProficiencyLevel, SystemRoleName } from '#constants/user_constants'
import UserRepository from '#infra/users/repositories/user_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  SkillFactory,
  UserFactory,
  UserSkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | User Profile', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('profile query returns defaults, current organization, skills, and completeness', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: user.id })
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
    await user.merge({ current_organization_id: organization.id }).save()
    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      level_code: ProficiencyLevel.SENIOR,
    })

    const profile = await new GetUserProfileQuery(ExecutionContext.system(user.id)).handle(
      new GetUserProfileDTO(user.id)
    )
    const [profileSkill] = profile.user.skills
    if (!profileSkill) {
      assert.fail('Expected user profile to include the created skill')
      return
    }

    assert.equal(profile.user.timezone, 'Asia/Ho_Chi_Minh')
    assert.equal(profile.user.language, 'vi')
    assert.isFalse(profile.user.is_freelancer)
    assert.equal(profile.user.current_organization.id, organization.id)
    assert.lengthOf(profile.user.skills, 1)
    assert.equal(profileSkill.skill_id, skill.id)
    assert.equal(profileSkill.level_code, ProficiencyLevel.SENIOR)
    assert.isAbove(profile.completeness, 0)
  })

  test('profile query invalidates cached skill data after user skill mutations', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const organization = await OrganizationFactory.create({ owner_id: user.id })
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
    await user.merge({ current_organization_id: organization.id }).save()

    const query = new GetUserProfileQuery(ExecutionContext.system(user.id))

    const cachedProfile = await query.handle(new GetUserProfileDTO(user.id))
    assert.lengthOf(cachedProfile.user.skills, 0)

    await new AddUserSkillCommand(ExecutionContext.system(user.id)).handle(
      new AddUserSkillDTO(skill.id, ProficiencyLevel.JUNIOR)
    )

    const refreshedProfile = await query.handle(new GetUserProfileDTO(user.id))

    assert.lengthOf(refreshedProfile.user.skills, 1)
    assert.equal(refreshedProfile.user.skills[0]?.skill_id, skill.id)
  })

  test('repository guards reject inactive users from active lookups and soft-deleted users from normal lookups', async ({
    assert,
  }) => {
    const inactiveUser = await UserFactory.create({ status: 'inactive' })
    const deletedUser = await UserFactory.create()
    await deletedUser.merge({ deleted_at: DateTime.now() }).save()

    await assert.rejects(() => UserRepository.findActiveOrFail(inactiveUser.id))
    await assert.rejects(() => UserRepository.findNotDeletedOrFail(deletedUser.id))
  })

  test('system role and freelancer helpers preserve admin and self-service identity checks', async ({
    assert,
  }) => {
    const admin = await UserFactory.create({ system_role: SystemRoleName.SYSTEM_ADMIN })
    const superadmin = await UserFactory.createSuperadmin()
    const freelancer = await UserFactory.createFreelancer()
    const regularUser = await UserFactory.create()

    assert.equal(await UserRepository.getSystemRoleName(admin.id), SystemRoleName.SYSTEM_ADMIN)
    assert.isTrue(await UserRepository.isSystemAdmin(admin.id))
    assert.isTrue(await UserRepository.isSystemAdmin(superadmin.id))
    assert.isFalse(await UserRepository.isSystemAdmin(regularUser.id))
    assert.isTrue(await UserRepository.isFreelancer(freelancer.id))
    assert.isFalse(await UserRepository.isFreelancer(regularUser.id))
  })
})
