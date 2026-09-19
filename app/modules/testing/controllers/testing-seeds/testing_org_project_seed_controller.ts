import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { searchPublicApi } from '#composition/search/public-api/search_public_api_composition'
import { skillTestingApi } from '#composition/skills/skill-testing/skill_testing_composition'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  buildTestingBooleanInput,
  buildTestingEnumInput,
  buildTestingOptionalStringInput,
  buildTestingSeedRequest,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import { testingSearchRoleplayService } from '#modules/testing/infra/testing_search_roleplay_service'
import {
  ensureTestingCanonicalProficiencyLevels,
  type TestingRoleSkillInput,
} from '#modules/testing/infra/testing_seed_support'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { seedPublicTalentAccomplishment } from '#tests/helpers/seed_public_talent_accomplishment'
import { testId } from '#tests/helpers/test_utils'

export default class TestingOrgProjectSeedController {
  async seedE2e({ request, response, auth }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const availableFrom = buildTestingOptionalStringInput(input, 'availableFrom', {
      maxLength: 64,
    })

    const talent = await UserFactory.create({
      email: `seed-talent-${seedKey}@test.com`,
      username: `seed_talent_${seedKey.replace(/-/g, '_')}`,
    })

    await talent
      .merge({
        bio: 'Seeded talent profile for Playwright recruiter bookmark flows',
        is_external_contributor: true,
        external_contributor_completed_tasks_count: 3,
        profile_settings: {
          is_searchable: true,
          show_contact_info: true,
          show_organizations: true,
          show_projects: true,
          show_spider_chart: true,
          show_technical_skills: true,
          custom_headline: 'Seeded E2E Talent',
          preferred_job_types: ['full_time'],
          preferred_locations: ['remote'],
          min_salary_expectation: null,
          salary_currency: 'USD',
          available_from: availableFrom,
        },
      })
      .save()

    const seededTalentSkills = buildTestingBooleanInput(input, 'multiSkill', false)
      ? await Promise.all([
          SkillFactory.create({
            skill_name: `E2E Multi Skill Alpha ${seedKey}`,
            skill_code: `e2e_multi_skill_alpha_${seedKey}`,
            category_code: 'technology',
          }),
          SkillFactory.create({
            skill_name: `E2E Multi Skill Beta ${seedKey}`,
            skill_code: `e2e_multi_skill_beta_${seedKey}`,
            category_code: 'engineering',
          }),
        ])
      : []

    await Promise.all(
      seededTalentSkills.map((skill) =>
        UserSkillFactory.create({
          user_id: talent.id,
          skill_id: skill.id,
          verified_public_proficiency_code: 'l7',
          source: 'reviewed',
          total_reviews: 2,
          avg_score: 4.2,
          avg_percentage: 84,
        })
      )
    )

    await auth.check()
    const organizationId = auth.user?.current_organization_id ?? null
    if (organizationId) {
      await talent.merge({ current_organization_id: organizationId }).save()
      await OrganizationUserFactory.create({
        organization_id: organizationId,
        user_id: talent.id,
        org_role: 'org_member',
        status: 'approved',
      })
    }

    const publicAccomplishment = buildTestingBooleanInput(input, 'publicAccomplishment', false)
      ? await seedPublicTalentAccomplishment({
          userId: talent.id,
          organizationId,
          seedKey,
        })
      : null

    await testingSearchRoleplayService.prepareTalentSearchIndexForE2e()
    await searchPublicApi.reindexTalentDocument(talent.id)

    if (buildTestingBooleanInput(input, 'seedTalentDiscoveryRoleplay', false)) {
      if (!organizationId) {
        throw ValidationException.fromIssues([
          validationIssue(
            'organizationId',
            'Talent discovery role-play requires an authenticated organization',
            'ORGANIZATION_REQUIRED'
          ),
        ])
      }

      const roleplaySkill = await SkillFactory.create({
        skill_name: `E2E Talent Discovery Skill ${seedKey}`,
        skill_code: `e2e_talent_discovery_skill_${seedKey}`,
        category_code: 'technology',
      })

      const createRoleplayTalent = async (talentInput: {
        label: string
        proficiency: 'l7' | 'l10'
        searchable: boolean
        source: 'reviewed'
      }) => {
        const roleplayTalent = await UserFactory.create({
          email: `seed-talent-discovery-${talentInput.label}-${seedKey}@test.com`,
          username: `seed_talent_discovery_${talentInput.label}_${seedKey.replace(/-/g, '_')}`,
        })

        await roleplayTalent
          .merge({
            bio: `Talent discovery role-play ${talentInput.label}`,
            is_external_contributor: true,
            external_contributor_completed_tasks_count: 3,
            current_organization_id: organizationId,
            profile_settings: {
              is_searchable: talentInput.searchable,
              show_contact_info: true,
              show_organizations: true,
              show_projects: true,
              show_spider_chart: true,
              show_technical_skills: true,
              custom_headline: `Talent discovery ${talentInput.label}`,
              preferred_job_types: ['full_time'],
              preferred_locations: ['remote'],
              min_salary_expectation: null,
              salary_currency: 'USD',
              available_from: '2026-09-15',
            },
          })
          .save()

        await OrganizationUserFactory.create({
          organization_id: organizationId,
          user_id: roleplayTalent.id,
          org_role: 'org_member',
          status: 'approved',
        })
        await UserSkillFactory.create({
          user_id: roleplayTalent.id,
          skill_id: roleplaySkill.id,
          verified_public_proficiency_code: talentInput.proficiency,
          source: talentInput.source,
          total_reviews: 2,
          avg_score: 4.2,
          avg_percentage: 84,
        })

        return roleplayTalent
      }

      const [strongMatchA, strongMatchB, proficiencyDecoy, privateDecoy] = await Promise.all([
        createRoleplayTalent({
          label: 'strong-a',
          proficiency: 'l10',
          searchable: true,
          source: 'reviewed',
        }),
        createRoleplayTalent({
          label: 'strong-b',
          proficiency: 'l10',
          searchable: true,
          source: 'reviewed',
        }),
        createRoleplayTalent({
          label: 'proficiency-decoy',
          proficiency: 'l7',
          searchable: true,
          source: 'reviewed',
        }),
        createRoleplayTalent({
          label: 'private-decoy',
          proficiency: 'l10',
          searchable: false,
          source: 'reviewed',
        }),
      ])

      await Promise.all(
        [strongMatchA, strongMatchB, proficiencyDecoy, privateDecoy].map(({ id }) =>
          searchPublicApi.reindexTalentDocument(id)
        )
      )

      response.json(
        wrapApiV1Data({
          skillId: roleplaySkill.id,
          strongMatchTalentIds: [strongMatchA.id, strongMatchB.id],
          decoyTalentIds: [proficiencyDecoy.id, privateDecoy.id],
          matchingTalentCount: 2,
          excludedTalentCount: 2,
          timestamp,
        })
      )
      return
    }

    response.json(
      wrapApiV1Data({
        talentId: talent.id,
        talentEmail: talent.email,
        publicAccomplishment,
        talentSkillIds: seededTalentSkills.map((skill) => skill.id),
        timestamp,
      })
    )
  }

