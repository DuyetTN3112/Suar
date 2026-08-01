import { test } from '@japa/runner'

import { TasksTaskApplicationCapabilityAdapter } from '#composition/adapters/tasks_task_application_capability_adapter'
import {
  type GetOrganizationTaskApplicationsDTO,
  type ProcessApplicationDTO,
} from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { RankedApplication } from '#modules/tasks/actions/queries/get_task_applications_ranking_query'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'

const context = {
  userId: 'user-1',
  ip: '127.0.0.1',
  userAgent: 'task-application-facade-test',
  organizationId: null,
}

const application: TaskApplicationRecord = {
  id: 'application-1',
  task_id: 'task-1',
  applicant_id: 'user-1',
  application_status: 'pending',
  application_source: 'public_listing',
  message: 'Ready to contribute',
  portfolio_links: ['https://example.com/work'],
  applied_at: '2026-07-26T00:00:00.000Z',
  reviewed_by: null,
  reviewed_at: null,
  rejection_reason: null,
  applicant: {
    id: 'user-1',
    username: 'contributor',
    email: 'contributor@example.com',
  },
  task: {
    id: 'task-1',
    title: 'Marketplace task',
    description: 'Task description',
    status: 'todo',
    task_status_id: null,
    priority: 'medium',
    assigned_to: null,
    creator_id: 'owner-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    organization: {
      id: 'org-1',
      name: 'Organization',
      logo: null,
    },
    project: {
      id: 'project-1',
      name: 'Project',
    },
  },
}

const page = {
  data: [application],
  meta: {
    total: 1,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  },
}

const rankedApplication: RankedApplication = {
  application_id: 'application-1',
  applicant_id: 'user-1',
  applicant_name: 'contributor',
  match_score: 90,
  skill_match: 92,
  domain_match: 88,
  delivery_reliability: 91,
  trust_score: 89,
  evidence_confidence: 'high',
  evidence_warnings: [],
  explanations: ['Strong evidence'],
  risks: [],
  candidate_source: 'external',
  fit_label: 'strong_match',
  reviewed_skills_count: 4,
  imported_skills_count: 1,
  under_dispute_skills_count: 0,
  latest_confidence_signal: 'high',
}

type FacadeDependencies = ConstructorParameters<typeof TasksTaskApplicationCapabilityAdapter>[0]

function makeDependencies(overrides: Partial<FacadeDependencies> = {}): FacadeDependencies {
  return {
    makeApply: () => ({ handle: () => Promise.resolve(application) }),
    makeProcess: () => ({ handle: () => Promise.resolve(application) }),
    makeWithdraw: () => ({ handle: () => Promise.resolve() }),
    makeListForTask: () => ({ handle: () => Promise.resolve(page) }),
    makeListForCurrentApplicant: () => ({ handle: () => Promise.resolve(page) }),
    makeListForOrganization: () => ({ handle: () => Promise.resolve(page) }),
    makeScore: () => ({
      handle: () =>
        Promise.resolve({
          scoring_version: 'applicant_match_v1',
          match_score: 90,
          skill_match: 92,
          domain_match: 88,
          delivery_reliability: 91,
          trust_score: 89,
          evidence_confidence: 'high',
          evidence_warnings: [],
          explanations: ['Strong evidence'],
          risks: [],
        }),
    }),
    makeRank: () => ({ handle: () => Promise.resolve([rankedApplication]) }),
    ...overrides,
  }
}

