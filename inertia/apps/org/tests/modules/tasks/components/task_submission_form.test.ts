import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskSubmissionFormHarness from './task_submission_form_harness.svelte'

describe('TaskSubmissionForm', () => {
  it('shows readiness guidance without making draft depend on test notes or evidence', async () => {
    render(TaskSubmissionFormHarness)

    expect(screen.getByRole('region', { name: /Báo cáo sẵn sàng|Mức độ sẵn sàng hoàn thành|Completion readiness/i })).toBeInTheDocument()
    expect(screen.getByText('Add tests')).toBeInTheDocument()
    expect(screen.getByText('Document the result')).toBeInTheDocument()
    expect(screen.getByText(/Bản nháp có thể lưu khi bạn đã có tóm tắt kết quả|Có thể lưu nháp một phần/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Nộp báo cáo' })).toBeDisabled()
    expect(screen.getByText(/Tóm tắt kết quả là bắt buộc|Vui lòng nhập tóm tắt kết quả/i)).toBeInTheDocument()
    expect(screen.getByText(/✓ 1 verification evidence attached/i)).toBeInTheDocument()

    await fireEvent.input(screen.getByLabelText('Tóm tắt kết quả'), {
      target: { value: 'Implemented the requested change' },
    })

    expect(screen.getByRole('button', { name: 'Lưu nháp' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Nộp báo cáo' })).not.toBeDisabled()
    expect(screen.queryByText(/Tóm tắt kết quả là bắt buộc|Vui lòng nhập tóm tắt kết quả/i)).not.toBeInTheDocument()
    expect(screen.getByText(/✓ 1 verification evidence attached/i)).toBeInTheDocument()
  })

  it('adds evidence and hides the inline form afterwards', async () => {
    render(TaskSubmissionFormHarness)

    await fireEvent.click(screen.getByRole('button', { name: 'Thêm bằng chứng' }))

    await fireEvent.input(screen.getByLabelText('URL bằng chứng'), {
      target: { value: 'https://example.com/new-pr' },
    })
    await fireEvent.input(screen.getByLabelText('Tiêu đề'), {
      target: { value: 'PR #12' },
    })
    await fireEvent.input(screen.getByLabelText('Mô tả'), {
      target: { value: 'Bằng chứng review' },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thêm' }))

    expect(screen.getByText('PR #12')).toBeInTheDocument()
    expect(screen.getByText('Bằng chứng review')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/new-pr')).toBeInTheDocument()
    expect(screen.queryByLabelText('URL bằng chứng')).not.toBeInTheDocument()
  })

  it('rejects empty evidence URLs', async () => {
    render(TaskSubmissionFormHarness)

    await fireEvent.click(screen.getByRole('button', { name: 'Thêm bằng chứng' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thêm' }))

    expect(screen.getByText('Vui lòng điền đường dẫn URL của bằng chứng.')).toBeInTheDocument()
    expect(screen.getByLabelText('URL bằng chứng')).toBeInTheDocument()
  })

  it('removes evidence items from the list', async () => {
    render(TaskSubmissionFormHarness)

    expect(screen.getByText('PR gốc')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Xóa' }))

    expect(screen.queryByText('PR gốc')).not.toBeInTheDocument()
    expect(screen.getByText('Chưa có bằng chứng nào được đính kèm.')).toBeInTheDocument()
  })
})
