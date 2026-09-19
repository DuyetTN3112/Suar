import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { closeProjectSprintReviewForTesting } from '#composition/reviews/testing/review_testing_composition'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import {
  buildTestingBooleanInput,
  buildTestingPeerCountInput,
  buildTestingSeedRequest,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ReviewSessionFactory,
  ReviewSessionReviewerAssignmentFactory,
  SkillFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { seedTaskReviewObservationFlow } from '#tests/helpers/seed_task_review_observation_flow'
import { testId } from '#tests/helpers/test_utils'

export default class TestingReviewSeedController {
  async seedTaskReviewBoardFlow({ request, response }: HttpContext): Promise<void> {
    const { timestamp, seedKey } = buildTestingSeedRequest(request.all(), {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const ownerEmail = `seed-review-owner-${seedKey}@test.com`
    const workerEmail = `seed-review-worker-${seedKey}@test.com`
    const managerEmail = `seed-review-manager-${seedKey}@test.com`
    const peerEmail = `seed-review-peer-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: `Review Demo Org ${seedKey}`, slug: `review-demo-org-${seedKey}` },
      { email: ownerEmail, username: `review_owner_${seedKey.replace(/-/g, '_')}` }
    )
    const worker = await UserFactory.create({
      email: workerEmail,
      username: `review_worker_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    const manager = await UserFactory.create({
      email: managerEmail,
      username: `review_manager_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    const peer = await UserFactory.create({
      email: peerEmail,
      username: `review_peer_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })

    for (const user of [worker, manager, peer]) {
      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: user.id,
        org_role: 'org_member',
        status: 'approved',
      })
    }

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: `Review Board Project ${seedKey}`,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: worker.id,
      project_role: 'project_member',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: peer.id,
      project_role: 'project_member',
    })

    const workerTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      project_id: project.id,
      status: 'done',
      title: 'Review checkout evidence package',
      description: 'Task done by worker. Manager and peer must review before profile update.',
    })
    const workerAssignment = await TaskAssignmentFactory.create({
      task_id: workerTask.id,
      assignee_id: worker.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      assignment_type: 'member',
    })

    const workerWorkflowId = testId()
    await db.table('task_review_workflows').insert({
      id: workerWorkflowId,
      task_id: workerTask.id,
      task_assignment_id: workerAssignment.id,
      project_id: project.id,
      organization_id: org.id,
      reviewee_id: worker.id,
      status: 'awaiting_review',
      required_review_count: 2,
      completed_review_count: 0,
      created_at: DateTime.utc().toSQL(),
      updated_at: DateTime.utc().toSQL(),
    })
    await db.table('task_review_reviewers').insert([
      {
        id: testId(),
        workflow_id: workerWorkflowId,
        reviewer_id: owner.id,
        reviewer_role: 'task_giver_required',
        is_required: true,
        status: 'pending',
        priority_rank: 1,
        created_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      },
      {
        id: testId(),
        workflow_id: workerWorkflowId,
        reviewer_id: manager.id,
        reviewer_role: 'manager_required',
        is_required: true,
        status: 'pending',
        priority_rank: 2,
        created_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      },
    ])

    const ownerTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      project_id: project.id,
      status: 'done',
      title: 'Owner done task remains visible',
      description: 'Own done task should also appear in review board.',
    })
    await TaskAssignmentFactory.create({
      task_id: ownerTask.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      assignment_type: 'member',
    })

    response.status(201).json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        ownerEmail,
        workerEmail,
        managerEmail,
        peerEmail,
        ownerId: owner.id,
        workerId: worker.id,
        managerId: manager.id,
        peerId: peer.id,
        workerTaskId: workerTask.id,
        ownerTaskId: ownerTask.id,
        timestamp,
      })
    )
  }

  async seedTaskReviewObservationFlow({ request, response }: HttpContext): Promise<void> {
    const { seedKey } = buildTestingSeedRequest(request.all(), {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const fixture = await seedTaskReviewObservationFlow(seedKey)
    response.status(201).json(wrapApiV1Data(fixture))
  }

  async seedSprintReviewGovernanceFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const withForeignSprint = buildTestingBooleanInput(input, 'withForeignSprint', false)
    const taskInSprint = buildTestingBooleanInput(input, 'taskInSprint', false)
    const ownerEmail = `seed-sprint-owner-${seedKey}@test.com`
    const workerEmail = `seed-sprint-worker-${seedKey}@test.com`
    const adminEmail = `seed-sprint-admin-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: `Seed Sprint Org ${seedKey}`, slug: `seed-sprint-org-${seedKey}` },
      { email: ownerEmail, username: `seed_sprint_owner_${seedKey.replace(/-/g, '_')}` }
    )

    const worker = await UserFactory.create({
      email: workerEmail,
      username: `seed_sprint_worker_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    const admin = await UserFactory.createSuperadmin({
      email: adminEmail,
      username: `seed_sprint_admin_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: `Seed Sprint Project ${seedKey}`,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: worker.id,
      project_role: 'project_member',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      project_id: project.id,
      status: 'in_progress',
      title: `Seed Sprint Task ${seedKey}`,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: worker.id,
      assigned_by: owner.id,
      assignment_status: 'active',
      assignment_type: 'member',
    })
    const reviewSession = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: worker.id,
      status: 'completed',
      creator_reviewer_id: owner.id,
      completed_at: DateTime.utc().minus({ days: 1 }),
    })

    const sprintId = testId()
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: `Seed Sprint Review ${seedKey}`,
      goal: 'Stabilize Scrum planning, backlog scope, and review readiness.',
      status: 'active',
      starts_at: DateTime.utc().minus({ days: 14 }).toSQL(),
      ends_at: DateTime.utc().minus({ hours: 1 }).toSQL(),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
      created_at: DateTime.utc().toSQL(),
      updated_at: DateTime.utc().toSQL(),
    })
    if (taskInSprint) {
      await db.from('tasks').where('id', task.id).update({
        project_sprint_id: sprintId,
        updated_at: DateTime.utc().toSQL(),
      })
    }

    let foreignProjectId: string | null = null
    let foreignSprintId: string | null = null
    if (withForeignSprint) {
      const foreignProject = await ProjectFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
        owner_id: owner.id,
        manager_id: owner.id,
        name: `Seed Sprint Foreign Project ${seedKey}`,
      })

      await ProjectMemberFactory.create({
        project_id: foreignProject.id,
        user_id: owner.id,
        project_role: 'project_owner',
      })

      foreignProjectId = foreignProject.id
      foreignSprintId = testId()
      await db.table('project_sprints').insert({
        id: foreignSprintId,
        organization_id: org.id,
        project_id: foreignProject.id,
        name: `Seed Sprint Foreign Review ${seedKey}`,
        goal: 'Foreign sprint should stay isolated from this project board.',
        status: 'active',
        starts_at: DateTime.utc().minus({ days: 7 }).toSQL(),
        ends_at: DateTime.utc().plus({ days: 7 }).toSQL(),
        created_by: owner.id,
        closed_by: null,
        review_opened_at: null,
        review_closed_at: null,
        created_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      })
    }

    const disputeId = testId()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: reviewSession.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: worker.id,
      opened_by: worker.id,
      status: 'admin_reviewing',
      dispute_reason: 'Review missed sprint evidence',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'adjust_score',
      created_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
      updated_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
    })
    await db.table('review_dispute_case_files').insert({
      id: testId(),
      dispute_id: disputeId,
      case_version: 1,
      created_by: admin.id,
      task_snapshot: JSON.stringify({ id: task.id, title: task.title }),
      required_skills_snapshot: JSON.stringify([]),
      acceptance_criteria_snapshot: JSON.stringify({}),
      assignment_snapshot: JSON.stringify({ id: assignment.id }),
      submission_snapshot: JSON.stringify({}),
      review_snapshot: JSON.stringify({ id: reviewSession.id }),
      skill_reviews_snapshot: JSON.stringify([]),
      evidences_snapshot: JSON.stringify([]),
      self_assessment_snapshot: JSON.stringify({}),
      task_comments_snapshot: JSON.stringify([]),
      task_history_snapshot: JSON.stringify([]),
      reviewee_profile_context_snapshot: JSON.stringify({ reviewee_id: worker.id }),
      reviewer_context_snapshot: JSON.stringify({ reviewer_id: owner.id }),
      dispute_claim_snapshot: JSON.stringify({
        requested_outcome: 'adjust_score',
        dispute_reason: 'Review missed sprint evidence',
        dispute_comments: [{ author_context: 'reviewee', body: 'Please re-check evidence.' }],
      }),
      completeness_score: 62,
      missing_data: JSON.stringify([
        { key: 'counterparty_dispute_message' },
        { key: 'submission_snapshot' },
      ]),
      created_at: DateTime.utc().minus({ hours: 1 }).toSQL(),
    })

    response.json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        sprintId,
        foreignProjectId,
        foreignSprintId,
        taskId: task.id,
        disputeId,
        ownerEmail,
        workerEmail,
        adminEmail,
        ownerId: owner.id,
        workerId: worker.id,
        adminId: admin.id,
        timestamp,
      })
    )
  }

  async seedSprintReverseReviewBoardFlow({ request, response }: HttpContext): Promise<void> {
    const { timestamp, seedKey } = buildTestingSeedRequest(request.all(), {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const ownerEmail = `seed-sprint-reverse-owner-${seedKey}@test.com`
    const workerEmail = `seed-sprint-reverse-worker-${seedKey}@test.com`
    const assignerEmail = `seed-sprint-reverse-assigner-${seedKey}@test.com`
    const secondWorkerEmail = `seed-sprint-reverse-second-${seedKey}@test.com`

    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: `Sprint Reverse Org ${seedKey}`, slug: `sprint-reverse-org-${seedKey}` },
      {
        email: ownerEmail,
        username: `sprint_reverse_owner_${seedKey.replace(/-/g, '_')}`,
      }
    )
    const worker = await UserFactory.create({
      email: workerEmail,
      username: `sprint_reverse_worker_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    const assigner = await UserFactory.create({
      email: assignerEmail,
      username: `sprint_reverse_assigner_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    const secondWorker = await UserFactory.create({
      email: secondWorkerEmail,
      username: `sprint_reverse_second_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })

    for (const user of [worker, assigner, secondWorker]) {
      await OrganizationUserFactory.create({
        organization_id: org.id,
        user_id: user.id,
        org_role: 'org_member',
        status: 'approved',
      })
    }

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: `Sprint Reverse Project ${seedKey}`,
    })
    for (const [user, role] of [
      [owner, 'project_owner'],
      [worker, 'project_member'],
      [assigner, 'project_manager'],
      [secondWorker, 'project_member'],
    ] as const) {
      await ProjectMemberFactory.create({
        project_id: project.id,
        user_id: user.id,
        project_role: role,
      })
    }

    const sprintId = testId()
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: `Sprint Reverse Review ${seedKey}`,
      status: 'active',
      starts_at: DateTime.utc().minus({ days: 14 }).toSQL(),
      ends_at: DateTime.utc().minus({ hours: 1 }).toSQL(),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
      created_at: DateTime.utc().toSQL(),
      updated_at: DateTime.utc().toSQL(),
    })

    const taskA = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprintId,
      creator_id: assigner.id,
      assigned_to: worker.id,
      status: 'done',
      title: 'Clarify onboarding checklist',
    })
    const taskB = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprintId,
      creator_id: assigner.id,
      assigned_to: worker.id,
      status: 'done',
      title: 'Prepare sprint demo notes',
    })
    const secondTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprintId,
      creator_id: owner.id,
      assigned_to: secondWorker.id,
      status: 'done',
      title: 'Second worker eligibility task',
    })

    for (const task of [taskA, taskB]) {
      await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: worker.id,
        assigned_by: assigner.id,
        assignment_status: 'completed',
        assignment_type: 'member',
      })
    }
    await TaskAssignmentFactory.create({
      task_id: secondTask.id,
      assignee_id: secondWorker.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      assignment_type: 'member',
    })

    for (const [task, revieweeId] of [
      [taskA, worker.id],
      [taskB, worker.id],
      [secondTask, secondWorker.id],
    ] as const) {
      await db.table('task_review_workflows').insert({
        id: testId(),
        task_id: task.id,
        project_id: project.id,
        organization_id: org.id,
        reviewee_id: revieweeId,
        status: 'done',
        required_review_count: 2,
        completed_review_count: 2,
        completed_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
        created_at: DateTime.utc().minus({ hours: 3 }).toSQL(),
        updated_at: DateTime.utc().minus({ hours: 2 }).toSQL(),
      })
    }

    const closeResult = await closeProjectSprintReviewForTesting(
      { sprint_id: sprintId },
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '127.0.0.1',
        userAgent: 'playwright-e2e',
      }
    )

    const workerWorkflows = await db
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprintId)
      .where('reviewer_id', worker.id)
      .select('id', 'target_type', 'target_user_id', 'target_entity_id', 'responder_id')

    response.status(201).json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        sprintId,
        nextSprintId: closeResult.next_sprint_id,
        ownerEmail,
        workerEmail,
        assignerEmail,
        secondWorkerEmail,
        ownerId: owner.id,
        workerId: worker.id,
        assignerId: assigner.id,
        taskIds: [taskA.id, taskB.id],
        workflows: workerWorkflows,
        timestamp,
      })
    )
  }

  async seedReviewLifecycleFlow({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const { timestamp, nonce, seedKey } = buildTestingSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const peerCount = buildTestingPeerCountInput(input)
    const demoNames = buildTestingBooleanInput(input, 'demoNames', false)
    const ownerEmail = `seed-review-owner-${seedKey}@test.com`
    const revieweeEmail = `seed-reviewee-${seedKey}@test.com`
    const peerEmails = Array.from(
      { length: peerCount },
      (_, index) => `seed-review-peer-${index + 1}-${seedKey}@test.com`
    )

    const { org, owner } = await OrganizationFactory.createWithOwner(
      {
        name: demoNames ? 'Demo Review Org' : `Seed Review Org ${seedKey}`,
        slug: `seed-review-org-${seedKey}`,
      },
      {
        email: ownerEmail,
        username: demoNames
          ? `demo_owner_${nonce}`
          : `seed_review_owner_${seedKey.replace(/-/g, '_')}`,
      }
    )

    const reviewee = await UserFactory.create({
      email: revieweeEmail,
      username: demoNames
        ? `demo_worker_${nonce}`
        : `seed_reviewee_${seedKey.replace(/-/g, '_')}`,
      currentOrganizationId: org.id,
    })
    const peers = await Promise.all(
      peerEmails.map((peerEmail, index) =>
        UserFactory.create({
          email: peerEmail,
          username: demoNames
            ? `demo_peer_${index + 1}_${nonce}`
            : `seed_review_peer_${index + 1}_${seedKey.replace(/-/g, '_')}`,
          currentOrganizationId: org.id,
        })
      )
    )

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewee.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await Promise.all(
      peers.map((peer) =>
        OrganizationUserFactory.create({
          organization_id: org.id,
          user_id: peer.id,
          org_role: 'org_member',
          status: 'approved',
        })
      )
    )

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: demoNames ? 'Release Review Project' : `Seed Review Project ${seedKey}`,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewee.id,
      project_role: 'project_member',
    })
    await Promise.all(
      peers.map((peer) =>
        ProjectMemberFactory.create({
          project_id: project.id,
          user_id: peer.id,
          project_role: 'project_member',
        })
      )
    )

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      project_id: project.id,
      status: 'done',
      title: demoNames ? 'Checkout QA evidence package' : `Seed Review Lifecycle Task ${seedKey}`,
      description: demoNames
        ? 'Worker submitted checkout evidence and is waiting for owner plus peer review.'
        : 'Seeded for E2E review lifecycle flow',
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      assignment_type: 'member',
    })
    const skill = await SkillFactory.create({
      skill_name: demoNames ? 'Evidence Quality' : `Seed Review Skill ${seedKey}`,
      category_code: 'engineering',
    })

    await db.table('task_required_skills').insert({
      id: testId(),
      task_id: task.id,
      skill_id: skill.id,
      project_skill_id: null,
      minimum_level_id: null,
      target_level_id: null,
      assessment_ceiling_level_id: null,
      proficiency_level_id: null,
      required_public_proficiency_code: 'l7',
      is_mandatory: true,
      importance: 'high',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: 'Seeded requirement keeps lifecycle E2E focused on one skill.',
      rubric_version_id: null,
      source_project_professional_role_id: null,
      source_role_skill_id: null,
      created_at: DateTime.utc().toSQL(),
    })

    const reviewSession = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'pending',
      creator_reviewer_id: owner.id,
      required_peer_reviews: peerCount,
      required_total_reviews: peerCount + 1,
      minimum_manager_reviews: 1,
      minimum_peer_reviews: peerCount,
    })
    await ReviewSessionReviewerAssignmentFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: owner.id,
      reviewer_type: 'manager',
      assignment_role: 'creator_required',
      is_required: true,
    })
    await Promise.all(
      peers.map((peer) =>
        ReviewSessionReviewerAssignmentFactory.create({
          review_session_id: reviewSession.id,
          reviewer_id: peer.id,
          reviewer_type: 'peer',
          assignment_role: 'peer_required',
          is_required: true,
        })
      )
    )

    response.status(201).json(
      wrapApiV1Data({
        organizationId: org.id,
        projectId: project.id,
        taskId: task.id,
        assignmentId: assignment.id,
        reviewSessionId: reviewSession.id,
        skillId: skill.id,
        ownerEmail,
        revieweeEmail,
        peerEmail: peerEmails[0],
        peerEmails,
        ownerId: owner.id,
        revieweeId: reviewee.id,
        peerId: peers[0]?.id,
        peerIds: peers.map((peer) => peer.id),
        timestamp,
      })
    )
  }
}
