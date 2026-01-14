import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import {
  EmptyState,
  KANBAN_LANE_TOKENS,
  LEVEL_SCALE_TOKENS,
  PRIORITY_TOKENS,
  PageHeader,
  UserChip,
  formatDate,
  formatRelative,
  levelScaleKey,
  levelScaleToken,
} from '../ui'

describe('shared UI primitives', () => {
  it('exports EmptyState with accessible copy', () => {
    render(EmptyState, {
      props: {
        eyebrow: 'No data',
        title: 'Nothing to review',
        description: 'New evidence will appear here after the next sync.',
      },
    })

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nothing to review' })).toBeInTheDocument()
    expect(screen.getByText('New evidence will appear here after the next sync.')).toBeInTheDocument()
  })

  it('exports PageHeader with title, description and meta copy', () => {
    render(PageHeader, {
      props: {
        eyebrow: 'Evidence',
        title: 'Frontend audit',
        description: 'A compact shell header for user, organization and admin pages.',
        meta: 'P1.6',
      },
    })

    expect(screen.getByTestId('page-header')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Frontend audit' })).toBeInTheDocument()
    expect(screen.getByText('P1.6')).toBeInTheDocument()
  })

  it('exports UserChip with initials fallback and supporting text', () => {
    render(UserChip, {
      props: {
        name: 'Ngoc Duyet',
        email: 'duyet@example.com',
      },
    })

    expect(screen.getByTestId('user-chip')).toHaveTextContent('ND')
    expect(screen.getByText('Ngoc Duyet')).toBeInTheDocument()
    expect(screen.getByText('duyet@example.com')).toBeInTheDocument()
  })

  it('exports stable date and relative date formatters', () => {
    expect(formatDate('2026-07-26T08:30:00.000Z', { month: 'short', day: '2-digit', year: 'numeric' }, 'en-US')).toBe(
      'Jul 26, 2026'
    )
    expect(formatDate('not-a-date')).toBe('—')
    expect(formatRelative('2026-07-26T09:30:00.000Z', '2026-07-26T08:30:00.000Z', 'en-US')).toBe('in 1 hour')
    expect(formatRelative('2026-07-25T08:30:00.000Z', '2026-07-26T08:30:00.000Z', 'en-US')).toBe('yesterday')
  })

  it('exports token maps for kanban lanes, priority and L0-L14 levels', () => {
    expect(KANBAN_LANE_TOKENS.in_progress.surfaceClass).toContain('primary')
    expect(PRIORITY_TOKENS.urgent.badgeClass).toContain('destructive')
    expect(Object.keys(LEVEL_SCALE_TOKENS)).toHaveLength(15)
    expect(levelScaleKey(-5)).toBe('L0')
    expect(levelScaleKey(14.4)).toBe('L14')
    expect(levelScaleToken(8).label).toBe('L8')
  })
})
