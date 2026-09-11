import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import TaskSubmissionFormHarness from './task_submission_form_harness.svelte'

describe('TaskSubmissionForm', () => {
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

  it('shows a non-persistent coverage guide from the assignment snapshot', () => {
    render(TaskSubmissionFormHarness)

    expect(screen.getByRole('heading', { name: /Completion coverage guide|Hướng dẫn bao phủ hoàn thành/i })).toBeInTheDocument()
    expect(screen.getByText('Automated tests pass')).toBeInTheDocument()
    expect(screen.getByText('Document the user-visible result')).toBeInTheDocument()
    expect(screen.getByText(/This guide is not saved as criterion results|Hướng dẫn này không được lưu thành kết quả từng tiêu chí/i)).toBeInTheDocument()
  })
})
