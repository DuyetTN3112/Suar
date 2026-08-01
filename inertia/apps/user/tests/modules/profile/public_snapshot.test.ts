import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import PublicSnapshotPage from '@/apps/user/modules/profile/public_snapshot.svelte'

describe('PublicSnapshotPage', () => {
  it('renders a public profile snapshot artifact without exposing share tokens', () => {
    const { container } = render(PublicSnapshotPage, {
      props: {
        snapshot: {
          id: 'snapshot-1',
          userId: 'user-1',
          version: 2,
          snapshotName: 'Public snapshot',
          isCurrent: true,
          isPublic: true,
          shareableSlug: 'public-owner-snapshot',
          summary: {
            totalVerifiedSkills: 4,
          },
          skillsVerified: [
            {
              skillName: 'Node.js',
              verifiedPublicProficiencyCode: 'l8',
              totalReviews: 3,
              avgPercentage: 86,
            },
          ],
          workHighlights: [
            {
              taskTitle: 'Internal dashboard cleanup',
              overallQualityScore: 91,
              wasOnTime: true,
              completedAt: '2026-07-03T10:00:00.000Z',
            },
          ],
          performanceMetrics: {
            totalTasksCompleted: 9,
          },
          trustMetrics: {
            currentTierCode: 'platinum',
          },
          scoringVersion: 'v3',
          createdAt: '2026-07-03T10:00:00.000Z',
          updatedAt: '2026-07-03T10:00:00.000Z',
        },
      },
    })

    expect(screen.getByRole('heading', { name: 'Public snapshot' })).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText(/platinum/i)).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('Internal dashboard cleanup')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/public-secret|shareableToken|token=/i)
  })
})