  async seedProjectMemberFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, nonce, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const demoNames = buildTestingBooleanInput(input, 'demoNames', false)
    const ownerEmail = `seed-owner-${seedKey}@test.com`
    const memberEmail = `seed-member-${seedKey}@test.com`
    const candidateEmail = `seed-candidate-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      {
        name: demoNames ? 'Tổ chức Demo' : `Seed Member Org ${seedKey}`,
        slug: `seed-member-org-${seedKey}`,
      },
      {
        email: ownerEmail,
        username: demoNames ? `demo_owner_${nonce}` : `seed_owner_${seedKey.replace(/-/g, '_')}`,
      }
    )

    const member = await UserFactory.create({
      email: memberEmail,
      username: demoNames ? `demo_member_${nonce}` : `seed_member_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const candidate = await UserFactory.create({
      email: candidateEmail,
      username: demoNames
        ? `demo_candidate_${nonce}`
        : `seed_candidate_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: candidate.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: demoNames ? 'Checkout QA' : `Seed Project ${seedKey}`,
    })

    const projectRole = await skillTestingApi.createCustomProjectRole({
      projectId: project.id,
      code: 'qa_engineer',
      name: 'QA Engineer',
      description: demoNames
        ? 'Checklist, evidence, release.'
        : 'Owns test checklist, evidence, and release confidence.',
      createdBy: owner.id,
    })

    const roleSkillInputs: TestingRoleSkillInput[] = demoNames
      ? [
          {
            skill_name: 'TypeScript QA Automation',
            category_code: 'technology',
            importance: 'high',
          },
          { skill_name: 'QA Strategy', category_code: 'engineering', importance: 'critical' },
          { skill_name: 'Clear Communication', category_code: 'soft_skill', importance: 'high' },
          { skill_name: 'Release Ownership', category_code: 'delivery', importance: 'critical' },
        ]
      : [
          {
            skill_name: `Seed Technology ${seedKey}`,
            category_code: 'technology',
            importance: 'critical',
          },
          {
            skill_name: `Seed Engineering ${seedKey}`,
            category_code: 'engineering',
            importance: 'high',
          },
          {
            skill_name: `Seed Soft Skill ${seedKey}`,
            category_code: 'soft_skill',
            importance: 'high',
          },
          {
            skill_name: `Seed Delivery ${seedKey}`,
            category_code: 'delivery',
            importance: 'critical',
          },
        ]

    const levelsByCode = await ensureTestingCanonicalProficiencyLevels()
    const minimumLevelId = levelsByCode.get('l3') ?? null
    const targetLevelId = levelsByCode.get('l7') ?? null
    const assessmentCeilingLevelId = targetLevelId
    const roleSkills = []
    for (const [index, roleSkillInput] of roleSkillInputs.entries()) {
      const skill = await SkillFactory.create({
        skill_name: roleSkillInput.skill_name,
        category_code: roleSkillInput.category_code,
        sort_order: index + 1,
      })
      const projectSkill = await skillTestingApi.addSkillToProject({
        projectId: project.id,
        skillId: skill.id,
        addedBy: owner.id,
        minimumTaskRequirementLevelId: minimumLevelId,
        maximumTaskRequirementLevelId: targetLevelId,
      })
      await skillTestingApi.addSkillToProjectRole({
        projectProfessionalRoleId: projectRole.id,
        projectSkillId: projectSkill.id,
        minimumLevelId,
        targetLevelId,
        assessmentCeilingLevelId,
        isMandatory: index < 3,
        importance: roleSkillInput.importance,
        weight: index < 3 ? 1 : 0.75,
        sortOrder: index + 1,
        notes: null,
      })
      roleSkills.push(skill)
    }

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: 'project_member',
      project_professional_role_id: projectRole.id,
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      status: 'todo',
      title: demoNames ? 'Verify checkout release' : `Seed Task ${seedKey}`,
    })

    response.status(201).json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        taskId: task.id,
        ownerEmail,
        memberEmail,
        candidateEmail,
        ownerId: owner.id,
        memberId: member.id,
        candidateId: candidate.id,
        skills: roleSkills.map((skill) => ({
          id: skill.id,
          name: skill.skill_name,
          categoryCode: skill.category_code,
        })),
        timestamp,
      })
    )
  }

  async seedOrganizationInvitationFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const withPendingInvitation = buildTestingBooleanInput(input, 'withPendingInvitation', false)
    const withForeignUser = buildTestingBooleanInput(input, 'withForeignUser', false)
    const ownerEmail = `seed-invite-owner-${seedKey}@test.com`
    const inviteeEmail = `seed-invitee-${seedKey}@test.com`
    const foreignUserEmail = `seed-invite-foreign-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: `Seed Invite Org ${seedKey}`, slug: `seed-invite-org-${seedKey}` },
      { email: ownerEmail, username: `seed_invite_owner_${seedKey.replace(/-/g, '_')}` }
    )

