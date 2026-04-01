import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { TaskApplicantMatchReaderAdapter } from '#composition/adapters/task_applicant_match_reader_adapter'
import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/access/public_contracts/organization_constants'
import * as membershipMutations from '#modules/organizations/members/infra/repositories/organization_user_repository/write/mutation_queries'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_level_catalog'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskRequirementRepository } from '#modules/tasks/infra/repositories/task_requirement_repository'
import UserWorkHistory from '#modules/users/infra/models/user_work_history'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  SkillFactory,
  TaskFactory,
  TaskApplicationFactory,
  UserSkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

function makeTaskActionContext(userId: string, organizationId: string): TaskActionContext {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'japa',
  }
}
const taskApplicantMatches = new TaskApplicantMatchReaderAdapter()

test.group('Integration | Task Worker Management', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('ranking query returns fit_label for each candidate', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, project_id: project.id, task_visibility: 'external' })
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
    const applicant = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: applicant.id, org_role: OrganizationRole.MEMBER, status: OrganizationUserStatus.APPROVED })
    await TaskApplicationFactory.create({ task_id: task.id, applicant_id: applicant.id, application_status: 'pending' })
    await TaskRequirementRepository.createMany([
      {
        task_id: task.id,
        skill_id: skill.id,
        required_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
        is_mandatory: true,
        weight: 1,
        importance: 'critical',
      },
    ])
    await UserSkillFactory.create({
      user_id: applicant.id,
      skill_id: skill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
    })
    await db.from('user_skills').where('user_id', applicant.id).where('skill_id', skill.id).update({
      source: 'reviewed',
    })
    await UserWorkHistory.create({
      id: testId(),
      user_id: applicant.id,
      task_id: task.id,
      task_assignment_id: testId(),
      organization_id: org.id,
      project_id: project.id,
      task_title: task.title,
      task_type: task.task_type,
      business_domain: task.business_domain,
      problem_category: task.problem_category,
      role_in_task: 'lead',
      autonomy_level: 'autonomous',
      collaboration_type: 'solo',
      tech_stack: ['ts'],
      domain_tags: ['platform'],
      difficulty: 'medium',
      estimated_hours: 8,
      actual_hours: 7,
      was_on_time: true,
      days_early_or_late: -1,
      measurable_outcomes: [],
      estimated_business_value: 'medium',
      knowledge_artifacts: [],
      overall_quality_score: 4,
      skill_scores: [
        {
          skill_name: skill.skill_name,
          assigned_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
        },
      ],
      evidence_links: [],
      is_featured: false,
      is_public: true,
      completed_at: DateTime.now(),
    })

    const { default: GetTaskApplicationsRankingQuery } = await import('#modules/tasks/actions/queries/get_task_applications_ranking_query')
    const query = new GetTaskApplicationsRankingQuery(
      makeTaskActionContext(owner.id, org.id),
      taskExternalDeps.user,
      taskExternalDeps.permission,
      taskApplicantMatches
    )
    const rankings = await query.handle({ task_id: task.id })

    assert.isTrue(rankings.length > 0)
    assert.isAbove(rankings[0]?.match_score ?? 0, 0)
    assert.isAtLeast(rankings[0]?.explanations.length ?? 0, 1)
    assert.isEmpty(rankings[0]?.risks ?? [])
    for (const r of rankings) {
      assert.property(r, 'fit_label')
      assert.isTrue(['strong_match', 'good_match', 'partial_match', 'weak_match'].includes(r.fit_label))
    }
  })

  test('ranking classifies project_member source correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, project_id: project.id, task_visibility: 'external' })

    const pm = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: pm.id, org_role: OrganizationRole.MEMBER, status: OrganizationUserStatus.APPROVED })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: pm.id, project_role: ProjectRole.MEMBER })
    const app1 = await TaskApplicationFactory.create({ task_id: task.id, applicant_id: pm.id, application_status: 'pending' })

    const { default: GetTaskApplicationsRankingQuery } = await import('#modules/tasks/actions/queries/get_task_applications_ranking_query')
    const query = new GetTaskApplicationsRankingQuery(
      makeTaskActionContext(owner.id, org.id),
      taskExternalDeps.user,
      taskExternalDeps.permission,
      taskApplicantMatches
    )
    const rankings = await query.handle({ task_id: task.id })

    const pmRanking = rankings.find((r) => r.application_id === app1.id)
    assert.exists(pmRanking)
    assert.equal(pmRanking?.candidate_source, 'project_member')
  })

  test('ranking classifies org_member source correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id })
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, project_id: project.id, task_visibility: 'external' })

    const orgMember = await UserFactory.create()
    await membershipMutations.addMember({ organization_id: org.id, user_id: orgMember.id, org_role: OrganizationRole.MEMBER, status: OrganizationUserStatus.APPROVED })
    const app1 = await TaskApplicationFactory.create({ task_id: task.id, applicant_id: orgMember.id, application_status: 'pending' })

    const { default: GetTaskApplicationsRankingQuery } = await import('#modules/tasks/actions/queries/get_task_applications_ranking_query')
    const query = new GetTaskApplicationsRankingQuery(
      makeTaskActionContext(owner.id, org.id),
      taskExternalDeps.user,
      taskExternalDeps.permission,
      taskApplicantMatches
    )
    const rankings = await query.handle({ task_id: task.id })

    const orgRanking = rankings.find((r) => r.application_id === app1.id)
    assert.exists(orgRanking)
    assert.equal(orgRanking?.candidate_source, 'org_member')
  })

  test('project manager can process application without being task creator', async ({ assert }) => {
    const { canProcessApplication } = await import('#modules/tasks/domain/task_assignment_rules')

    const result = canProcessApplication({
      actorId: 'manager-id',
      taskCreatorId: 'creator-id',
      action: 'approve',
      isTaskAlreadyAssigned: false,
      isProjectOwnerOrManager: true,
    })
    assert.isTrue(result.allowed)

    const denyResult = canProcessApplication({
      actorId: 'random-id',
      taskCreatorId: 'creator-id',
      action: 'approve',
      isTaskAlreadyAssigned: false,
      isProjectOwnerOrManager: false,
    })
    assert.isFalse(denyResult.allowed)
  })

  test('approve rejected when task already assigned', async ({ assert }) => {
    const { canProcessApplication } = await import('#modules/tasks/domain/task_assignment_rules')

    const result = canProcessApplication({
      actorId: 'creator-id',
      taskCreatorId: 'creator-id',
      action: 'approve',
      isTaskAlreadyAssigned: true,
    })
    assert.isFalse(result.allowed)
  })

  test('reject action allowed even when task already assigned', async ({ assert }) => {
    const { canProcessApplication } = await import('#modules/tasks/domain/task_assignment_rules')

    const result = canProcessApplication({
      actorId: 'creator-id',
      taskCreatorId: 'creator-id',
      action: 'reject',
      isTaskAlreadyAssigned: true,
    })
    assert.isTrue(result.allowed)
  })
})
