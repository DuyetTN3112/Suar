import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import DisputeOverviewTab from '@/apps/admin/modules/disputes/components/dispute_overview_tab.svelte'

describe('DisputeOverviewTab', () => {
  it('shows latest admin dossier summary so overview reflects the escalated package', () => {
    render(DisputeOverviewTab, {
      props: {
        dispute: {
          id: 'dispute-1',
          task_title: 'Review governance task',
          task_description: 'Task moved into admin dispute handling.',
          reviewee_username: 'duyet',
          reviewee_email: 'duyet@example.com',
          dispute_reason: 'Missing benchmark evidence in original review.',
          review_session_status: 'disputed',
          requested_outcome: 'adjust_score',
          status: 'admin_reviewing',
        },
        latestCaseFile: {
          case_version: 3,
          completeness_score: 91,
        },
        caseFileStats: {
          taskComments: 5,
          disputeMessages: 3,
          evidences: 2,
        },
      },
    })

    expect(screen.getByText('Admin dossier mới nhất')).toBeInTheDocument()
    expect(screen.getByText('Hồ sơ vụ việc v3')).toBeInTheDocument()
    expect(screen.getByText('Hoàn thiện 91%')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
