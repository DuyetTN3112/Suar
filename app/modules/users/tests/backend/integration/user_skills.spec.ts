import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { CanonicalProficiencyLevelCode } from '#modules/skills/constants/proficiency_level_constants'
import SkillRepository from '#modules/skills/infra/repositories/skill_repository'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/support/proficiency_level_catalog'
import AddUserSkillCommand from '#modules/users/actions/commands/add_user_skill_command'
import RemoveUserSkillCommand from '#modules/users/actions/commands/remove_user_skill_command'
import UpdateUserSkillCommand from '#modules/users/actions/commands/update_user_skill_command'
import {
  AddUserSkillDTO,
  RemoveUserSkillDTO,
  UpdateUserSkillDTO,
} from '#modules/users/actions/dtos/request/user_skill_dtos'
import GetUserSkillsQuery, {
  GetUserSkillsDTO,
} from '#modules/users/actions/queries/get_user_skills_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  UserFactory,
  UserSkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

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
      category_code: 'technology',
    })
    const command = new AddUserSkillCommand(makeSystemUserActionContext(user.id))

    await command.handle(new AddUserSkillDTO(skill.id, CanonicalProficiencyLevelCode.L4))

    const skills = await new GetUserSkillsQuery(makeSystemUserActionContext(user.id)).handle(
      new GetUserSkillsDTO(user.id)
    )
    const stored = await SkillRepository.findByUserAndSkill(user.id, skill.id)

    assert.lengthOf(skills, 1)
    assert.equal(skills[0]?.skill_id, skill.id)
    assert.equal(skills[0]?.skill_name, 'TypeScript')
    assert.equal(skills[0]?.category_code, 'technology')
    assert.equal(
      skills[0]?.verified_public_proficiency_code,
      getCanonicalProficiencyLevelValue(CanonicalProficiencyLevelCode.L4)
    )
    assert.equal(stored?.hasBeenReviewed, false)
  })

  test('add skill command creates a custom catalog skill before attaching it to the user', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const command = new AddUserSkillCommand(makeSystemUserActionContext(user.id))

    await command.handle(
      AddUserSkillDTO.fromValidatedPayload({
        custom_skill_name: 'Domain-Driven Design',
        category_code: 'engineering',
        verified_public_proficiency_code: CanonicalProficiencyLevelCode.L7,
      } as never)
    )

    const createdSkill = await db
      .from('skills')
      .where('skill_code', 'domain_driven_design')
      .first()
    const skills = await new GetUserSkillsQuery(makeSystemUserActionContext(user.id)).handle(
      new GetUserSkillsDTO(user.id)
    )

    assert.equal(createdSkill?.category_code, 'engineering')
    assert.equal(createdSkill?.skill_name, 'Domain-Driven Design')
    assert.equal(createdSkill?.is_active, true)
    assert.lengthOf(skills, 1)
    assert.equal(skills[0]?.skill_id, createdSkill?.id)
    assert.equal(skills[0]?.category_code, 'engineering')
    assert.equal(skills[0]?.source, 'imported')
  })

  test('duplicate skill additions and inactive skills are both rejected without creating extra rows', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const activeSkill = await SkillFactory.create()
    const inactiveSkill = await SkillFactory.create({ is_active: false })
    const command = new AddUserSkillCommand(makeSystemUserActionContext(user.id))
    const query = new GetUserSkillsQuery(makeSystemUserActionContext(user.id))

    const cachedEmpty = await query.handle(new GetUserSkillsDTO(user.id))
    assert.lengthOf(cachedEmpty, 0)

    await command.handle(new AddUserSkillDTO(activeSkill.id, CanonicalProficiencyLevelCode.L7))
    await assert.rejects(() =>
      command.handle(new AddUserSkillDTO(activeSkill.id, CanonicalProficiencyLevelCode.L10))
    )
    await assert.rejects(() =>
      command.handle(new AddUserSkillDTO(inactiveSkill.id, CanonicalProficiencyLevelCode.L4))
    )

    const skills = await query.handle(new GetUserSkillsDTO(user.id))
    assert.lengthOf(skills, 1)
  })

  test('legacy proficiency band tokens are rejected at the app-layer boundary', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({
      skill_name: 'Svelte',
      category_code: 'technology',
    })
    const command = new AddUserSkillCommand(makeSystemUserActionContext(user.id))

    await assert.rejects(
      () => command.handle(new AddUserSkillDTO(skill.id, 'junior')),
      /canonical code \(l0-l14\)/
    )

    await command.handle(new AddUserSkillDTO(skill.id, CanonicalProficiencyLevelCode.L7))

    const storedSkill = await SkillRepository.findByUserAndSkill(user.id, skill.id)
    if (!storedSkill) {
      assert.fail('Expected stored skill to exist after canonical add')
      return
    }

    await assert.rejects(
      () =>
        new UpdateUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
          new UpdateUserSkillDTO(storedSkill.id, 'senior')
        ),
      /canonical code \(l0-l14\)/
    )
  })

  test('owners can update their skill level while outsiders are blocked and category filters stay precise', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const outsider = await UserFactory.create()
    const engineeringSkill = await SkillFactory.create({
      skill_name: 'Architecture',
      category_code: 'engineering',
    })
    const softSkill = await SkillFactory.create({
      skill_name: 'Communication',
      category_code: 'soft_skill',
    })
    const addCommand = new AddUserSkillCommand(makeSystemUserActionContext(user.id))

    await addCommand.handle(
      new AddUserSkillDTO(engineeringSkill.id, CanonicalProficiencyLevelCode.L7)
    )
    await addCommand.handle(new AddUserSkillDTO(softSkill.id, CanonicalProficiencyLevelCode.L4))

    const storedEngineeringSkill = await SkillRepository.findByUserAndSkill(
      user.id,
      engineeringSkill.id
    )
    if (!storedEngineeringSkill) {
      assert.fail('Expected engineering skill to exist after add command')
      return
    }

    const query = new GetUserSkillsQuery(makeSystemUserActionContext(user.id))
    const cachedEngineeringOnly = await query.handle(new GetUserSkillsDTO(user.id, 'engineering'))
    assert.equal(
      cachedEngineeringOnly[0]?.verified_public_proficiency_code,
      getCanonicalProficiencyLevelValue(CanonicalProficiencyLevelCode.L7)
    )

    await new UpdateUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
      new UpdateUserSkillDTO(storedEngineeringSkill.id, CanonicalProficiencyLevelCode.L12)
    )
    await assert.rejects(() =>
      new UpdateUserSkillCommand(makeSystemUserActionContext(outsider.id)).handle(
        new UpdateUserSkillDTO(storedEngineeringSkill.id, CanonicalProficiencyLevelCode.L14)
      )
    )

    const engineeringOnly = await query.handle(new GetUserSkillsDTO(user.id, 'engineering'))

    assert.lengthOf(engineeringOnly, 1)
    assert.equal(engineeringOnly[0]?.skill_id, engineeringSkill.id)
    assert.equal(
      engineeringOnly[0]?.verified_public_proficiency_code,
      getCanonicalProficiencyLevelValue(CanonicalProficiencyLevelCode.L12)
    )
  })

  test('remove skill command deletes the owned skill and clears it from follow-up queries', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({
      skill_name: 'Testing',
      category_code: 'engineering',
    })

    await new AddUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
      new AddUserSkillDTO(skill.id, CanonicalProficiencyLevelCode.L10)
    )

    const storedSkill = await SkillRepository.findByUserAndSkill(user.id, skill.id)
    if (!storedSkill) {
      assert.fail('Expected user skill to exist before removal')
      return
    }

    const query = new GetUserSkillsQuery(makeSystemUserActionContext(user.id))
    const cachedSkills = await query.handle(new GetUserSkillsDTO(user.id))
    assert.lengthOf(cachedSkills, 1)

    await new RemoveUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
      new RemoveUserSkillDTO(storedSkill.id)
    )

    const skills = await query.handle(new GetUserSkillsDTO(user.id))
    const deletedSkill = await SkillRepository.findByUserAndSkill(user.id, skill.id)

    assert.lengthOf(skills, 0)
    assert.isNull(deletedSkill)
  })

  test('query returns explainability signals for reviewed skills with active disputes', async ({
    assert,
  }) => {
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create()
    const skill = await SkillFactory.create({
      skill_name: 'System Design',
      category_code: 'engineering',
    })
    const reviewedAt = DateTime.now().minus({ days: 7 })
    const userSkill = await UserSkillFactory.create({
      user_id: reviewee.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l8',
      total_reviews: 2,
      avg_score: 82,
      avg_percentage: 82,
    })

    await db.from('user_skills').where('id', userSkill.id).update({
      source: 'reviewed',
      last_reviewed_at: reviewedAt.toSQL(),
    })

    const reviewSession = await ReviewSessionFactory.create({
      reviewee_id: reviewee.id,
      status: 'completed',
      completed_at: reviewedAt,
    })
    const skillReview = await SkillReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_public_proficiency_code: 'l8',
      comment: 'Evidence supports strong system design ownership',
    })

    await db.from('skill_reviews').where('id', skillReview.id).update({
      confidence: 'high',
      submitted_at: reviewedAt.toSQL(),
    })

    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: reviewSession.id,
      task_assignment_id: reviewSession.task_assignment_id,
      task_id: testId(),
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: 'pending',
      dispute_reason: 'Need more context on system constraints',
      disputed_dimensions: JSON.stringify({ system_design: true }),
      disputed_skill_reviews: JSON.stringify([{ skill_review_id: skillReview.id }]),
      requested_outcome: 'adjust_score',
    })

    const skills = await new GetUserSkillsQuery(makeSystemUserActionContext(reviewee.id)).handle(
      new GetUserSkillsDTO(reviewee.id)
    )

    assert.lengthOf(skills, 1)
    assert.equal(skills[0]?.source, 'reviewed')
    assert.equal(skills[0]?.confidence_signal, 'high')
    assert.equal(skills[0]?.freshness_state, 'fresh')
    assert.equal(skills[0]?.governance_state, 'under_dispute')
  })
})