    const invitee = await UserFactory.create({
      email: inviteeEmail,
      username: `seed_invitee_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: null,
    })

    if (withPendingInvitation) {
      const inviteeWorkspace = await OrganizationFactory.create({
        name: `Seed Invitee Workspace ${seedKey}`,
        slug: `seed-invitee-workspace-${seedKey}`,
        owner_id: invitee.id,
      })
      await OrganizationUserFactory.create({
        organization_id: inviteeWorkspace.id,
        user_id: invitee.id,
        org_role: 'org_owner',
        status: 'approved',
      })
      invitee.current_organization_id = inviteeWorkspace.id
      await invitee.save()

      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: invitee.id,
        org_role: 'org_member',
        status: 'pending',
        invited_by: owner.id,
      })
    }

    let foreignUser = null
    let foreignWorkspace = null
    if (withForeignUser) {
      foreignUser = await UserFactory.create({
        email: foreignUserEmail,
        username: `seed_invite_foreign_${seedKey.replace(/-/g, '_')}`,
        currentOrganizationId: null,
      })
      foreignWorkspace = await OrganizationFactory.create({
        name: `Seed Invite Foreign Workspace ${seedKey}`,
        slug: `seed-invite-foreign-workspace-${seedKey}`,
        owner_id: foreignUser.id,
      })
      await OrganizationUserFactory.create({
        organization_id: foreignWorkspace.id,
        user_id: foreignUser.id,
        org_role: 'org_owner',
        status: 'approved',
      })
      foreignUser.current_organization_id = foreignWorkspace.id
      await foreignUser.save()
    }

    response.json(
      wrapApiV1Data({
        organizationId: org.id,
        organizationName: org.name,
        ownerEmail,
        inviteeEmail,
        foreignUserEmail: foreignUser?.email ?? null,
        foreignWorkspaceId: foreignWorkspace?.id ?? null,
        ownerId: owner.id,
        inviteeId: invitee.id,
        foreignUserId: foreignUser?.id ?? null,
        timestamp,
      })
    )
  }

  async seedOrganizationJoinRequestFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const withPendingJoinRequest = buildTestingBooleanInput(
      input,
      'withPendingJoinRequest',
      false
    )
    const withPendingAdmin = buildTestingBooleanInput(input, 'withPendingAdmin', false)
    const requesterEmail = `seed-join-requester-${seedKey}@test.com`
    const ownerEmail = `seed-join-owner-${seedKey}@test.com`
    const pendingAdminEmail = `seed-join-pending-admin-${seedKey}@test.com`

    const requester = await UserFactory.create({
      email: requesterEmail,
      username: `seed_join_requester_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: null,
    })

