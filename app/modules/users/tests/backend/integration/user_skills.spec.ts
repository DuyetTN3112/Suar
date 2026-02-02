import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  makeAddUserSkillCommand,
  makeGetUserSkillsQuery,
  makeRemoveUserSkillCommand,
  makeUpdateUserSkillCommand,
} from '#composition/user_action_factory'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import Skill from '#modules/skills/infra/models/skill'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_level_catalog'
import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/proficiency_level_constants'
import {
  AddUserSkillDTO,
  RemoveUserSkillDTO,
  UpdateUserSkillDTO,
} from '#modules/users/actions/dtos/request/user_skill_dtos'
import { GetUserSkillsDTO } from '#modules/users/actions/queries/get_user_skills_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import UserSkillRepository from '#modules/users/infra/repositories/user_skill_repository'
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

async function insertSkillEvidenceHistory(input: {
  userId: string
  skillId: string
  taskTitle: string
  isPublic: boolean
  completedAt: DateTime
}): Promise<void> {
  await db.table('user_work_history').insert({
    id: testId(),
    user_id: input.userId,
    task_id: testId(),
    task_assignment_id: testId(),
    organization_id: null,
    project_id: null,
    task_title: input.taskTitle,
    task_type: 'skill_evidence',
    business_domain: null,
    problem_category: null,
    role_in_task: null,
    autonomy_level: null,
    collaboration_type: null,
    tech_stack: JSON.stringify([]),
    domain_tags: JSON.stringify([]),
    difficulty: null,
    estimated_hours: null,
    actual_hours: null,
    was_on_time: null,
    days_early_or_late: null,
    measurable_outcomes: JSON.stringify([]),
    estimated_business_value: null,
    knowledge_artifacts: JSON.stringify([]),
    overall_quality_score: 4,
    skill_scores: JSON.stringify([
      {
        skill_id: input.skillId,
        assigned_public_proficiency_code: CanonicalProficiencyLevelCode.L7,
        reviewer_type: 'manager',
        comment: `${input.taskTitle} assessment`,
      },
    ]),
    evidence_links: JSON.stringify([
      {
        evidence_id: testId(),
        evidence_type: 'document_link',
        url: `https://example.com/${input.taskTitle.replaceAll(' ', '-').toLowerCase()}`,
        title: `${input.taskTitle} evidence`,
      },
    ]),
    is_featured: false,
    is_public: input.isPublic,
    completed_at: input.completedAt.toSQL(),
  })
}

