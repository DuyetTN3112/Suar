import { render, screen } from '@testing-library/svelte'
import axios from 'axios'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const mod = await import('../../shared/fixtures/layout_mock.svelte')
  return { default: mod.default }
})

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import ProfileSnapshotsPage from '@/apps/user/modules/profile/snapshots.svelte'

const mockedAxios = vi.mocked(axios)

describe('ProfileSnapshotsPage', () => {
  it('renders snapshot management as a full page with history controls', () => {
    mockedAxios.get.mockResolvedValue({ data: { data: [] } })

    render(ProfileSnapshotsPage, {
      props: {
        currentSnapshot: {
          id: 'snapshot-1',
          user_id: 'user-1',
          version: 3,
          snapshot_name: 'Q3 Snapshot',
          is_current: true,
          is_public: false,
          shareable_slug: null,
          shareable_token: null,
          summary: null,
          skills_verified: [],
          work_highlights: [],
          performance_metrics: null,
          trust_metrics: null,
          scoring_version: 'v1',
          created_at: '2026-07-03T10:00:00.000Z',
          updated_at: '2026-07-03T10:00:00.000Z',
        },
      },
    })

    expect(screen.getByRole('heading', { name: /Profile snapshots|Snapshot hồ sơ/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to profile|Quay lại hồ sơ/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/profile')
    )
    expect(screen.getByText('Q3 Snapshot')).toBeInTheDocument()
    expect(screen.getByText(/Lịch sử snapshot|Snapshot history/i)).toBeInTheDocument()
  })
})
