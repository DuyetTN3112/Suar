import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { searchPublicApi } from '#composition/search/public-api/search_public_api_composition'
import { seedDefaultTaskStatuses } from '#composition/tasks/task-seed/task_seed_composition'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  buildTestingBooleanInput,
  buildTestingOptionalStringInput,
  buildTestingSearchTaskCountInput,
  buildTestingSeedRequest,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import {
  ensureTestingCanonicalProficiencyLevels,
  ensureTestingTaskMetadataTaxonomyRevisions,
} from '#modules/testing/infra/testing_seed_support'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  SkillFactory,
  TaskApplicationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { seedTaskNativeCompletionFlow } from '#tests/helpers/seed_task_native_completion_flow'
import { testId } from '#tests/helpers/test_utils'

export default class TestingTaskSeedController {
  async seedTaskSubmissionFlow({ request, response }: HttpContext): Promise<void> {
    const { timestamp, seedKey } = buildTestingSeedRequest(request.all(), {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const assigneeEmail = `seed-assignee-${seedKey}@test.com`
    const outsiderEmail = `seed-outsider-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: `Seed Task Org ${seedKey}`, slug: `seed-task-org-${seedKey}` },
      { email: assigneeEmail, username: `seed_assignee_${seedKey.replace(/-/g, '_')}` }
    )

    const outsider = await UserFactory.create({
      email: outsiderEmail,
      username: `seed_outsider_${seedKey.replace(/-/g, '_')}`,
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: outsider.id,
      org_role: 'org_member',
      status: 'approved',
    })
    outsider.current_organization_id = org.id
    await outsider.save()

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: `Seed Task Project ${seedKey}`,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: outsider.id,
      project_role: 'project_member',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      project_id: project.id,
      status: 'in_progress',
      title: `Seed Task ${seedKey}`,
      description: 'Seeded for E2E task submission flow',
    })

    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'active',
      assignment_type: 'member',
    })

    response.json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        taskId: task.id,
        taskTitle: task.title,
        assigneeEmail,
        outsiderEmail,
        assigneeId: owner.id,
        timestamp,
      })
    )
  }

  async seedTaskNativeCompletionFlow({ request, response }: HttpContext): Promise<void> {
    const { seedKey } = buildTestingSeedRequest(request.all(), {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const fixture = await seedTaskNativeCompletionFlow(seedKey)
    response.status(201).json(wrapApiV1Data(fixture))
  }

  async seedTaskCreateFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const withSecondProjectTask = buildTestingBooleanInput(input, 'withSecondProjectTask', false)
    const ownerEmail = `seed-task-create-owner-${seedKey}@test.com`
    const assigneeEmail = `seed-task-create-assignee-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: `Seed Task Create Org ${seedKey}`, slug: `seed-task-create-org-${seedKey}` },
      { email: ownerEmail, username: `seed_task_create_owner_${seedKey.replace(/-/g, '_')}` }
    )
    await owner.merge({ current_organization_id: org.id }).save()
    const assignee = await UserFactory.create({
      email: assigneeEmail,
      username: `seed_task_create_assignee_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await db.transaction(async (trx) => {
      await seedDefaultTaskStatuses(org.id, trx)
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: `Seed Task Create Project ${seedKey}`,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: assignee.id,
      project_role: 'project_member',
    })
    const projectTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      project_id: project.id,
      status: 'todo',
      title: `Seed Scope Project A Task ${seedKey}`,
      description: 'Seeded for org-wide task scope E2E',
    })

    let secondProject = null
    let secondProjectTask = null
    if (withSecondProjectTask) {
      secondProject = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        name: `Seed Task Create Second Project ${seedKey}`,
      })
      await ProjectMemberFactory.create({
        project_id: secondProject.id,
        user_id: owner.id,
        project_role: 'project_owner',
      })
      secondProjectTask = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        assigned_to: owner.id,
        project_id: secondProject.id,
        status: 'todo',
        title: `Seed Scope Project B Task ${seedKey}`,
        description: 'Seeded for org-wide task scope E2E',
      })
    }

    const skillInputs = [
      { skill_name: `API design ${seedKey}`, category_code: 'technology' },
      { skill_name: `Seed Engineering ${seedKey}`, category_code: 'engineering' },
      { skill_name: `Seed Soft Skill ${seedKey}`, category_code: 'soft_skill' },
      { skill_name: `Seed Delivery ${seedKey}`, category_code: 'delivery' },
    ]
    const skills = await Promise.all(
      skillInputs.map((skill, index) =>
        SkillFactory.create({
          ...skill,
          sort_order: index + 1,
        })
      )
    )

    const technologySkill = skills[0]
    const rubricVersionId = testId()
    if (technologySkill) {
      await db.table('skill_rubric_versions').insert({
        id: rubricVersionId,
        skill_id: technologySkill.id,
        version: 1,
        status: 'published',
        created_by: owner.id,
        change_summary: 'Seed task authoring rubric',
      })
      await db.table('project_skills').insert({
        id: testId(),
        project_id: project.id,
        skill_id: technologySkill.id,
        display_name_override: null,
        description_override: null,
        rubric_version_id: rubricVersionId,
        is_active: true,
        is_selectable_for_tasks: true,
        is_visible_in_project: true,
        added_by: owner.id,
      })
    }

    response.json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        projectName: project.name,
        projectTaskId: projectTask.id,
        projectTaskTitle: projectTask.title,
        secondProjectId: secondProject?.id ?? null,
        secondProjectName: secondProject?.name ?? null,
        secondProjectTaskId: secondProjectTask?.id ?? null,
        secondProjectTaskTitle: secondProjectTask?.title ?? null,
        ownerEmail,
        assigneeEmail,
        assigneeUsername: assignee.username,
        skills: skills.map((skill) => ({
          id: skill.id,
          name: skill.skill_name,
          categoryCode: skill.category_code,
          ...(skill.id === technologySkill?.id ? { rubricVersionId } : {}),
        })),
        timestamp,
      })
    )
  }

  async seedMarketplaceApplicationFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, nonce, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const withApplication = buildTestingBooleanInput(input, 'withApplication', true)
    const withSecondApplication = buildTestingBooleanInput(input, 'withSecondApplication', false)
    const demoNames = buildTestingBooleanInput(input, 'demoNames', false)
    const searchMarker = buildTestingOptionalStringInput(input, 'searchMarker', {
      maxLength: 128,
    })
    const searchTaskCount = buildTestingSearchTaskCountInput(input)
    const ownerEmail = `seed-market-owner-${seedKey}@test.com`
    const projectManagerEmail = `seed-market-project-manager-${seedKey}@test.com`
    const applicantEmail = `seed-market-applicant-${seedKey}@test.com`
    const secondApplicantEmail = `seed-market-second-applicant-${seedKey}@test.com`
    const sameOrgMemberEmail = `seed-market-member-${seedKey}@test.com`
    const foreignRecruiterEmail = `seed-market-foreign-recruiter-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      {
        name: demoNames ? 'Demo Delivery Org' : `Seed Marketplace Org ${seedKey}`,
        slug: `seed-marketplace-org-${seedKey}`,
      },
      {
        email: ownerEmail,
        username: demoNames
          ? `demo_market_owner_${nonce}`
          : `seed_market_owner_${seedKey.replace(/-/g, '_')}`,
      }
    )

    const applicant = await UserFactory.create({
      email: applicantEmail,
      username: demoNames
        ? `demo_applicant_${nonce}`
        : `seed_market_applicant_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: null,
      is_external_contributor: true,
    })
    const projectManager = await UserFactory.create({
      email: projectManagerEmail,
      username: `seed_market_project_manager_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: null,
    })
    const secondApplicant = await UserFactory.create({
      email: secondApplicantEmail,
      username: `seed_market_second_applicant_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: null,
      is_external_contributor: true,
    })
    const sameOrgMember = await UserFactory.create({
      email: sameOrgMemberEmail,
      username: `seed_market_member_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: sameOrgMember.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const { org: foreignOrg, owner: foreignRecruiter } =
      await OrganizationFactory.createWithOwner(
        {
          name: `Seed Foreign Recruiter Org ${seedKey}`,
          slug: `seed-foreign-recruiter-org-${seedKey}`,
        },
        {
          email: foreignRecruiterEmail,
          username: `seed_market_foreign_recruiter_${seedKey.replace(/-/g, '_')}`,
        }
      )

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: demoNames ? 'Mobile Checkout QA' : `Seed Marketplace Project ${seedKey}`,
      allow_external_contributors: true,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: projectManager.id,
      project_role: 'project_manager',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      task_visibility: 'external',
      assigned_to: null,
      title: demoNames
        ? `Checkout release evidence ${nonce}`
        : `Seed Marketplace Task ${seedKey}`,
      description: demoNames
        ? 'Verify checkout release readiness, collect regression evidence, and surface compliance risks before handoff.'
        : `Seeded for E2E marketplace apply and withdraw flow${searchMarker ? ` ${searchMarker}` : ''}`,
    })
    const hiddenInternalTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      task_visibility: 'internal',
      assigned_to: null,
      title: `Seed Hidden Internal Task ${seedKey}`,
      description: 'Seeded internal task that must stay hidden from marketplace listing',
    })
    const assignedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      task_visibility: 'external',
      assigned_to: owner.id,
      title: `Seed Assigned Marketplace Task ${seedKey}`,
      description: 'Seeded assigned task that must stay hidden from marketplace listing',
    })
    task.merge({
      task_type: 'feature_development',
      acceptance_criteria: demoNames
        ? 'Evidence covers happy path, payment failure, refund edge case, and release risk notes.'
        : task.acceptance_criteria,
      verification_method: 'code_review',
      context_background: demoNames
        ? 'Checkout is entering final QA before release. The team needs concise evidence, not a long handover document.'
        : task.context_background,
      role_in_task: 'sole_contributor',
      business_domain: 'fintech',
      problem_category: 'compliance',
      tech_stack: ['TypeScript', 'Svelte', 'AdonisJS'],
      domain_tags: ['checkout', 'release-readiness', 'qa-evidence'],
    })
    await task.save()
    const searchTaskIds = [task.id]
    for (let index = 1; index < searchTaskCount; index += 1) {
      const searchTask = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        project_id: project.id,
        task_visibility: 'external',
        assigned_to: null,
        title: `Seed Marketplace Search Task ${index} ${seedKey}`,
        description: `Seeded search pagination task ${index}${searchMarker ? ` ${searchMarker}` : ''}`,
      })
      searchTask.merge({
        task_type: 'feature_development',
        verification_method: 'code_review',
        role_in_task: 'sole_contributor',
        business_domain: 'fintech',
        problem_category: 'compliance',
        tech_stack: ['TypeScript', 'Svelte', 'AdonisJS'],
        domain_tags: ['checkout', 'release-readiness', 'qa-evidence'],
      })
      await searchTask.save()
      searchTaskIds.push(searchTask.id)
    }
    const levelsByCode = await ensureTestingCanonicalProficiencyLevels()
    const seededSkills = await Promise.all([
      SkillFactory.create({
        skill_name: demoNames ? 'TypeScript QA Automation' : `Marketplace TypeScript ${seedKey}`,
        skill_code: `marketplace_typescript_${nonce}`,
        category_code: 'technology',
      }),
      SkillFactory.create({
        skill_name: demoNames ? 'API Design' : `Marketplace API Design ${seedKey}`,
        skill_code: `marketplace_api_design_${nonce}`,
        category_code: 'engineering',
      }),
      SkillFactory.create({
        skill_name: demoNames ? 'Release Communication' : `Marketplace Communication ${seedKey}`,
        skill_code: `marketplace_communication_${nonce}`,
        category_code: 'soft_skill',
      }),
      SkillFactory.create({
        skill_name: demoNames ? 'Release Ownership' : `Marketplace Release Ownership ${seedKey}`,
        skill_code: `marketplace_release_ownership_${nonce}`,
        category_code: 'delivery',
      }),
    ])
    const requiredSkillRows = seededSkills.map((skill, index) => {
      const levelCode = index === 0 ? 'l6' : index === 1 ? 'l4' : 'l5'
      return {
        id: testId(),
        task_id: task.id,
        skill_id: skill.id,
        project_skill_id: null,
        minimum_level_id: levelsByCode.get(levelCode) ?? null,
        target_level_id: levelsByCode.get('l7') ?? null,
        assessment_ceiling_level_id: levelsByCode.get('l10') ?? null,
        proficiency_level_id: levelsByCode.get(levelCode) ?? null,
        required_public_proficiency_code: levelCode,
        is_mandatory: true,
        importance: index === 0 ? 'high' : 'medium',
        weight: index === 0 ? 1.25 : 1,
        requirement_source: 'manual',
        requirement_notes: 'Seeded marketplace requirement for reliable profile match scoring.',
        rubric_version_id: null,
        source_project_professional_role_id: null,
        source_role_skill_id: null,
        created_at: DateTime.utc().toSQL(),
      }
    })
    await db.table('task_required_skills').insert(requiredSkillRows)
    await Promise.all(
      [applicant, secondApplicant].flatMap((candidate) =>
        seededSkills.map((skill) =>
          UserSkillFactory.create({
            user_id: candidate.id,
            skill_id: skill.id,
            verified_public_proficiency_code: 'l7',
            source: 'reviewed',
            total_reviews: 2,
            avg_score: 4.2,
            avg_percentage: 84,
          })
        )
      )
    )
    await db.table('user_work_history').insert(
      [applicant, secondApplicant].map((candidate) => ({
        id: testId(),
        user_id: candidate.id,
        task_id: testId(),
        task_assignment_id: testId(),
        organization_id: org.id,
        project_id: project.id,
        task_title: `Seed Marketplace Prior Work ${seedKey}`,
        task_type: 'feature_development',
        business_domain: 'fintech',
        problem_category: 'compliance',
        role_in_task: 'sole_contributor',
        autonomy_level: null,
        collaboration_type: 'solo',
        tech_stack: JSON.stringify(['TypeScript', 'AdonisJS', 'Svelte']),
        domain_tags: JSON.stringify(['fintech', 'application-flow']),
        difficulty: 'medium',
        estimated_hours: 8,
        actual_hours: 7,
        was_on_time: true,
        days_early_or_late: -1,
        measurable_outcomes: JSON.stringify([]),
        estimated_business_value: null,
        knowledge_artifacts: JSON.stringify([]),
        overall_quality_score: 4,
        skill_scores: JSON.stringify([]),
        evidence_links: JSON.stringify([]),
        is_featured: false,
        is_public: true,
        completed_at: DateTime.utc().minus({ days: 14 }).toSQL(),
      }))
    )

    await ensureTestingTaskMetadataTaxonomyRevisions()
    await Promise.all(searchTaskIds.map((taskId) => searchPublicApi.reindexTaskDocument(taskId)))

    const application = withApplication
      ? await TaskApplicationFactory.create({
          task_id: task.id,
          applicant_id: applicant.id,
          application_status: 'pending',
          application_source: 'public_listing',
          message: 'Seeded pending marketplace application',
          portfolio_links: ['https://portfolio.example.com/seeded-work'],
        })
      : null
    const secondApplication =
      withApplication && withSecondApplication
        ? await TaskApplicationFactory.create({
            task_id: task.id,
            applicant_id: secondApplicant.id,
            application_status: 'pending',
            application_source: 'public_listing',
            message: 'Seeded second pending marketplace application',
            portfolio_links: ['https://portfolio.example.com/second-seeded-work'],
          })
        : null

    response.json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        taskId: task.id,
        applicationId: application?.id ?? null,
        secondApplicationId: secondApplication?.id ?? null,
        ownerEmail,
        projectManagerEmail,
        applicantEmail,
        secondApplicantEmail,
        sameOrgMemberEmail,
        foreignRecruiterEmail,
        ownerId: owner.id,
        projectManagerId: projectManager.id,
        applicantId: applicant.id,
        secondApplicantId: secondApplicant.id,
        sameOrgMemberId: sameOrgMember.id,
        foreignOrganizationId: foreignOrg.id,
        foreignRecruiterId: foreignRecruiter.id,
        taskTitle: task.title,
        hiddenInternalTaskTitle: hiddenInternalTask.title,
        assignedTaskTitle: assignedTask.title,
        timestamp,
      })
    )
  }
}
