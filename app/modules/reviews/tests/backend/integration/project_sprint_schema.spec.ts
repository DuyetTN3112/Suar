import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ProjectSprint from '#modules/reviews/infra/models/project_sprint'
import SprintEnvironmentReview from '#modules/reviews/infra/models/sprint_environment_review'
import SprintManagerReview from '#modules/reviews/infra/models/sprint_manager_review'
import SprintReviewPackage from '#modules/reviews/infra/models/sprint_review_package'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Project sprint review schema', (group) => {
  group.setup(async () => {
    await setupApp()
    await cleanupTestData()
  })
  group.teardown(async () => {
    await cleanupTestData()
    await teardownApp()
  })

  test('review workflow board tables keep relationship and rule checks in application code', async ({
    assert,
  }) => {
    const rows = (await db
      .from('pg_constraint as c')
      .join('pg_class as t', 't.oid', 'c.conrelid')
      .whereIn('t.relname', [
        'task_review_workflows',
        'task_review_reviewers',
        'task_review_messages',
        'sprint_reverse_review_workflows',
        'sprint_reverse_review_messages',
      ])
      .whereIn('c.contype', ['f', 'u', 'c'])
      .select('t.relname as table_name', 'c.conname as constraint_name', 'c.contype')) as Array<{
      table_name: string
      constraint_name: string
      contype: string
    }>

    assert.deepEqual(rows, [])
  })

  test('persists project sprint review package with manager and environment reviews', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const manager = await UserFactory.create({ current_organization_id: org.id })
    const sprintId = testId()
    const packageId = testId()

    const sprint = await ProjectSprint.create({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: 'Schema Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })

    const reviewPackage = await SprintReviewPackage.create({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'pending',
      submitted_at: null,
    })

    const managerReview = await SprintManagerReview.create({
      id: testId(),
      package_id: reviewPackage.id,
      target_user_id: manager.id,
      target_role: 'manager',
      rating: 5,
      dimensions: { clarity: 5, fairness: 4 },
      comment: 'Clear priorities and useful feedback.',
      is_anonymous_to_target: true,
    })

    const projectEnvironmentReview = await SprintEnvironmentReview.create({
      id: testId(),
      package_id: reviewPackage.id,
      target_type: 'project',
      target_id: project.id,
      rating: 4,
      dimensions: { process: 4, safety: 4 },
      comment: 'Project flow was clear.',
      is_anonymous_publicly: true,
    })

    const organizationEnvironmentReview = await SprintEnvironmentReview.create({
      id: testId(),
      package_id: reviewPackage.id,
      target_type: 'organization',
      target_id: org.id,
      rating: 3,
      dimensions: { culture: 3, support: 4 },
      comment: 'Organization support was acceptable.',
      is_anonymous_publicly: true,
    })

    assert.equal(sprint.organization_id, org.id)
    assert.equal(reviewPackage.sprint_id, sprint.id)
    assert.equal(managerReview.target_user_id, manager.id)
    assert.equal(projectEnvironmentReview.target_type, 'project')
    assert.equal(organizationEnvironmentReview.target_type, 'organization')

    const packageCount = await SprintReviewPackage.query().where('sprint_id', sprint.id).count('* as total')
    assert.equal(Number(packageCount[0]?.$extras['total'] ?? 0), 1)
  })
})
