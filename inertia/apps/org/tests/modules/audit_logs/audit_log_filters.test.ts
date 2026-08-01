import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import AuditLogFilters from '@/apps/org/modules/audit_logs/components/audit_log_filters.svelte'

const emptyFilters = {
  search: '',
  action: null,
  resourceType: null,
  outcome: null,
  userId: null,
  from: null,
  to: null,
  after: null,
  before: null,
}

describe('Organization audit log filters', () => {
  it('submits normalized investigation filters from the advanced controls', async () => {
    const onApply = vi.fn()

    render(AuditLogFilters, {
      props: {
        filters: emptyFilters,
        onApply,
        onClear: vi.fn(),
      },
    })

    await fireEvent.input(
      screen.getByLabelText(/Search audit records|Tìm trong nhật ký kiểm toán/i),
      { target: { value: '  quarterly report  ' } }
    )
    await fireEvent.click(
      screen.getByRole('button', { name: /More filters|Thêm bộ lọc/i })
    )
    await fireEvent.input(screen.getByLabelText(/Action code|Mã hành động/i), {
      target: { value: '  task.status.changed  ' },
    })
    await fireEvent.change(screen.getByLabelText(/Target type|Loại đối tượng/i), {
      target: { value: 'task' },
    })
    await fireEvent.change(screen.getByLabelText(/Outcome|Kết quả/i), {
      target: { value: 'success' },
    })
    await fireEvent.input(screen.getByLabelText(/^(?:From|Từ thời điểm)$/i), {
      target: { value: '2026-07-20T08:30' },
    })
    await fireEvent.input(screen.getByLabelText(/^(?:To|Đến thời điểm)$/i), {
      target: { value: '2026-07-20T09:45' },
    })
    await fireEvent.submit(
      screen.getByRole('form', {
        name: /Audit log filters|Bộ lọc nhật ký kiểm toán/i,
      })
    )

    expect(onApply).toHaveBeenCalledOnce()
    expect(onApply).toHaveBeenCalledWith({
      search: 'quarterly report',
      action: 'task.status.changed',
      resourceType: 'task',
      outcome: 'success',
      from: new Date('2026-07-20T08:30').toISOString(),
      to: new Date('2026-07-20T09:45').toISOString(),
    })
  })

  it('clears all active filters through the explicit reset action', async () => {
    const onClear = vi.fn()

    render(AuditLogFilters, {
      props: {
        filters: {
          ...emptyFilters,
          search: 'task',
          action: 'task.status.changed',
          resourceType: 'task',
          outcome: 'success',
        },
        onApply: vi.fn(),
        onClear,
      },
    })

    const resetButtons = screen.getAllByRole('button', {
      name: /Clear|Xóa bộ lọc/i,
    })
    expect(resetButtons.length).toBeGreaterThan(0)
    const resetButton = resetButtons.at(0)
    expect(resetButton).toBeDefined()
    if (!resetButton) return
    await fireEvent.click(resetButton)

    expect(onClear).toHaveBeenCalledOnce()
    expect(
      screen.getByLabelText(/Search audit records|Tìm trong nhật ký kiểm toán/i)
    ).toHaveValue('')
  })
})
