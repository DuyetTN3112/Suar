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
import { createMockTaskReviewDetail } from '@/apps/shared/tests/tasks/support/task_review_workflow_test_support'

describe('Org TaskReviewWorkflowPanel - Observations & Packages', () => {
  beforeEach(() => {
    inertiaMocks.router.post.mockClear()
    inertiaMocks.router.post.mockReset()
  })

  it('lets a pending reviewer submit a provenance-bound claim observation', async () => {
    render(TaskReviewWorkflowPanel, {
      props: {
        taskId: 'task-1',
        projectId: 'project-1',
        currentUserId: 'reviewer-1',
        taskDetailUrl: '/org/tasks/task-1',
        detail: createMockTaskReviewDetail({
          workflow: { id: '11111111-1111-4111-8111-111111111111', status: 'awaiting_review' },
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
        }),
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
        detail: createMockTaskReviewDetail({
          workflow: { id: '11111111-1111-4111-8111-111111111111', status: 'awaiting_review' },
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
        }),
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
        detail: createMockTaskReviewDetail({
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
        }),
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
        detail: createMockTaskReviewDetail({
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
        }),
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
        detail: createMockTaskReviewDetail({
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
        }),
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
        detail: createMockTaskReviewDetail({
          reviewAuthoringContext: {
            reviewPackageAvailable: true,
            taskAssignmentId: 'assignment-1',
            completionReportId: 'report-1',
          },
        }),
      },
    })

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('review package native')
    )
    expect(screen.queryByTestId('review-observation-authoring')).not.toBeInTheDocument()
  })
})
