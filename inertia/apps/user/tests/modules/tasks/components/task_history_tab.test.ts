import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskHistoryTab from '@/apps/user/modules/tasks/components/detail/task_history_tab.svelte'

const auditLogs = [
  {
    id: 'audit-1',
    action: 'status_changed',
    timestamp: '2026-07-09T10:30:00.000Z',
    user: {
      id: 'user-1',
      name: 'Ngoc Duyet',
      email: 'duyet@example.com',
    },
    changes: [
      {
        field: 'status',
        oldValue: 'todo',
        newValue: 'in_progress',
      },
      {
        field: 'priority',
        oldValue: 2,
        newValue: 4,
      },
    ],
  },
]

describe('TaskHistoryTab', () => {
  it('renders the real audit trail contract without drifting to legacy keys', () => {
    render(TaskHistoryTab, {
      props: {
        auditLogs,
      },
    })

    expect(screen.getByText('Ngoc Duyet')).toBeInTheDocument()
    expect(screen.getByText('status_changed')).toBeInTheDocument()
    expect(screen.getByText(/2026|09\/07|07\/09|9 thg 7|Jul/)).toBeInTheDocument()

    expect(screen.getByText('status:')).toBeInTheDocument()
    expect(screen.getByText('todo')).toBeInTheDocument()
    expect(screen.getByText('in_progress')).toBeInTheDocument()
    expect(screen.getByText('priority:')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()

    expect(screen.queryByText('System')).not.toBeInTheDocument()
    expect(screen.queryByText('0:')).not.toBeInTheDocument()
    expect(screen.queryByText('-')).not.toBeInTheDocument()
  })
})
