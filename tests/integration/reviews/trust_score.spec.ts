import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  UserSkillFactory,
  SkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import User from '#models/user'
import {
  calculateRawScore,
  determineTier,
  calculateWeightedTrustScore,
} from '#actions/reviews/rules/review_formulas'

test.group('Integration | Trust Score', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('raw score is average of avg_percentages', async ({ assert }) => {
    const result = calculateRawScore([50, 60, 70])
    assert.equal(result, 60)
  })

  test('partner tier weight is 1.0', async ({ assert }) => {
    const { tierWeight, tierCode } = determineTier(true, true)
    assert.equal(tierWeight, 1.0)
    assert.equal(tierCode, 'partner')
  })

  test('organization tier weight is 0.8', async ({ assert }) => {
    const { tierWeight, tierCode } = determineTier(true, false)
    assert.equal(tierWeight, 0.8)
    assert.equal(tierCode, 'organization')
  })

  test('community tier weight is 0.5', async ({ assert }) => {
    const { tierWeight, tierCode } = determineTier(false, false)
    assert.equal(tierWeight, 0.5)
    assert.equal(tierCode, 'community')
  })

  test('trust_data JSONB update on user', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create()
    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      avg_percentage: 60,
    })

    const rawScore = calculateRawScore([60])
    const { tierCode, tierWeight } = determineTier(false, false)
    const calculatedScore = calculateWeightedTrustScore(rawScore, tierWeight)

    await user
      .merge({
        trust_data: {
          current_tier_code: tierCode,
          calculated_score: calculatedScore,
          raw_score: rawScore,
          total_verified_reviews: 1,
          last_calculated_at: new Date().toISOString(),
        },
      })
      .save()

    const updated = await User.findOrFail(user.id)
    assert.isNotNull(updated.trust_data)
    assert.equal(updated.trust_data?.current_tier_code, 'community')
    assert.equal(updated.trust_data?.raw_score, 60)
    assert.equal(updated.trust_data?.calculated_score, calculatedScore)
  })
})
