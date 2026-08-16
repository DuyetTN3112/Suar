import { test } from '@japa/runner'

import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import {
  mapApplyForTaskApiBody,
  mapApplicationMatchScoreApiBody,
  mapTaskApplicationsRankingApiBody,
  mapMyApplicationsPageProps,
  mapTaskApplicationsPageProps,
} from '#modules/tasks/controllers/mappers/response/task-applications/task_application_response_mapper'
import {
  mapPublicTaskCollectionResponse,
  mapPublicTasksApiBody,
  mapPublicTasksPageProps,
} from '#modules/tasks/controllers/mappers/response/task-reading/public_task_response_mapper'
import {
  mapTaskCreateApiBody,
  mapTaskDetailApiBody,
  mapTaskDetailPageProps,
  mapScopedTaskDetailPageProps,
  mapTaskEditPageProps,
  mapTaskSortOrderApiBody,
  mapTaskStatusApiBody,
  mapTaskUpdateApiBody,
} from '#modules/tasks/controllers/mappers/response/task-reading/task_response_mapper'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}


test.group('', () => {
  test('public task mapper serializes Lucid-like objects and preserves cached plain objects', ({
    assert,
  }) => {
    const data = mapPublicTaskCollectionResponse([
      serializable({ id: 'task-1', title: 'Serializable task' }),
      { id: 'task-2', title: 'Cached task' },
    ])

    assert.deepEqual(data, [
      { id: 'task-1', title: 'Serializable task' },
      { id: 'task-2', title: 'Cached task' },
    ])
  })

  test('public task page/api mappers keep response envelopes stable', ({ assert }) => {
    const result = {
      data: [serializable({ id: 'task-1', title: 'Task one' })],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }
    const filters = new GetPublicTasksDTO({
      page: 1,
      per_page: 10,
      skill_ids: ['skill-1'],
      keyword: 'task',
      difficulty: 'hard',
      sort_by: 'created_at',
      sort_order: 'desc',
    })

    assert.deepEqual(mapPublicTasksApiBody(result), {
      data: [{ id: 'task-1', title: 'Task one' }],
      pagination: {
        page: 1,
        perPage: 10,
        total: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
    assert.deepEqual(mapPublicTasksPageProps(result, filters), {
      tasks: [{ id: 'task-1', title: 'Task one' }],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      filters: {
        skill_ids: ['skill-1'],
        keyword: 'task',
        difficulty: 'hard',
        sort_by: 'created_at',
        sort_order: 'desc',
      },
    })
  })

  test('task application mappers keep page and api payloads stable', ({ assert }) => {
    const ownerResult = {
      data: [
        serializable({
          id: 'app-1',
          application_status: 'pending',
          message: 'Tôi có thể làm task này',
          applied_at: '2026-04-09T10:30:00.000Z',
          applicant: {
            id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
          },
        }),
      ],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }
    const myResult = {
      data: [
        serializable({
          id: 'app-2',
          task_id: 'task-2',
          application_status: 'rejected',
          message: 'Đã gửi portfolio',
          rejection_reason: 'Chưa đủ kinh nghiệm với stack này',
          applied_at: '2026-04-08T08:00:00.000Z',
          reviewed_at: '2026-04-09T08:00:00.000Z',
          task: {
            id: 'task-2',
            title: 'Refactor task controller',
            status: 'in_progress',
          },
        }),
      ],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }

    assert.deepEqual(
      mapApplyForTaskApiBody(
        serializable({
          id: 'app-1',
          task_id: 'task-1',
          applicant_id: 'user-1',
          portfolio_links: ['https://portfolio.example.com'],
          application_source: 'public_listing',
        })
      ),
      {
        data: {
          id: 'app-1',
          taskId: 'task-1',
          applicantId: 'user-1',
          portfolioLinks: ['https://portfolio.example.com'],
          applicationSource: 'public_listing',
        },
      }
    )
    assert.deepEqual(
      mapApplicationMatchScoreApiBody({
        match_score: 88,
        skill_match: 90,
        domain_match: 75,
        delivery_reliability: 95,
        trust_score: 82,
        explanations: ['Strong TypeScript alignment'],
        risks: ['Limited domain depth'],
      }),
      {
        data: {
          matchScore: 88,
          skillMatch: 90,
          domainMatch: 75,
          deliveryReliability: 95,
          trustScore: 82,
          explanations: ['Strong TypeScript alignment'],
          risks: ['Limited domain depth'],
        },
      }
    )
    assert.deepEqual(
      mapTaskApplicationsRankingApiBody([
        {
          application_id: 'app-1',
          applicant_id: 'user-1',
          applicant_name: 'duyet',
          match_score: 91,
          skill_match: 93,
          domain_match: 80,
          delivery_reliability: 89,
          trust_score: 87,
          explanations: ['Excellent fit'],
          risks: [],
          candidate_source: 'project_member',
          fit_label: 'strong_match',
          reviewed_skills_count: 3,
          imported_skills_count: 1,
          under_dispute_skills_count: 1,
          latest_confidence_signal: 'high',
        },
      ]),
      {
        data: [
          {
            applicationId: 'app-1',
            applicantId: 'user-1',
            applicantName: 'duyet',
            matchScore: 91,
            skillMatch: 93,
            domainMatch: 80,
            deliveryReliability: 89,
            trustScore: 87,
            explanations: ['Excellent fit'],
            risks: [],
            candidateSource: 'project_member',
            fitLabel: 'strong_match',
            reviewedSkillsCount: 3,
            importedSkillsCount: 1,
            underDisputeSkillsCount: 1,
            latestConfidenceSignal: 'high',
          },
        ],
      }
    )
    assert.deepEqual(mapTaskApplicationsPageProps(ownerResult, 'task-1', 'pending'), {
      shellMode: 'app',
      taskId: 'task-1',
      applications: [
        {
          id: 'app-1',
          user: {
            id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
          },
          status: 'pending',
          cover_letter: 'Tôi có thể làm task này',
          estimated_duration: null,
          created_at: '2026-04-09T10:30:00.000Z',
          candidate_source: 'external',
        },
      ],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      statusFilter: 'pending',
    })
    assert.deepEqual(mapMyApplicationsPageProps(myResult, 'all'), {
      applications: [
        {
          id: 'app-2',
          task_id: 'task-2',
          task: {
            id: 'task-2',
            title: 'Refactor task controller',
            status: 'in_progress',
          },
          status: 'rejected',
          cover_letter: 'Đã gửi portfolio',
          rejection_reason: 'Chưa đủ kinh nghiệm với stack này',
          estimated_duration: null,
          created_at: '2026-04-08T08:00:00.000Z',
          updated_at: '2026-04-09T08:00:00.000Z',
          withdrawn_at: null,
          can_withdraw: false,
          lifecycle_events: [
            { label: 'Đã gửi đề xuất: 2026-04-08T08:00:00.000Z' },
            { label: 'Đã bị từ chối: 2026-04-09T08:00:00.000Z' },
          ],
        },
      ],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      statusFilter: 'all',
    })
  })

  test('task detail and task mutation mappers keep response envelopes stable', ({ assert }) => {
    const task = serializable({ id: 'task-1', title: 'Mapped task' })

    assert.deepEqual(mapTaskCreateApiBody(task), {
      data: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(mapTaskUpdateApiBody(task), {
      data: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(mapTaskStatusApiBody(task), {
      data: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(mapTaskSortOrderApiBody(task), {
      data: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(mapTaskDetailApiBody(task), {
      data: { id: 'task-1', title: 'Mapped task' },
    })
    assert.deepEqual(
      mapTaskDetailPageProps({
        task,
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
          canChangeStatus: true,
          canApply: false,
        },
        auditLogs: [{ id: 'log-1' }],
      }),
      {
        task: { id: 'task-1', title: 'Mapped task' },
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
          canChangeStatus: true,
          canApply: false,
        },
        auditLogs: [{ id: 'log-1' }],
      }
    )
    assert.deepEqual(
      mapScopedTaskDetailPageProps(
        {
          task,
          permissions: {
            isCreator: false,
            isAssignee: true,
            canEdit: true,
            canDelete: false,
            canAssign: false,
            canChangeStatus: true,
            canApply: false,
          },
          auditLogs: [],
        },
        {
          baseRoute: '/work/tasks',
          taskApiBase: '/work/api/tasks',
        }
      ),
      {
        task: { id: 'task-1', title: 'Mapped task' },
        permissions: {
          isCreator: false,
          isAssignee: true,
          canEdit: true,
          canDelete: false,
          canAssign: false,
          canChangeStatus: true,
          canApply: false,
        },
        auditLogs: [],
        shellMode: 'app',
        baseRoute: '/work/tasks',
        taskApiBase: '/work/api/tasks',
      }
    )
    assert.deepEqual(
      mapTaskEditPageProps({
        task,
        metadata: {
          statuses: [{ value: 'todo', label: 'Todo' }],
          labels: [{ value: 'bug', label: 'Bug' }],
          priorities: [{ value: 'high', label: 'High' }],
          users: [{ id: 'user-1', username: 'duyet', email: 'duyet@example.com' }],
          parentTasks: [{ id: 'parent-1', title: 'Parent', task_status_id: 'status-1' }],
          projects: [{ id: 'project-1', name: 'Platform' }],
        },
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
        },
      }),
      {
        task: { id: 'task-1', title: 'Mapped task' },
        metadata: {
          statuses: [{ value: 'todo', label: 'Todo' }],
          labels: [{ value: 'bug', label: 'Bug' }],
          priorities: [{ value: 'high', label: 'High' }],
          users: [{ id: 'user-1', username: 'duyet', email: 'duyet@example.com' }],
          parentTasks: [{ id: 'parent-1', title: 'Parent', task_status_id: 'status-1' }],
          projects: [{ id: 'project-1', name: 'Platform' }],
        },
        permissions: {
          isCreator: true,
          isAssignee: false,
          canEdit: true,
          canDelete: true,
          canAssign: false,
        },
      }
    )
  })

  test('mapTaskDetailApiBody includes all fields required by task detail UI', ({ assert }) => {
    const task = serializable({
      id: 'task-1',
      title: 'Mapped task',
      description: 'Full description',
      acceptance_criteria: 'Definition of done',
      verification_method: 'code_review',
      expected_deliverables: [{ kind: 'spec' }],
      measurable_outcomes: [{ metric: 'coverage', target: '95%' }],
      status: 'in_progress',
      priority: 'high',
      label: 'feature',
      review_zone: {
        submission_id: 'submission-1',
        submission_status: 'submitted',
        review_session_id: 'review-1',
        review_session_status: 'in_progress',
        dispute_id: null,
        dispute_status: null,
        creator_review_completed: false,
        manager_reviews_count: 1,
        peer_reviews_count: 0,
        required_total_reviews: 2,
        required_peer_reviews: 1,
        required_pending_assignments: 1,
        optional_pending_assignments: 0,
      },
    })

    const result = mapTaskDetailApiBody(task)
    assert.deepEqual(result, {
      data: {
        id: 'task-1',
        title: 'Mapped task',
        description: 'Full description',
        acceptance_criteria: 'Definition of done',
        verification_method: 'code_review',
        expected_deliverables: [{ kind: 'spec' }],
        measurable_outcomes: [{ metric: 'coverage', target: '95%' }],
        status: 'in_progress',
        priority: 'high',
        label: 'feature',
        review_zone: {
          submission_id: 'submission-1',
          submission_status: 'submitted',
          review_session_id: 'review-1',
          review_session_status: 'in_progress',
          dispute_id: null,
          dispute_status: null,
          creator_review_completed: false,
          manager_reviews_count: 1,
          peer_reviews_count: 0,
          required_total_reviews: 2,
          required_peer_reviews: 1,
          required_pending_assignments: 1,
          optional_pending_assignments: 0,
        },
      },
    })
  })

  test('mapTaskDetailPageProps includes permissions, auditLogs, and resolved brief', ({ assert }) => {
    const task = serializable({
      id: 'task-1',
      title: 'Task',
      review_zone: {
        submission_id: 'submission-1',
        submission_status: 'submitted',
        review_session_id: null,
        review_session_status: null,
        dispute_id: null,
        dispute_status: null,
        creator_review_completed: null,
        manager_reviews_count: 0,
        peer_reviews_count: 0,
        required_total_reviews: null,
        required_peer_reviews: null,
        required_pending_assignments: 0,
        optional_pending_assignments: 0,
      },
    })
    const resolvedBrief = {
      schemaVersion: 'suar.task_resolved_brief_projection.v1',
      assignmentId: 'assignment-1',
      assignmentSnapshotId: 'snapshot-1',
      assignmentSnapshotHash: 'sha256:brief',
    }
    const result = mapTaskDetailPageProps({
      task,
      permissions: {
        isCreator: false,
        isAssignee: true,
        canEdit: false,
        canDelete: false,
        canAssign: false,
        canChangeStatus: false,
        canApply: true,
      },
      auditLogs: [],
      resolved_brief: resolvedBrief,
    })

    assert.properties(result, ['task', 'permissions', 'auditLogs'])
    assert.property(result.task, 'review_zone')
    assert.property(result.task, 'resolved_brief')
    assert.deepEqual(result.permissions, {
      isCreator: false,
      isAssignee: true,
      canEdit: false,
      canDelete: false,
      canAssign: false,
      canChangeStatus: false,
      canApply: true,
    })
    assert.deepEqual(result.auditLogs, [])
    assert.deepEqual(result.task.resolved_brief, resolvedBrief)
  })

})
