import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import ProfileSnapshotPanel from '@/apps/user/modules/profile/components/profile_snapshot_panel.svelte'

describe('ProfileSnapshotPanel', () => {
  it('renders current snapshot controls and metadata from the active snapshot', () => {
    render(ProfileSnapshotPanel, {
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
          summary: {
            total_verified_skills: 2,
          },
          skills_verified: [
            {
              skill_id: 'skill-1',
              skill_name: 'PostgreSQL',
              verified_public_proficiency_code: 'l8',
              total_reviews: 1,
              avg_percentage: 82,
              avg_score: 82,
              last_reviewed_at: '2026-07-01T10:00:00.000Z',
            },
            {
              skill_id: 'skill-2',
              skill_name: 'Communication',
              verified_public_proficiency_code: 'l10',
              total_reviews: 3,
              avg_percentage: 88,
              avg_score: 88,
              last_reviewed_at: '2026-07-02T10:00:00.000Z',
            },
          ],
          work_highlights: [
            {
              task_assignment_id: 'assignment-1',
              task_id: 'task-1',
              task_title: 'Internal dashboard cleanup',
              task_type: 'feature',
              business_domain: 'saas',
              problem_category: 'maintenance',
              role_in_task: 'contributor',
              collaboration_type: 'solo',
              difficulty: 'medium',
              overall_quality_score: 82,
              was_on_time: true,
              completed_at: '2026-07-01T10:00:00.000Z',
            },
          ],
          performance_metrics: null,
          trust_metrics: null,
          scoring_version: 'v1',
          created_at: '2026-07-03T10:00:00.000Z',
          updated_at: '2026-07-03T10:00:00.000Z',
        },
      },
    })

    expect(screen.getByText('Package current profile')).toBeInTheDocument()
    expect(screen.getByText('Current snapshot')).toBeInTheDocument()
    expect(screen.getByText('Q3 Snapshot')).toBeInTheDocument()
    expect(screen.getByText('Version:')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Scoring version:')).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
    expect(screen.getByText('Sharing access')).toBeInTheDocument()
    expect(screen.getByText('Off')).toBeInTheDocument()
    expect(screen.getByText('Snapshot history')).toBeInTheDocument()
    expect(screen.getByText('0 recent versions')).toBeInTheDocument()
  })
})
