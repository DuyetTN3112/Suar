import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import UserAuditChangeList from '@/apps/user/modules/audit_logs/components/user_audit_change_list.svelte'
import UserAuditFilters from '@/apps/user/modules/audit_logs/components/user_audit_filters.svelte'
import type { UserAuditFilters as UserAuditFilterState } from '@/apps/user/modules/audit_logs/models/activity_item'

const emptyFilters: UserAuditFilterState = {
  search: '',
  resourceType: null,
  outcome: null,
  from: null,
  to: null,
  after: null,
  before: null,
}

describe('user audit personal components', () => {
  it('submits only user-safe filters and can clear active state', async () => {
    const onApply = vi.fn()
    const onClear = vi.fn()
    render(UserAuditFilters, {
      filters: emptyFilters,
      onApply,
      onClear,
    })

    await fireEvent.input(screen.getByLabelText(/Search your activity|Tìm trong hoạt động/i), {
      target: { value: '  login  ' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /More filters|Thêm bộ lọc/i }))
    await fireEvent.change(screen.getByLabelText(/Activity area|Khu vực hoạt động/i), {
      target: { value: 'user' },
    })
    await fireEvent.change(screen.getByLabelText(/Outcome|Kết quả/i), {
      target: { value: 'success' },
    })
    await fireEvent.click(screen.getByRole('button', { name: /Apply|Áp dụng/i }))

    expect(onApply).toHaveBeenCalledWith({
      search: 'login',
      resourceType: 'user',
      outcome: 'success',
      from: null,
      to: null,
    })
    expect(screen.queryByLabelText(/Action code/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/User ID/i)).not.toBeInTheDocument()
  })

  it('renders safe values while protecting personal and hidden fields', () => {
    render(UserAuditChangeList, {
      changes: [
        {
          field: 'status',
          operation: 'changed',
          before: 'member',
          after: 'org_admin',
          redacted: false,
        },
        {
          field: 'email',
          operation: 'changed',
          before: null,
          after: null,
          redacted: true,
        },
      ],
      hasHiddenChanges: true,
    })

    expect(screen.getByText('member')).toBeInTheDocument()
    expect(screen.getByText('org_admin')).toBeInTheDocument()
    expect(screen.getByText(/Value protected|Giá trị được bảo vệ/i)).toBeInTheDocument()
    expect(
      screen.getByText(
        /Some sensitive or organization-only fields are intentionally omitted|Một số trường nhạy cảm hoặc chỉ dành cho tổ chức/i
      )
    ).toBeInTheDocument()
    expect(screen.queryByText('before@example.test')).not.toBeInTheDocument()
  })

  it('blocks an inverted date range before it reaches the server', async () => {
    const onApply = vi.fn()
    render(UserAuditFilters, {
      filters: emptyFilters,
      onApply,
      onClear: vi.fn(),
    })

    await fireEvent.click(screen.getByRole('button', { name: /More filters|Thêm bộ lọc/i }))
    await fireEvent.input(screen.getByLabelText(/From|Từ/i), {
      target: { value: '2026-07-23T12:00' },
    })
    await fireEvent.input(screen.getByLabelText(/To|Đến/i), {
      target: { value: '2026-07-22T12:00' },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      /start time must be earlier|bắt đầu phải sớm hơn/i
    )
    expect(screen.getByRole('button', { name: /Apply|Áp dụng/i })).toBeDisabled()
    expect(onApply).not.toHaveBeenCalled()
  })
})
