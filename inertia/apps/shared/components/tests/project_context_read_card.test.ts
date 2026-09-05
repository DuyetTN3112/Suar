import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProjectContextReadCard from '../project_context_read_card.svelte'

describe('ProjectContextReadCard', () => {
  it('renders the active version and sanitized readable content', () => {
    const { container, getByRole, getByText } = render(ProjectContextReadCard, {
      props: {
        projectContext: {
          active_version_id: 'context-version-2',
          active_version_number: 2,
          context: {
            id: 'context-version-2',
            version_number: 2,
            title: 'Checkout reliability',
            summary: 'The team owns checkout reliability.',
            rich_content: '<p>Keep retries observable.</p><script>alert(1)</script>',
            plain_text_projection: 'Keep retries observable.',
            active_from: '2026-08-01T00:00:00.000Z',
            retired_at: null,
            privacy_classification: 'internal',
            created_at: '2026-08-01T00:00:00.000Z',
          },
        },
      },
    })

    expect(getByRole('heading', { name: 'Checkout reliability' })).toBeInTheDocument()
    expect(getByText(/Version 2/)).toBeInTheDocument()
    expect(getByText('Keep retries observable.')).toBeInTheDocument()
    expect(container.querySelector('script')).not.toBeInTheDocument()
  })

  it('renders an explicit empty state when no active context exists', () => {
    const { getByText } = render(ProjectContextReadCard, {
      props: { projectContext: null },
    })

    expect(getByText('No active Project Context')).toBeInTheDocument()
  })
})