async function seedSkillEvidencePrivacySubject(label: string) {
  const user = await UserFactory.create()
  const skill = await SkillFactory.create({
    skill_name: `${label} Skill`,
    category_code: 'engineering',
  })
  await UserSkillFactory.create({
    user_id: user.id,
    skill_id: skill.id,
    verified_public_proficiency_code: CanonicalProficiencyLevelCode.L7,
  })
  await insertSkillEvidenceHistory({
    userId: user.id,
    skillId: skill.id,
    taskTitle: `${label} Public`,
    isPublic: true,
    completedAt: DateTime.now().minus({ days: 2 }),
  })
  await insertSkillEvidenceHistory({
    userId: user.id,
    skillId: skill.id,
    taskTitle: `${label} Private`,
    isPublic: false,
    completedAt: DateTime.now().minus({ days: 1 }),
  })

  return { user, skill }
}

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
    const command = makeAddUserSkillCommand(makeSystemUserActionContext(user.id))

    await command.handle(new AddUserSkillDTO(skill.id, CanonicalProficiencyLevelCode.L4))

    const skills = await makeGetUserSkillsQuery(makeSystemUserActionContext(user.id)).handle(
      new GetUserSkillsDTO(user.id)
    )
    const stored = await UserSkillRepository.findByUserAndSkill(user.id, skill.id)

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

  test('add skill rolls back when its critical transactional audit write fails', async ({
    assert,
    cleanup,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({
      skill_name: 'Audit Atomicity',
      category_code: 'engineering',
    })
    const originalAuditWrite = auditPublicApi.write.bind(auditPublicApi)
    auditPublicApi.write = () =>
      Promise.reject(new TypeError('simulated audit persistence failure'))
    cleanup(() => {
      auditPublicApi.write = originalAuditWrite
    })

    await assert.rejects(
      () =>
        makeAddUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
          new AddUserSkillDTO(skill.id, CanonicalProficiencyLevelCode.L4)
        ),
      /simulated audit persistence failure/
    )

    const persisted = await UserSkillRepository.findByUserAndSkill(user.id, skill.id)
    assert.isNull(persisted)
  })

  test('add skill command creates a custom catalog skill before attaching it to the user', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const command = makeAddUserSkillCommand(makeSystemUserActionContext(user.id))

    await command.handle(
      AddUserSkillDTO.fromValidatedPayload({
        custom_skill_name: 'Domain-Driven Design',
        category_code: 'engineering',
        verified_public_proficiency_code: CanonicalProficiencyLevelCode.L7,
      })
    )

    const createdSkill = await Skill.findBy('skill_code', 'domain_driven_design')
    const skills = await makeGetUserSkillsQuery(makeSystemUserActionContext(user.id)).handle(
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

  test('add skill command reactivates the canonical catalog entry for a custom skill', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const inactiveSkill = await SkillFactory.create({
      skill_code: 'domain_driven_design',
      skill_name: 'Deprecated DDD',
      category_code: 'technology',
      display_type: 'list',
      description: 'Deprecated DDD - user-declared profile skill',
      is_active: false,
      sort_order: 73,
    })
    const command = makeAddUserSkillCommand(makeSystemUserActionContext(user.id))

    await command.handle(
      AddUserSkillDTO.fromValidatedPayload({
        custom_skill_name: '  Domain-Driven   Design  ',
        category_code: 'engineering',
        verified_public_proficiency_code: CanonicalProficiencyLevelCode.L7,
      })
    )

    const catalogRows = await Skill.query()
      .where('skill_code', 'domain_driven_design')
      .select([
        'id',
        'skill_name',
        'category_code',
        'display_type',
        'description',
        'is_active',
        'sort_order',
      ])
    const attached = await UserSkillRepository.findByUserAndSkill(user.id, inactiveSkill.id)

    assert.lengthOf(catalogRows, 1)
    assert.equal(catalogRows[0]?.id, inactiveSkill.id)
    assert.equal(catalogRows[0]?.skill_name, 'Domain-Driven Design')
    assert.equal(catalogRows[0]?.category_code, 'engineering')
    assert.equal(catalogRows[0]?.display_type, 'spider_chart')
    assert.equal(catalogRows[0]?.description, 'Deprecated DDD - user-declared profile skill')
    assert.equal(catalogRows[0]?.is_active, true)
    assert.equal(catalogRows[0]?.sort_order, 73)
    assert.equal(attached?.skill_id, inactiveSkill.id)
  })

  test('custom skill resolution reuses an active canonical entry without mutating it', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const canonicalSkill = await SkillFactory.create({
      skill_code: 'domain_driven_design',
      skill_name: 'Canonical DDD',
      category_code: 'technology',
      display_type: 'list',
      description: 'Platform-governed catalog entry',
      is_active: true,
      sort_order: 41,
    })

    await makeAddUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
      AddUserSkillDTO.fromValidatedPayload({
        custom_skill_name: 'Domain-Driven Design',
        category_code: 'engineering',
        verified_public_proficiency_code: CanonicalProficiencyLevelCode.L7,
      })
    )

    await canonicalSkill.refresh()
    const attached = await UserSkillRepository.findByUserAndSkill(user.id, canonicalSkill.id)

    assert.equal(canonicalSkill.skill_name, 'Canonical DDD')
    assert.equal(canonicalSkill.category_code, 'technology')
    assert.equal(canonicalSkill.display_type, 'list')
    assert.equal(canonicalSkill.description, 'Platform-governed catalog entry')
    assert.equal(canonicalSkill.sort_order, 41)
    assert.equal(attached?.skill_id, canonicalSkill.id)
  })

  test('custom skill resolution does not reactivate an inactive canonical entry', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const canonicalSkill = await SkillFactory.create({
      skill_code: 'domain_driven_design',
      skill_name: 'Canonical DDD',
      category_code: 'technology',
      description: 'Platform-governed catalog entry',
      is_active: false,
    })

    await assert.rejects(() =>
      makeAddUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
        AddUserSkillDTO.fromValidatedPayload({
          custom_skill_name: 'Domain-Driven Design',
          category_code: 'engineering',
          verified_public_proficiency_code: CanonicalProficiencyLevelCode.L7,
        })
      )
    )

    await canonicalSkill.refresh()
    const attached = await UserSkillRepository.findByUserAndSkill(user.id, canonicalSkill.id)

    assert.isFalse(canonicalSkill.is_active)
    assert.equal(canonicalSkill.skill_name, 'Canonical DDD')
    assert.equal(canonicalSkill.category_code, 'technology')
    assert.isNull(attached)
  })

  test('duplicate skill additions and inactive skills are both rejected without creating extra rows', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const activeSkill = await SkillFactory.create()
    const inactiveSkill = await SkillFactory.create({ is_active: false })
    const command = makeAddUserSkillCommand(makeSystemUserActionContext(user.id))
    const query = makeGetUserSkillsQuery(makeSystemUserActionContext(user.id))

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
    const command = makeAddUserSkillCommand(makeSystemUserActionContext(user.id))

    await assert.rejects(
      () => command.handle(new AddUserSkillDTO(skill.id, 'junior')),
      /canonical code \(l0-l14\)/
    )

    await command.handle(new AddUserSkillDTO(skill.id, CanonicalProficiencyLevelCode.L7))

    const storedSkill = await UserSkillRepository.findByUserAndSkill(user.id, skill.id)
    if (!storedSkill) {
      assert.fail('Expected stored skill to exist after canonical add')
      return
    }

    await assert.rejects(
      () =>
        makeUpdateUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
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
    const addCommand = makeAddUserSkillCommand(makeSystemUserActionContext(user.id))

    await addCommand.handle(
      new AddUserSkillDTO(engineeringSkill.id, CanonicalProficiencyLevelCode.L7)
    )
    await addCommand.handle(new AddUserSkillDTO(softSkill.id, CanonicalProficiencyLevelCode.L4))

    const storedEngineeringSkill = await UserSkillRepository.findByUserAndSkill(
      user.id,
      engineeringSkill.id
    )
    if (!storedEngineeringSkill) {
      assert.fail('Expected engineering skill to exist after add command')
      return
    }

    const query = makeGetUserSkillsQuery(makeSystemUserActionContext(user.id))
    const cachedEngineeringOnly = await query.handle(new GetUserSkillsDTO(user.id, 'engineering'))
    assert.equal(
      cachedEngineeringOnly[0]?.verified_public_proficiency_code,
      getCanonicalProficiencyLevelValue(CanonicalProficiencyLevelCode.L7)
    )

    await makeUpdateUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
      new UpdateUserSkillDTO(storedEngineeringSkill.id, CanonicalProficiencyLevelCode.L12)
    )
    await assert.rejects(() =>
      makeUpdateUserSkillCommand(makeSystemUserActionContext(outsider.id)).handle(
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
  }).timeout(10_000)

  test('remove skill command deletes the owned skill and clears it from follow-up queries', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({
      skill_name: 'Testing',
      category_code: 'engineering',
    })

    await makeAddUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
      new AddUserSkillDTO(skill.id, CanonicalProficiencyLevelCode.L10)
    )

    const storedSkill = await UserSkillRepository.findByUserAndSkill(user.id, skill.id)
    if (!storedSkill) {
      assert.fail('Expected user skill to exist before removal')
      return
    }

    const query = makeGetUserSkillsQuery(makeSystemUserActionContext(user.id))
    const cachedSkills = await query.handle(new GetUserSkillsDTO(user.id))
    assert.lengthOf(cachedSkills, 1)

    await makeRemoveUserSkillCommand(makeSystemUserActionContext(user.id)).handle(
      new RemoveUserSkillDTO(storedSkill.id)
    )

    const skills = await query.handle(new GetUserSkillsDTO(user.id))
    const deletedSkill = await UserSkillRepository.findByUserAndSkill(user.id, skill.id)

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

    const skills = await makeGetUserSkillsQuery(
      makeSystemUserActionContext(reviewee.id)
    ).handle(
      new GetUserSkillsDTO(reviewee.id)
    )

    assert.lengthOf(skills, 1)
    assert.equal(skills[0]?.source, 'reviewed')
    assert.equal(skills[0]?.confidence_signal, 'high')
    assert.equal(skills[0]?.freshness_state, 'fresh')
    assert.equal(skills[0]?.governance_state, 'under_dispute')
  })

  test('isolates skill evidence by viewer scope in both request orders', async ({
    assert,
  }) => {
    const viewer = await UserFactory.create()
    const selfFirst = await seedSkillEvidencePrivacySubject('Self First')
    const publicFirst = await seedSkillEvidencePrivacySubject('Public First')

    const selfFirstOwnerResult = await makeGetUserSkillsQuery(
      makeSystemUserActionContext(selfFirst.user.id)
    ).handle(new GetUserSkillsDTO(selfFirst.user.id))
    const selfFirstPublicResult = await makeGetUserSkillsQuery(
      makeSystemUserActionContext(viewer.id)
    ).handle(new GetUserSkillsDTO(selfFirst.user.id))

    assert.equal(selfFirstOwnerResult[0]?.skill_id, selfFirst.skill.id)
    assert.equal(selfFirstOwnerResult[0]?.evidence_count, 2)
    assert.deepEqual(
      selfFirstOwnerResult[0]?.evidence_history.map((entry) => entry.task_title),
      ['Self First Private', 'Self First Public']
    )
    assert.equal(selfFirstPublicResult[0]?.evidence_count, 1)
    assert.deepEqual(
      selfFirstPublicResult[0]?.evidence_history.map((entry) => entry.task_title),
      ['Self First Public']
    )

    const publicFirstPublicResult = await makeGetUserSkillsQuery(
      makeSystemUserActionContext(viewer.id)
    ).handle(new GetUserSkillsDTO(publicFirst.user.id))
    const publicFirstOwnerResult = await makeGetUserSkillsQuery(
      makeSystemUserActionContext(publicFirst.user.id)
    ).handle(new GetUserSkillsDTO(publicFirst.user.id))

    assert.equal(publicFirstPublicResult[0]?.skill_id, publicFirst.skill.id)
    assert.equal(publicFirstPublicResult[0]?.evidence_count, 1)
    assert.deepEqual(
      publicFirstPublicResult[0]?.evidence_history.map((entry) => entry.task_title),
      ['Public First Public']
    )
    assert.equal(publicFirstOwnerResult[0]?.evidence_count, 2)
    assert.deepEqual(
      publicFirstOwnerResult[0]?.evidence_history.map((entry) => entry.task_title),
      ['Public First Private', 'Public First Public']
    )
  })
})