    const requesterWorkspace = await OrganizationFactory.create({
      name: `Seed Join Workspace ${seedKey}`,
      slug: `seed-join-workspace-${seedKey}`,
      owner_id: requester.id,
    })
    await OrganizationUserFactory.create({
      organization_id: requesterWorkspace.id,
      user_id: requester.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    requester.current_organization_id = requesterWorkspace.id
    await requester.save()

    const { org: targetOrg, owner } = await OrganizationFactory.createWithOwner(
      {
        name: `Seed Join Target Org ${seedKey}`,
        slug: `seed-join-target-${seedKey}`,
      },
      {
        email: ownerEmail,
        username: `seed_join_owner_${seedKey.replace(/-/g, '_')}`,
      }
    )

    if (withPendingJoinRequest) {
      await OrganizationUserFactory.create({
        organization_id: targetOrg.id,
        user_id: requester.id,
        org_role: 'org_member',
        status: 'pending',
      })
    }

    let pendingAdmin = null
    if (withPendingAdmin) {
      pendingAdmin = await UserFactory.create({
        email: pendingAdminEmail,
        username: `seed_join_pending_admin_${seedKey.replace(/-/g, '_')}`,
        currentOrganizationId: targetOrg.id,
      })
      await OrganizationUserFactory.create({
        organization_id: targetOrg.id,
        user_id: pendingAdmin.id,
        org_role: 'org_admin',
        status: 'pending',
      })
    }

    response.json(
      wrapApiV1Data({
        requesterEmail,
        requesterWorkspaceId: requesterWorkspace.id,
        requesterId: requester.id,
        targetOrganizationId: targetOrg.id,
        targetOrganizationName: targetOrg.name,
        ownerEmail,
        ownerId: owner.id,
        pendingAdminEmail: pendingAdmin?.email ?? null,
        pendingAdminId: pendingAdmin?.id ?? null,
        timestamp,
      })
    )
  }

  async seedProjectSprintPlanningFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const mode = buildTestingEnumInput(input, 'mode', 'planning', ['planning', 'active'] as const)
    const ownerEmail = `planning-owner-${seedKey}@test.com`
    const workerEmail = `planning-worker-${seedKey}@test.com`
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: `Planning Org ${seedKey}`, slug: `planning-org-${seedKey}` },
      { email: ownerEmail, username: `planning_owner_${seedKey.replace(/-/g, '_')}` }
    )
    const worker = await UserFactory.create({
      email: workerEmail,
      username: `planning_worker_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: `Planning Project ${seedKey}`,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_manager',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: worker.id,
      project_role: 'project_member',
    })

    const currentSprintId = testId()
    const nextSprintId = testId()
    const sprintStatus = mode === 'active' ? 'active' : 'draft'
    await db.table('project_sprints').insert([
      {
        id: currentSprintId,
        organization_id: org.id,
        project_id: project.id,
        name: `Planning Sprint 1 ${seedKey}`,
        goal: 'Plan and deliver the next slice.',
        status: sprintStatus,
        starts_at: DateTime.utc().minus({ days: 2 }).toSQL(),
        ends_at: DateTime.utc().plus({ days: 12 }).toSQL(),
        created_by: owner.id,
        closed_by: null,
        review_opened_at: null,
        review_closed_at: null,
        created_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      },
      {
        id: nextSprintId,
        organization_id: org.id,
        project_id: project.id,
        name: `Planning Sprint 2 ${seedKey}`,
        goal: 'Future carry-over destination.',
        status: 'draft',
        starts_at: DateTime.utc().plus({ days: 14 }).toSQL(),
        ends_at: DateTime.utc().plus({ days: 28 }).toSQL(),
        created_by: owner.id,
        closed_by: null,
        review_opened_at: null,
        review_closed_at: null,
        created_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      },
    ])

    const taskIds: string[] = []
    const statuses =
      mode === 'active'
        ? ['done', 'cancelled', 'in_review', 'in_progress', 'todo']
        : ['todo', 'todo', 'in_progress', 'todo', 'todo']
    for (const [index, status] of statuses.entries()) {
      const task = await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        creator_id: owner.id,
        assigned_to: worker.id,
        title: `Planning Task ${index + 1} ${seedKey}`,
        status,
        project_sprint_id: mode === 'active' && index < 4 ? currentSprintId : null,
      })
      taskIds.push(task.id)
    }
    await db.from('tasks').whereIn('id', taskIds).update({ deleted_at: null })
    await Promise.all(
      taskIds.map((taskId, index) =>
        db
          .from('tasks')
          .where('id', taskId)
          .update({ sort_order: index + 1 })
      )
    )
    response.json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        currentSprintId,
        nextSprintId,
        taskIds,
        ownerEmail,
        workerEmail,
        timestamp,
      })
    )
  }
}
