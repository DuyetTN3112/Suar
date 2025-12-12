/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    reload: vi.fn(),
  },
}))

import WorkflowPage from '@/apps/org/modules/workflow/index.svelte'

describe('Workflow task page', () => {
  it('exposes workflow status management actions instead of a read-only list', () => {
    render(WorkflowPage, {
      props: {
        taskStatuses: [
          {
            id: 'todo-id',
            name: 'Todo',
            color: '#94A3B8',
            order: 1,
            is_default: true,
          },
          {
            id: 'qa-id',
            name: 'Ready for QA',
            color: '#0F766E',
            order: 2,
            is_default: false,
          },
        ],
      },
    })

    expect(screen.getByRole('heading', { name: 'Workflow task' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thêm trạng thái' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đổi tên Ready for QA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đưa Ready for QA lên trước' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đưa Todo xuống sau' })).toBeInTheDocument()
    expect(screen.getByText('2 trạng thái')).toBeInTheDocument()
  })
})
