import { render, fireEvent } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ContextEditorViewer from '../ContextEditorViewer.svelte'

// Mock data for the component
const mockData = {
  title: 'Test Context',
  summary: 'Test summary',
  richContent: '<p>Test content</p>',
}

describe('ContextEditorViewer', () => {
  it('renders in view mode', () => {
    const { getByText, getAllByText, queryByText } = render(ContextEditorViewer, {
      props: {
        data: mockData,
        mode: 'view',
        onSave: vi.fn(),
        onCancel: vi.fn(),
      },
    })

    // Should display the title
    expect(getByText(new RegExp(mockData.title))).toBeInTheDocument()
    // Should display the summary
    expect(getByText(new RegExp(mockData.summary))).toBeInTheDocument()
    // Should display the rich content
    expect(getAllByText('Test content')[0]).toBeInTheDocument()
    // Should not display edit controls
    expect(queryByText('Lưu')).not.toBeInTheDocument()
    expect(queryByText('Hủy')).not.toBeInTheDocument()
  })

  it('renders in edit mode', () => {
    const { getByLabelText, getByText } = render(ContextEditorViewer, {
      props: {
        data: mockData,
        mode: 'edit',
        onSave: vi.fn(),
        onCancel: vi.fn(),
      },
    })

    // Should display the title in an input
    expect(getByLabelText(/Tiêu đề/i)).toHaveValue(mockData.title)
    // Should display the summary in a textarea
    expect(getByLabelText(/Tóm tắt/i)).toHaveValue(mockData.summary)
    // Should display the rich content in a textarea
    expect(getByLabelText(/Nội dung phong phú/i)).toHaveValue(mockData.richContent)
    // Should display the Save and Cancel buttons
    expect(getByText('Lưu')).toBeInTheDocument()
    expect(getByText('Hủy')).toBeInTheDocument()
  })

  it('shows validation errors when required fields are empty in edit mode', () => {
    const { getByText } = render(ContextEditorViewer, {
      props: {
        data: { ...mockData, title: '', summary: '' },
        mode: 'edit',
        onSave: vi.fn(),
        onCancel: vi.fn(),
      },
    })

    // Should show error for title
    expect(getByText('Tiêu đề là bắt buộc')).toBeInTheDocument()
    // Should show error for summary
    expect(getByText('Tóm tắt là bắt buộc')).toBeInTheDocument()
  })

  it('calls onSave when Save button is clicked', async () => {
    const onSaveMock = vi.fn()
    const { getByText } = render(ContextEditorViewer, {
      props: {
        data: mockData,
        mode: 'edit',
        onSave: onSaveMock,
        onCancel: vi.fn(),
      },
    })

    await fireEvent.click(getByText('Lưu'))
    expect(onSaveMock).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancelMock = vi.fn()
    const { getByText } = render(ContextEditorViewer, {
      props: {
        data: mockData,
        mode: 'edit',
        onSave: vi.fn(),
        onCancel: onCancelMock,
      },
    })

    await fireEvent.click(getByText('Hủy'))
    expect(onCancelMock).toHaveBeenCalledOnce()
  })

  it('sanitizes rich content before rendering it as HTML', () => {
    const { container, getByText } = render(ContextEditorViewer, {
      props: {
        data: {
          ...mockData,
          richContent:
            '<p onclick="alert(1)">Safe content</p><script>alert(2)</script><a href="javascript:alert(3)">link</a>',
        },
        mode: 'view',
        onSave: vi.fn(),
        onCancel: vi.fn(),
      },
    })

    expect(getByText('Safe content')).toBeInTheDocument()
    expect(container.querySelector('script')).not.toBeInTheDocument()
    expect(container.querySelector('[onclick]')).not.toBeInTheDocument()
    expect(container.querySelector('a[href^="javascript:"]')).not.toBeInTheDocument()
  })

  it('rejects external protocol-relative links and unwraps unsupported markup', () => {
    const { container } = render(ContextEditorViewer, {
      props: {
        data: {
          ...mockData,
          richContent:
            '<iframe src="//attacker.invalid/frame">embedded</iframe><a href="//attacker.invalid">external</a><mark>plain text</mark>',
        },
        mode: 'view',
        onSave: vi.fn(),
        onCancel: vi.fn(),
      },
    })

    expect(container.textContent).toContain('embedded')
    expect(container.textContent).toContain('plain text')
    expect(container.querySelector('iframe')).not.toBeInTheDocument()
    expect(container.querySelector('a')).not.toHaveAttribute('href')
    expect(container.querySelector('mark')).not.toBeInTheDocument()
  })
})
