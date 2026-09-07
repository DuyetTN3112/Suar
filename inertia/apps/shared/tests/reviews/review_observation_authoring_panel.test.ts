import { render, screen, within } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ReviewObservationAuthoringPanel from '@/apps/shared/components/review_observation_authoring_panel.svelte'

describe('ReviewObservationAuthoringPanel attribution', () => {
  it('distinguishes persisted contributor claims as read-only reviewer facts', () => {
    render(ReviewObservationAuthoringPanel, {
      props: {
        workflowId: 'workflow-1',
        currentUserId: 'reviewer-1',
        taskId: 'task-1',
        projectId: 'project-1',
        taskDetailUrl: '/tasks/task-1',
        context: {
          reviewSessionId: 'session-1',
          taskAssignmentId: 'assignment-1',
          assignmentSnapshotId: 'snapshot-1',
          assignmentSnapshotHash: 'sha256:snapshot',
          completionReportId: 'report-1',
          completionReportHash: 'sha256:report',
          taskContractVersionId: 'version-1',
          taskContractHash: 'sha256:contract',
          subjectUserId: 'subject-1',
          claims: [
            {
              id: 'claim-1',
              proposed_title: 'API implementation',
              proposed_statement: 'Implemented the API.',
              contributorUserId: 'contributor-1',
              actualRole: 'implementer',
              actualOwnership: 'primary_owner',
              actualAutonomy: 'independent',
              claimStatus: 'under_review',
              contributionStatement: 'Implemented the API lifecycle.',
              evidence_refs: ['evidence-1'],
            },
            {
              id: 'claim-2',
              proposed_title: 'Review contribution',
              proposed_statement: 'Reviewed the API.',
              contributorUserId: 'contributor-2',
              actualRole: 'reviewer',
              actualOwnership: 'contributor',
              actualAutonomy: 'guided',
              claimStatus: 'candidate',
              contributionStatement: 'Reviewed the API lifecycle.',
              evidence_refs: ['evidence-2'],
            },
          ],
          evidence: [
            { id: 'evidence-1', reviewer_access_state: 'available' },
            { id: 'evidence-2', reviewer_access_state: 'available' },
          ],
          reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
        },
        translate: (_key: string, _params?: Record<string, unknown>, fallback?: string) =>
          fallback ?? '',
      },
    })

    const attribution = screen.getByTestId('review-package-attribution')
    expect(attribution).toBeInTheDocument()
    expect(attribution).toHaveTextContent('contributor-1')
    expect(attribution).toHaveTextContent('contributor-2')
    expect(attribution).toHaveTextContent('implementer')
    expect(attribution).toHaveTextContent('reviewer')
    expect(attribution).toHaveTextContent('independent')
    expect(attribution).toHaveTextContent('under_review')
    expect(attribution).toHaveTextContent('Implemented the API lifecycle.')
    expect(attribution).toHaveTextContent('evidence-1')
    expect(within(attribution).queryByRole('button')).not.toBeInTheDocument()
    expect(within(attribution).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(attribution).queryByRole('combobox')).not.toBeInTheDocument()
  })
})