test.group('Task application capability facade', () => {
  test('maps application records to stable provider projections', async ({ assert }) => {
    const facade = new TasksTaskApplicationCapabilityAdapter(makeDependencies())

    const submitted = await facade.submit(context, {
      taskId: 'task-1',
      message: 'Ready to contribute',
      portfolioLinks: ['https://example.com/work'],
      applicationSource: 'public_listing',
    })
    const reviewPage = await facade.listForTask(context, {
      taskId: 'task-1',
      status: 'all',
      page: 1,
      perPage: 20,
    })
    const currentApplicantPage = await facade.listForCurrentApplicant(context, {
      status: 'all',
      page: 1,
      perPage: 20,
    })

    assert.deepEqual(submitted, {
      id: 'application-1',
      taskId: 'task-1',
      applicantId: 'user-1',
      message: 'Ready to contribute',
      portfolioLinks: ['https://example.com/work'],
      applicationSource: 'public_listing',
    })
    assert.deepEqual(reviewPage, {
      data: [
          {
            id: 'application-1',
            taskId: 'task-1',
            applicationStatus: 'pending',
            message: 'Ready to contribute',
            portfolioLinks: ['https://example.com/work'],
            appliedAt: '2026-07-26T00:00:00.000Z',
          applicant: {
            id: 'user-1',
              username: 'contributor',
              email: 'contributor@example.com',
            },
            task: {
              id: 'task-1',
              title: 'Marketplace task',
              status: 'todo',
            },
            candidateSource: 'external',
          },
      ],
      meta: { total: 1, perPage: 20, currentPage: 1, lastPage: 1 },
    })
    assert.deepInclude(currentApplicantPage.data[0] ?? {}, {
      id: 'application-1',
      taskId: 'task-1',
      applicationStatus: 'pending',
      task: {
        id: 'task-1',
        title: 'Marketplace task',
        status: 'todo',
        organizationName: 'Organization',
        projectName: 'Project',
      },
    })
  })

  test('lists organization-wide applications with task context for inboxes', async ({
    assert,
  }) => {
    let capturedInput: GetOrganizationTaskApplicationsDTO | null = null
    const facade = new TasksTaskApplicationCapabilityAdapter(
      makeDependencies({
        makeListForOrganization: () => ({
          handle: (input) => {
            capturedInput = input
            return Promise.resolve(page)
          },
        }),
      })
    )

    const inboxPage = await facade.listForOrganization(context, {
      organizationId: 'org-1',
      status: 'pending',
      page: 2,
      perPage: 10,
    })

    assert.deepInclude(capturedInput, {
      organization_id: 'org-1',
      status: 'pending',
      page: 2,
      per_page: 10,
    })
    assert.deepInclude(inboxPage.data[0] ?? {}, {
      id: 'application-1',
      taskId: 'task-1',
      task: {
        id: 'task-1',
        title: 'Marketplace task',
        status: 'todo',
      },
    })
  })

  test('maps score and ranking implementation fields to camel-case capability facts', async ({
    assert,
  }) => {
    const facade = new TasksTaskApplicationCapabilityAdapter(makeDependencies())

    const score = await facade.score(context, {
      taskId: 'task-1',
      applicationId: 'application-1',
    })
    const ranking = await facade.rank(context, { taskId: 'task-1' })

    assert.deepEqual(score, {
      matchScore: 90,
      skillMatch: 92,
      domainMatch: 88,
      deliveryReliability: 91,
      trustScore: 89,
      evidenceConfidence: 'high',
      evidenceWarnings: [],
      explanations: ['Strong evidence'],
      risks: [],
    })
    assert.deepInclude(ranking[0] ?? {}, {
      applicationId: 'application-1',
      applicantId: 'user-1',
      candidateSource: 'external',
      fitLabel: 'strong_match',
      latestConfidenceSignal: 'high',
    })
  })

  test('keeps marketplace decision assignment metadata when delegating to tasks', async ({
    assert,
  }) => {
    let capturedInput: ProcessApplicationDTO | null = null
    const facade = new TasksTaskApplicationCapabilityAdapter(
      makeDependencies({
        makeProcess: () => ({
          handle: (input) => {
            capturedInput = input
            return Promise.resolve(application)
          },
        }),
      })
    )

    await facade.decide(context, {
      applicationId: 'application-1',
      action: 'approve',
      rejectionReason: null,
      assignmentType: 'member',
      estimatedHours: 16,
    })

    assert.deepInclude(capturedInput, {
      application_id: 'application-1',
      action: 'approve',
      assignment_type: 'member',
      estimated_hours: 16,
    })
  })
})
