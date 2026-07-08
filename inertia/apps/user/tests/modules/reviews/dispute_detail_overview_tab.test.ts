import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import DisputeDetailOverviewTab from '@/apps/user/modules/reviews/disputes/components/dispute_detail_overview_tab.svelte'

describe('DisputeDetailOverviewTab', () => {
  it('shows escalation package summary with full task discussion counts', () => {
    render(DisputeDetailOverviewTab, {
      props: {
        dispute: {
          id: 'dispute-1',
          task_title: 'Task review governance',
          status: 'collecting_evidence',
          dispute_reason: 'Review chưa phản ánh đúng phạm vi đã giao.',
          requested_outcome: 'Điều chỉnh điểm',
          reviewee_username: 'duyet',
        },
        statusMap: {
          collecting_evidence: { label: 'Đang thu thập minh chứng', variant: 'outline' },
        },
        canRespond: true,
        canReportToAdmin: false,
        reportReason: '',
        reportingDispute: false,
        taskCommentCount: 4,
        exchangeCount: 2,
        evidenceCount: 3,
        onReportToAdmin: vi.fn(),
      },
    })

    expect(screen.getByText('Package gửi admin')).toBeInTheDocument()
    expect(screen.getByText('Toàn bộ comment task')).toBeInTheDocument()
    expect(screen.getByText('4 mục')).toBeInTheDocument()
    expect(screen.getByText('Trao đổi tranh chấp')).toBeInTheDocument()
    expect(screen.getByText('2 lượt')).toBeInTheDocument()
    expect(screen.getByText('Minh chứng bổ sung')).toBeInTheDocument()
    expect(screen.getByText('3 mục')).toBeInTheDocument()
  })
})
