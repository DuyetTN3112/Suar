import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  SkillFactory,
  UserSkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ProficiencyLevel, getLevelCodeFromPercentage } from '#constants/user_constants'
import SkillRepository from '#repositories/skill_repository'

test.group('Integration | User Skills', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('add skill to user creates user_skill record', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create()

    const userSkill = await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      level_code: ProficiencyLevel.JUNIOR,
    })

    assert.isNotNull(userSkill.id)
    assert.equal(userSkill.user_id, user.id)
    assert.equal(userSkill.skill_id, skill.id)
    assert.equal(userSkill.level_code, ProficiencyLevel.JUNIOR)
  })

  test('findByUserAndSkill returns existing record', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create()

    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      level_code: ProficiencyLevel.SENIOR,
    })

    const found = await SkillRepository.findByUserAndSkill(user.id, skill.id)
    assert.isNotNull(found)
    assert.equal(found!.level_code, ProficiencyLevel.SENIOR)
  })

  test('findByUserAndSkill returns null for non-existent', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create()

    const found = await SkillRepository.findByUserAndSkill(user.id, skill.id)
    assert.isNull(found)
  })

  test('getUserSkillsWithDetails returns all skills for user', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill1 = await SkillFactory.create({ skill_name: 'JavaScript' })
    const skill2 = await SkillFactory.create({ skill_name: 'TypeScript' })

    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill1.id,
      level_code: ProficiencyLevel.MIDDLE,
    })
    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill2.id,
      level_code: ProficiencyLevel.SENIOR,
    })

    const skills = await SkillRepository.getUserSkillsWithDetails(user.id)
    assert.lengthOf(skills, 2)
  })

  test('hasBeenReviewed returns false when total_reviews is 0', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create()

    const userSkill = await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      total_reviews: 0,
    })

    assert.isFalse(userSkill.hasBeenReviewed)
  })

  test('hasBeenReviewed returns true when total_reviews > 0', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create()

    const userSkill = await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      total_reviews: 3,
    })

    assert.isTrue(userSkill.hasBeenReviewed)
  })

  test('getLevelCodeFromPercentage maps correctly', async ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(0), ProficiencyLevel.BEGINNER)
    assert.equal(getLevelCodeFromPercentage(10), ProficiencyLevel.BEGINNER)
    assert.equal(getLevelCodeFromPercentage(15), ProficiencyLevel.ELEMENTARY)
    assert.equal(getLevelCodeFromPercentage(30), ProficiencyLevel.JUNIOR)
    assert.equal(getLevelCodeFromPercentage(45), ProficiencyLevel.MIDDLE)
    assert.equal(getLevelCodeFromPercentage(60), ProficiencyLevel.SENIOR)
    assert.equal(getLevelCodeFromPercentage(75), ProficiencyLevel.PRINCIPAL)
    assert.equal(getLevelCodeFromPercentage(88), ProficiencyLevel.MASTER)
    assert.equal(getLevelCodeFromPercentage(100), ProficiencyLevel.MASTER)
  })

  test('update skill level_code persists', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create()

    const userSkill = await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      level_code: ProficiencyLevel.BEGINNER,
    })

    userSkill.level_code = ProficiencyLevel.LEAD
    await userSkill.save()

    const updated = await SkillRepository.findByUserAndSkill(user.id, skill.id)
    assert.equal(updated!.level_code, ProficiencyLevel.LEAD)
  })
})
