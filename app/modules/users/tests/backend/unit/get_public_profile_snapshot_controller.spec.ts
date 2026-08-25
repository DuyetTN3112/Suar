import { test } from '@japa/runner'

import { userProfileActionFactory } from '#composition/users/user-factories/user_action_factory'
import GetPublicProfileSnapshotQuery from '#modules/users/actions/queries/profile/get_public_profile_snapshot_query'
import GetPublicProfileSnapshotController from '#modules/users/controllers/profile/get_public_profile_snapshot_controller'

test.group('Unit | GetPublicProfileSnapshotController', () => {
  test('renders the public snapshot as an inertia page', async ({ assert }) => {
    const originalHandle = Reflect.get(GetPublicProfileSnapshotQuery.prototype, 'handle')
    let renderCall: { component: string; props: Record<string, unknown> } | null = null

    GetPublicProfileSnapshotQuery.prototype.handle = function handle() {
      return Promise.resolve({
        snapshot: {
          version: 2,
          snapshot_name: 'Public snapshot',
          is_current: true,
          is_public: true,
          shareable_slug: 'public-owner-snapshot',
          shareable_token: null,
          summary: { total_verified_skills: 4 },
          skills_verified: [],
          work_highlights: [],
          performance_metrics: { total_tasks_completed: 9 },
          trust_metrics: { current_tier_code: 'platinum' },
          scoring_version: 'v3',
          created_at: '2026-07-03T10:00:00.000Z',
          updated_at: '2026-07-03T10:00:00.000Z',
        },
      })
    }

    try {
      const controller = new GetPublicProfileSnapshotController(userProfileActionFactory)
      const ctx = {
        params: {
          slug: 'public-owner-snapshot',
        },
        request: {
          input() {
            return null
          },
          ip() {
            return '127.0.0.1'
          },
          header() {
            return null
          },
        },
        auth: {
          user: null,
        },
        session: {
          get() {
            return null
          },
        },
        inertia: {
          render(component: string, props: Record<string, unknown>) {
            renderCall = { component, props }
            return { component, props }
          },
        },
      }

      const response = await controller.handle(ctx as never)

      assert.deepEqual(response, {
        component: 'profile/public_snapshot',
        props: {
          snapshot: {
            version: 2,
            snapshotName: 'Public snapshot',
            isCurrent: true,
            isPublic: true,
            shareableSlug: 'public-owner-snapshot',
            summary: { totalVerifiedSkills: 4 },
            skillsVerified: [],
            workHighlights: [],
            performanceMetrics: { totalTasksCompleted: 9 },
            trustMetrics: { currentTierCode: 'platinum' },
            scoringVersion: 'v3',
            createdAt: '2026-07-03T10:00:00.000Z',
            updatedAt: '2026-07-03T10:00:00.000Z',
          },
        },
      })
      assert.deepEqual(renderCall, response)
    } finally {
      GetPublicProfileSnapshotQuery.prototype.handle = originalHandle
    }
  })
})
