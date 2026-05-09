import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/packages/actions/action_context'
import { AdminSubscriptionRepository } from '#modules/admin/packages/actions/ports/outbound/packages/admin_operational_repository'
import GetSubscriptionQrCatalogQuery from '#modules/admin/packages/actions/queries/packages/get_subscription_qr_catalog_query'
import FlaggedReview from '#modules/reviews/infra/models/review-core/flagged_review'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  FlaggedReviewFactory,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface UserSubscriptionRow {
  plan: string
  status: string
  auto_renew: boolean
  expires_at: string | null
}

let adminSubscriptions: AdminSubscriptionRepository

test.group('Integration | Admin API standardization', (group) => {
  group.setup(async () => {
    const app = await setupApp()
    adminSubscriptions = await app.container.make(AdminSubscriptionRepository)
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createFlaggedReviewScenario() {
    const superadmin = await UserFactory.createSuperadmin()
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const reviewSession = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      manager_review_completed: true,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
    })
    const skill = await SkillFactory.create()
    const skillReview = await SkillReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'peer',
      skill_id: skill.id,
      comment: 'Same score pattern on every review',
    })
    const flaggedReview = await FlaggedReviewFactory.create({
      skill_review_id: skillReview.id,
      flag_type: 'bulk_same_level',
      severity: 'high',
      status: 'pending',
    })

    return { superadmin, flaggedReview }
  }

  test('package update JSON route accepts camelCase fields and returns 204', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create()
    const subscriptionId = testId()

    await db.table('user_subscriptions').insert({
      id: subscriptionId,
      user_id: user.id,
      plan: 'pro',
      status: 'active',
      auto_renew: true,
      started_at: new Date().toISOString(),
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const response = await client
      .put(`/admin/packages/${subscriptionId}`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({
        plan: 'promax',
        status: 'cancelled',
        autoRenew: false,
        expiresAt: '2026-12-31T00:00:00.000Z',
      })

    response.assertStatus(204)

    const updatedRows = await db
      .from('user_subscriptions')
      .where('id', subscriptionId)
      .select('plan', 'status', 'auto_renew', 'expires_at')
    const updated = updatedRows[0] as UserSubscriptionRow | undefined

    if (!updated) {
      throw new Error(`Subscription ${subscriptionId} not found after update`)
    }
    assert.equal(updated.plan, 'enterprise')
    assert.equal(updated.status, 'cancelled')
    assert.equal(updated.auto_renew, false)
    if (!updated.expires_at) {
      throw new Error('Expected expires_at to be set after package update')
    }
    assert.equal(new Date(updated.expires_at).toISOString(), '2026-12-31T00:00:00.000Z')
  })

  test('package update JSON route rejects invalid plan and status without mutating subscription', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create()
    const subscriptionId = testId()

    await db.table('user_subscriptions').insert({
      id: subscriptionId,
      user_id: user.id,
      plan: 'pro',
      status: 'active',
      auto_renew: true,
      started_at: new Date().toISOString(),
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const response = await client
      .put(`/admin/packages/${subscriptionId}`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({
        plan: 'not-a-plan',
        status: 'not-a-status',
        autoRenew: false,
      })

    response.assertStatus(422)

    const unchanged = (await db
      .from('user_subscriptions')
      .where('id', subscriptionId)
      .select('plan', 'status', 'auto_renew')
      .first()) as Pick<UserSubscriptionRow, 'plan' | 'status' | 'auto_renew'> | undefined

    assert.deepEqual(unchanged, {
      plan: 'pro',
      status: 'active',
      auto_renew: true,
    })
  })

  test('package routes deny non-admin and guest access without leaking or mutating subscriptions', async ({
    assert,
    client,
  }) => {
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const subscribedUser = await UserFactory.create()
    const subscriptionId = testId()

    await db.table('user_subscriptions').insert({
      id: subscriptionId,
      user_id: subscribedUser.id,
      plan: 'pro',
      status: 'active',
      auto_renew: true,
      started_at: new Date().toISOString(),
      expires_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const regularListResponse = await client.get('/admin/packages').loginAs(regularUser)
    const regularQrResponse = await client.get('/admin/qr-codes').loginAs(regularUser)
    const regularUpdateResponse = await client
      .put(`/admin/packages/${subscriptionId}`)
      .loginAs(regularUser)
      .header('accept', 'application/json')
      .json({
        plan: 'promax',
        status: 'cancelled',
        autoRenew: false,
      })
    const guestListResponse = await client.get('/admin/packages').redirects(0)
    const guestUpdateResponse = await client
      .put(`/admin/packages/${subscriptionId}`)
      .header('accept', 'application/json')
      .json({
        plan: 'promax',
        status: 'cancelled',
        autoRenew: false,
      })

    regularListResponse.assertStatus(403)
    regularQrResponse.assertStatus(403)
    regularUpdateResponse.assertStatus(403)
    guestListResponse.assertStatus(401)
    guestUpdateResponse.assertStatus(401)

    for (const response of [
      regularListResponse,
      regularQrResponse,
      regularUpdateResponse,
      guestListResponse,
      guestUpdateResponse,
    ]) {
      assert.notInclude(response.text(), subscriptionId)
      assert.notInclude(response.text(), subscribedUser.email ?? '')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }

    const unchanged = (await db
      .from('user_subscriptions')
      .where('id', subscriptionId)
      .select('plan', 'status', 'auto_renew')
      .first()) as Pick<UserSubscriptionRow, 'plan' | 'status' | 'auto_renew'> | undefined

    assert.deepEqual(unchanged, {
      plan: 'pro',
      status: 'active',
      auto_renew: true,
    })
  })

  test('subscription QR catalog returns payment config, plan references, and subscription stats', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const proUser = await UserFactory.create()
    const enterpriseUser = await UserFactory.create()

    await db.table('user_subscriptions').insert([
      {
        id: testId(),
        user_id: proUser.id,
        plan: 'pro',
        status: 'active',
        auto_renew: true,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: testId(),
        user_id: enterpriseUser.id,
        plan: 'enterprise',
        status: 'cancelled',
        auto_renew: false,
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    const result = await new GetSubscriptionQrCatalogQuery(
      makeSystemAdminActionContext(superadmin.id),
      adminSubscriptions
    ).handle()

    assert.deepEqual(
      result.plans.map((plan) => ({
        id: plan.id,
        storagePlan: plan.storagePlan,
        paymentContentPrefix: plan.paymentContentPrefix,
      })),
      [
        { id: 'pro', storagePlan: 'pro', paymentContentPrefix: 'SUAR PRO' },
        { id: 'promax', storagePlan: 'enterprise', paymentContentPrefix: 'SUAR PROMAX' },
      ]
    )
    assert.equal(result.paymentConfig.bankCode.length, 6)
    assert.isAtLeast(result.paymentConfig.bankAccountNumber.length, 1)
    assert.isAtLeast(result.paymentConfig.bankAccountName.length, 1)
    assert.deepInclude(result.stats, {
      total: 2,
      active: 1,
      cancelled: 1,
      expiringSoon: 1,
    })
    assert.deepInclude(result.stats.byPlan, {
      pro: 1,
      enterprise: 1,
    })
  })

  test('flagged review resolve JSON route returns 204 and persists resolution', async ({
    assert,
    client,
  }) => {
    const { superadmin, flaggedReview } = await createFlaggedReviewScenario()

    const response = await client
      .put(`/admin/reviews/${flaggedReview.id}/resolve`)
      .loginAs(superadmin)
      .header('accept', 'application/json')
      .json({
        action: 'dismiss',
        notes: 'Resolved from admin API test',
      })

    response.assertStatus(204)

    const refreshed = await FlaggedReview.findOrFail(flaggedReview.id)
    assert.equal(refreshed.status, 'dismissed')
    assert.equal(refreshed.reviewed_by, superadmin.id)
    assert.equal(refreshed.notes, 'Resolved from admin API test')
    assert.isNotNull(refreshed.reviewed_at)
  })
})
