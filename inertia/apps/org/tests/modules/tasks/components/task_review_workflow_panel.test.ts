import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type InertiaPostOptions = {
  onError?: (errors: Record<string, string | string[] | undefined>) => void
}

type InertiaPost = (
  url: string,
  data: Record<string, unknown>,
  options?: InertiaPostOptions
) => void

const inertiaMocks = vi.hoisted(() => ({
  router: {
    post: vi.fn<InertiaPost>(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

import TaskReviewWorkflowPanel from '@/apps/org/modules/tasks/components/detail/task_review_workflow_panel.svelte'
import type { TaskCompletionReviewPackageProjection } from '@/apps/shared/reviews/task_completion_review_package'

describe('Org TaskReviewWorkflowPanel', () => {
  beforeEach(() => {
    inertiaMocks.router.post.mockClear()
    inertiaMocks.router.post.mockReset()
  })

  it('keeps task review actions on the organization task detail route', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_review',
            completed_review_count: 0,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.input(screen.getByLabelText('Nhập review'), {
      target: { value: 'Evidence accepted.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/tasks/task-1/reviews',
      {
        body: 'Evidence accepted.',
        project_id: 'project-1',
        redirect_to: '/org/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('lets the next pending reviewer submit while the workflow is in review', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-2',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: {
            id: 'workflow-1',
            status: 'in_review',
            completed_review_count: 1,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer 1',
              reviewer_role: 'peer',
              status: 'submitted',
              priority_rank: 1,
            },
            {
              reviewer_id: 'reviewer-2',
              reviewer_name: 'Reviewer 2',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 2,
            },
          ],
          comments: [],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
          ],
        },
      },
    })

    await fireEvent.input(screen.getByLabelText('Nhập review'), {
      target: { value: 'Second reviewer can still submit.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/tasks/task-1/reviews',
      {
        body: 'Second reviewer can still submit.',
        project_id: 'project-1',
        redirect_to: '/org/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('lets the reviewee accept or respond from organization task detail', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'worker-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_response',
            completed_review_count: 2,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'submitted',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
          ],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Phản hồi đánh giá/i }))
    await fireEvent.input(screen.getByLabelText('Phản hồi/tranh luận'), {
      target: { value: 'Need one clarification.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi phản hồi/i }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/task-reviews/workflow-1/respond',
      {
        body: 'Need one clarification.',
        review_message_id: 'review-1',
        project_id: 'project-1',
        task_id: 'task-1',
        redirect_to: '/org/tasks/task-1',
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      })
    )
  })

  it('shows inline failures for task review mutations without clearing drafts', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onError?.({ message: 'Organization review action was refused.' })
    })

    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_review',
            completed_review_count: 0,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    const reviewTextarea = screen.getByLabelText('Nhập review')
    await fireEvent.input(reviewTextarea, {
      target: { value: 'Keep org review draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Gửi review/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Organization review action was refused.')
    expect(reviewTextarea).toHaveValue('Keep org review draft.')
  })

  it('shows inline report failures and preserves the organization dispute draft', async () => {
    inertiaMocks.router.post.mockImplementation((_url, _data, options) => {
      options?.onError?.({ reason: 'Organization dispute report was refused.' })
    })

    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: {
            assigned_to: 'worker-1',
          },
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_response',
            completed_review_count: 2,
            required_review_count: 2,
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'submitted',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [
            { id: 'review-1', author_id: 'reviewer-1', author_name: 'Reviewer', message_type: 'review', body: 'Please clarify.', created_at: '2026-08-01T00:00:00.000Z' },
            { id: 'response-1', parent_review_message_id: 'review-1', author_id: 'worker-1', author_name: 'Worker', message_type: 'reviewee_response', body: 'Here is the clarification.', created_at: '2026-08-01T01:00:00.000Z' },
          ],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Gửi báo cáo tranh chấp/i }))
    const claimTextarea = screen.getByRole('textbox', { name: 'Dispute claim' })
    const evidenceTextarea = screen.getByRole('textbox', { name: 'Dispute evidence' })
    await fireEvent.input(claimTextarea, {
      target: { value: 'Keep organization dispute claim draft.' },
    })
    await fireEvent.input(evidenceTextarea, {
      target: { value: 'Keep organization dispute evidence draft.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /^Gửi báo cáo$/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Organization dispute report was refused.')
    expect(claimTextarea).toHaveValue('Keep organization dispute claim draft.')
    expect(evidenceTextarea).toHaveValue('Keep organization dispute evidence draft.')
  })

  it('lets a pending reviewer submit a provenance-bound claim observation', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: { id: '11111111-1111-4111-8111-111111111111', status: 'awaiting_review' },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
          reviewAuthoringContext: {
            reviewSessionId: '22222222-2222-4222-8222-222222222222',
            taskAssignmentId: '33333333-3333-4333-8333-333333333333',
            assignmentSnapshotId: '44444444-4444-4444-8444-444444444444',
            assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
            completionReportId: '55555555-5555-4555-8555-555555555555',
            completionReportHash: `sha256:${'b'.repeat(64)}`,
            taskContractVersionId: '66666666-6666-4666-8666-666666666666',
            taskContractHash: `sha256:${'c'.repeat(64)}`,
            subjectUserId: 'worker-1',
            report: {
              workPerformed: 'Delivered the reviewed change',
              privacyClassification: 'internal',
            },
            claims: [
              {
                id: '77777777-7777-4777-8777-777777777777',
                proposed_title: 'Reviewed change',
                proposed_statement: 'Delivered the reviewed change',
                action: 'deliver',
                object: 'change',
                actual_ownership: 'contributor',
                claim_status: 'candidate',
                deliverable_refs: [],
                criterion_result_refs: [],
                evidence_refs: ['88888888-8888-4888-8888-888888888888'],
              },
            ],
            evidence: [
              {
                id: '88888888-8888-4888-8888-888888888888',
                reviewer_access_state: 'available',
                access_classification: 'internal',
              },
            ],
            reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
          },
        },
      },
    })
    await fireEvent.change(screen.getByLabelText('Claim'), {
      target: { value: '77777777-7777-4777-8777-777777777777' },
    })
    await fireEvent.input(screen.getByLabelText('Rationale'), {
      target: { value: 'The available evidence supports only the submitted scope.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Submit observation' }))
    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/reviews/11111111-1111-4111-8111-111111111111/observations',
      expect.objectContaining({
        completionClaimId: '77777777-7777-4777-8777-777777777777',
        evidenceSufficiency: 'adequate',
      }),
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
  })

  it('only submits evidence already attributed to the selected claim', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: { id: '11111111-1111-4111-8111-111111111111', status: 'awaiting_review' },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
          reviewAuthoringContext: {
            reviewSessionId: '22222222-2222-4222-8222-222222222222',
            taskAssignmentId: '33333333-3333-4333-8333-333333333333',
            assignmentSnapshotId: '44444444-4444-4444-8444-444444444444',
            assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
            completionReportId: '55555555-5555-4555-8555-555555555555',
            completionReportHash: `sha256:${'b'.repeat(64)}`,
            taskContractVersionId: '66666666-6666-4666-8666-666666666666',
            taskContractHash: `sha256:${'c'.repeat(64)}`,
            subjectUserId: 'worker-1',
            claims: [
              {
                id: '77777777-7777-4777-8777-777777777777',
                proposed_title: 'Bounded claim',
                proposed_statement: 'Evidence-bound claim',
                action: 'deliver',
                object: 'change',
                actual_ownership: 'contributor',
                claim_status: 'candidate',
                deliverable_refs: [],
                criterion_result_refs: [],
                evidence_refs: ['88888888-8888-4888-8888-888888888888'],
              },
            ],
            evidence: [
              {
                id: '88888888-8888-4888-8888-888888888888',
                reviewer_access_state: 'available',
                access_classification: 'internal',
              },
              {
                id: '99999999-9999-4999-8999-999999999999',
                reviewer_access_state: 'available',
                access_classification: 'internal',
              },
            ],
            reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
          },
        },
      },
    })

    await fireEvent.change(screen.getByLabelText('Claim'), {
      target: { value: '77777777-7777-4777-8777-777777777777' },
    })
    await fireEvent.input(screen.getByLabelText('Rationale'), {
      target: { value: 'The claim is limited to its attributed evidence.' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Submit observation' }))

    expect(inertiaMocks.router.post).toHaveBeenCalledWith(
      '/reviews/11111111-1111-4111-8111-111111111111/observations',
      expect.objectContaining({
        observation: expect.objectContaining({
          evidenceRefs: ['88888888-8888-4888-8888-888888888888'],
        }) as unknown as Record<string, unknown>,
        evidenceRelations: [
          { evidenceId: '88888888-8888-4888-8888-888888888888', relation: 'supports' },
        ],
      }),
      expect.anything()
    )
  })

  it('keeps claim observation available after the reviewer message is submitted', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: { id: '11111111-1111-4111-8111-111111111111', status: 'in_review' },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'submitted',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
          reviewAuthoringContext: {
            reviewSessionId: '22222222-2222-4222-8222-222222222222',
            taskAssignmentId: '33333333-3333-4333-8333-333333333333',
            assignmentSnapshotId: '44444444-4444-4444-8444-444444444444',
            assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
            completionReportId: '55555555-5555-4555-8555-555555555555',
            completionReportHash: `sha256:${'b'.repeat(64)}`,
            taskContractVersionId: '66666666-6666-4666-8666-666666666666',
            taskContractHash: `sha256:${'c'.repeat(64)}`,
            subjectUserId: 'worker-1',
            claims: [
              {
                id: '77777777-7777-4777-8777-777777777777',
                proposed_title: 'Claim',
                proposed_statement: 'Statement',
                action: 'deliver',
                object: 'change',
                actual_ownership: 'contributor',
                claim_status: 'candidate',
                deliverable_refs: [],
                criterion_result_refs: [],
              },
            ],
            evidence: [
              {
                id: '88888888-8888-4888-8888-888888888888',
                reviewer_access_state: 'available',
                access_classification: 'internal',
              },
            ],
            reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
          },
        },
      },
    })
    expect(screen.getByTestId('review-observation-authoring')).toBeInTheDocument()
  })

  it('uses the caller translation function for reviewer observation copy', () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: { id: 'workflow-1', status: 'awaiting_review' },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
          reviewAuthoringContext: {
            reviewSessionId: 'session-1',
            taskAssignmentId: 'assignment-1',
            assignmentSnapshotId: 'snapshot-1',
            assignmentSnapshotHash: 'sha256:hash',
            completionReportId: 'report-1',
            completionReportHash: 'sha256:report',
            taskContractVersionId: 'version-1',
            taskContractHash: 'sha256:contract',
            subjectUserId: 'worker-1',
            claims: [
              {
                id: 'claim-1',
                proposed_title: 'Claim',
                proposed_statement: 'Statement',
                evidence_refs: ['evidence-1'],
              },
            ],
            evidence: [{ id: 'evidence-1', reviewer_access_state: 'available' }],
            reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
          },
        },
        translate: (key: string, _params?: Record<string, unknown>, fallback?: string) =>
          key === 'task.review_observation.title'
            ? 'Localized observation title'
            : (fallback ?? key),
      },
    })

    expect(screen.getByText('Localized observation title')).toBeInTheDocument()
  })

  it('hydrates native reviewer observations from the package boundary', async () => {
    const packageProjection: TaskCompletionReviewPackageProjection = {
      schemaVersion: 'suar.task_completion_review_package_editor.v1',
      reportId: 'report-1',
      taskId: 'task-1',
      taskAssignmentId: 'assignment-1',
      reportRevision: 2,
      completionReportHash: 'sha256:report',
      assignmentContract: {
        snapshot: {
          id: 'snapshot-1',
          assignmentId: 'assignment-1',
          taskId: 'task-1',
          snapshotHash: 'sha256:snapshot',
          resolvedContract: { versionId: 'version-1', title: 'Implement API lifecycle' },
        },
      },
      report: { id: 'report-1', workPerformed: 'Implemented the API lifecycle' },
      criterionResults: [
        {
          id: 'criterion-result-1',
          criterionId: 'criterion-1',
          expectedOutcome: 'It works',
          actualOutcome: 'It works',
          result: 'met',
        },
      ],
      evidenceManifest: [
        {
          evidenceId: 'evidence-1',
          reviewerAccessState: 'available',
          accessClassification: 'internal',
        },
      ],
      contributorClaims: [
        {
          id: 'claim-1',
          proposedTitle: 'API lifecycle',
          proposedStatement: 'Implemented the lifecycle',
          evidenceRefs: ['evidence-1'],
          deliverableRefs: [],
          criterionResultRefs: [],
          claimStatus: 'under_review',
        },
      ],
      evidenceMappings: [],
      packageHash: 'sha256:package',
    }
    const loadReviewPackage = vi.fn().mockResolvedValue(packageProjection)

    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        loadReviewPackage,
        translate: (_key: string, _params?: Record<string, unknown>, fallback?: string) =>
          fallback ?? '',
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: { id: 'workflow-1', status: 'awaiting_review' },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
          reviewAuthoringContext: {
            reviewPackageAvailable: true,
            reviewSessionId: 'session-1',
            taskAssignmentId: 'assignment-1',
            assignmentSnapshotId: 'snapshot-1',
            assignmentSnapshotHash: 'sha256:snapshot',
            completionReportId: 'report-1',
            completionReportHash: 'sha256:report',
            taskContractVersionId: 'version-1',
            taskContractHash: 'sha256:contract',
            subjectUserId: 'worker-1',
            reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
          },
        },
      },
    })

    await waitFor(() => {
      expect(loadReviewPackage).toHaveBeenCalledWith('report-1', 'task-1', 'assignment-1')
      expect(screen.getByTestId('review-package-facts')).toBeInTheDocument()
    })
    expect(screen.getByText(/Implement API lifecycle/)).toBeInTheDocument()
    expect(screen.getByText(/It works → It works · met/)).toBeInTheDocument()
  })

  it('fails closed when the native reviewer package is unavailable', async () => {
    const loadReviewPackage = vi.fn().mockResolvedValue(null)

    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        loadReviewPackage,
        translate: (_key: string, _params?: Record<string, unknown>, fallback?: string) =>
          fallback ?? '',
        detail: {
          task: { assigned_to: 'worker-1' },
          workflow: { id: 'workflow-1', status: 'awaiting_review' },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
          reviewAuthoringContext: {
            reviewPackageAvailable: true,
            taskAssignmentId: 'assignment-1',
            completionReportId: 'report-1',
          },
        },
      },
    })

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('review package native')
    )
    expect(screen.queryByTestId('review-observation-authoring')).not.toBeInTheDocument()
  })
})
