import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { getProjectDetail } from '#composition/project_detail_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Project detail sprint environment reviews', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('project detail recent reverse reviews include sprint project environment reviews', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Project Env Signal',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })

    const sprintId = testId()
    const packageId = testId()
    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: 'Env Sprint',
      status: 'review_closed',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z').toSQL(),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z').toSQL(),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z').toSQL(),
      review_closed_at: DateTime.fromISO('2026-07-15T01:00:00.000Z').toSQL(),
      created_at: DateTime.fromISO('2026-07-01T00:00:00.000Z').toSQL(),
      updated_at: DateTime.fromISO('2026-07-15T01:00:00.000Z').toSQL(),
    })
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprintId,
      reviewer_id: reviewer.id,
      status: 'submitted',
      submitted_at: '2026-07-14T02:00:00.000Z',
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    await db.table('sprint_environment_reviews').insert({
      id: testId(),
      package_id: packageId,
      target_type: 'project',
      target_id: project.id,
      rating: 4,
      dimensions: JSON.stringify({ process: 4 }),
      comment: 'Sprint project environment felt safe.',
      is_anonymous_publicly: true,
      created_at: '2026-07-14T02:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })

    const result = await getProjectDetail(
      { projectId: project.id, organizationId: org.id },
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '127.0.0.1',
        userAgent: 'test',
      }
    )

    assert.lengthOf(result.project_reverse_reviews.recent, 1)
    const [recentReview] = result.project_reverse_reviews.recent
    assert.exists(recentReview)
    if (!recentReview) return
    assert.equal(recentReview.rating, 4)
    assert.equal(
      recentReview.comment,
      'Sprint project environment felt safe.'
    )
    assert.isTrue(recentReview.is_anonymous)
  })
})
