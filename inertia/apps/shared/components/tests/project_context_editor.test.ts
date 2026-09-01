import { fireEvent, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ProjectContextEditor from '../project_context_editor.svelte'

const { post } = vi.hoisted(() => ({
  post: vi.fn(),
}))

vi.mock('axios', () => ({
  default: { post },
}))

describe('ProjectContextEditor', () => {
  it('publishes a new context with the expected active-version fence', async () => {
    post.mockResolvedValueOnce({
      data: {
        contextVersion: {
          id: 'context-version-1',
          versionNumber: 1,
        },
      },
    })
    const onPublished = vi.fn()
    const { getByRole, getByLabelText, getByText } = render(ProjectContextEditor, {
      props: {
        projectId: 'project-1',
        projectContext: null,
        canEdit: true,
        onPublished,
      },
    })

    await fireEvent.click(getByRole('button', { name: 'Create Project Context' }))
    await fireEvent.input(getByLabelText('Title'), { target: { value: 'Checkout reliability' } })
    await fireEvent.input(getByLabelText('Summary'), {
      target: { value: 'The team owns checkout reliability.' },
    })
    await fireEvent.input(getByLabelText('Plain-text projection'), {
      target: { value: 'Keep retries observable.' },
    })
    await fireEvent.input(getByLabelText('Rich content'), {
      target: { value: '<p>Keep retries observable.</p>' },
    })
    await fireEvent.click(getByRole('button', { name: 'Publish context' }))

    expect(post).toHaveBeenCalledWith('/api/v1/projects/project-1/context-versions', {
      expectedActiveVersionId: null,
      title: 'Checkout reliability',
      summary: 'The team owns checkout reliability.',
      plainTextProjection: 'Keep retries observable.',
      richContent: '<p>Keep retries observable.</p>',
      structuredDefaults: {},
      supportingReferences: [],
      confirmed: true,
      changeClass: 'initial',
      changeReason: null,
      privacyClassification: 'internal',
    })
    expect(onPublished).toHaveBeenCalledWith({ id: 'context-version-1', versionNumber: 1 })
    expect(getByText('Project Context published.')).toBeInTheDocument()
  })

  it('does not expose editing controls without permission', () => {
    const { queryByRole } = render(ProjectContextEditor, {
      props: {
        projectId: 'project-1',
        projectContext: null,
        canEdit: false,
      },
    })

    expect(queryByRole('button', { name: 'Create Project Context' })).not.toBeInTheDocument()
  })

  it('keeps the draft and offers an explicit reload after a version conflict', async () => {
    post.mockRejectedValueOnce({ response: { status: 409 } })
    post.mockResolvedValueOnce({
      data: {
        contextVersion: {
          id: 'context-version-2',
          versionNumber: 2,
        },
      },
    })
    const onConflict = vi.fn(({ onSuccess }: { onSuccess: () => void }) => onSuccess())
    const { getByRole, getByLabelText, getByText, rerender } = render(ProjectContextEditor, {
      props: {
        projectId: 'project-1',
        projectContext: null,
        canEdit: true,
        onConflict,
      },
    })

    await fireEvent.click(getByRole('button', { name: 'Create Project Context' }))
    await fireEvent.input(getByLabelText('Title'), { target: { value: 'Draft title' } })
    await fireEvent.input(getByLabelText('Summary'), { target: { value: 'Draft summary' } })
    await fireEvent.input(getByLabelText('Plain-text projection'), { target: { value: 'Draft text' } })
    await fireEvent.click(getByRole('button', { name: 'Publish context' }))

    expect(getByText('Project Context changed. Reload before publishing again.')).toBeInTheDocument()
    await fireEvent.click(getByRole('button', { name: 'Reload Project Context' }))
    expect(onConflict).toHaveBeenCalledOnce()
    expect(getByLabelText('Title')).toHaveValue('Draft title')

    await rerender({
      projectId: 'project-1',
      projectContext: {
        active_version_id: 'context-version-2',
        active_version_number: 2,
        context: {
          id: 'context-version-2',
          version_number: 2,
          title: 'Remote context',
          summary: 'Remote summary',
          rich_content: '',
          plain_text_projection: 'Remote text',
          active_from: '2026-08-02T00:00:00.000Z',
          retired_at: null,
          privacy_classification: 'internal',
          created_at: '2026-08-02T00:00:00.000Z',
        },
      },
      canEdit: true,
      onConflict,
    })
    expect(getByText('Remote active version: 2')).toBeInTheDocument()
    await fireEvent.click(getByRole('button', { name: 'Publish context' }))
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/projects/project-1/context-versions',
      expect.objectContaining({ expectedActiveVersionId: 'context-version-2' })
    )
  })

  it('keeps the draft when reloading the remote context fails', async () => {
    post.mockRejectedValueOnce({ response: { status: 409 } })
    const onConflict = vi.fn(({ onError }: { onError: () => void }) => onError())
    const { getByRole, getByLabelText, getByText } = render(ProjectContextEditor, {
      props: {
        projectId: 'project-1',
        projectContext: null,
        canEdit: true,
        onConflict,
      },
    })

    await fireEvent.click(getByRole('button', { name: 'Create Project Context' }))
    await fireEvent.input(getByLabelText('Title'), { target: { value: 'Retained title' } })
    await fireEvent.input(getByLabelText('Summary'), { target: { value: 'Retained summary' } })
    await fireEvent.input(getByLabelText('Plain-text projection'), { target: { value: 'Retained text' } })
    await fireEvent.click(getByRole('button', { name: 'Publish context' }))
    await fireEvent.click(getByRole('button', { name: 'Reload Project Context' }))

    expect(getByText('Unable to reload Project Context. Your draft is still here.')).toBeInTheDocument()
    expect(getByLabelText('Title')).toHaveValue('Retained title')
  })
})
