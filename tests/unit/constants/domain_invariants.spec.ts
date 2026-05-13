import { test } from '@japa/runner'

import { REVIEW_DEFAULTS } from '#modules/reviews/constants/review_constants'
import {
  DEFAULT_TASK_STATUSES,
  DEFAULT_WORKFLOW_TRANSITIONS,
  TaskStatusCategory,
  TERMINAL_STATUS_CATEGORIES,
} from '#modules/tasks/constants/task_constants'
import {
  AuthMethod,
  OAuthProvider,
  ProficiencyLevel,
  proficiencyLevelOptions,
  SkillCategoryCode,
  skillCategoryOptions,
} from '#modules/users/constants/user_constants'

test.group('Domain invariants | Constants', () => {
  test('auth and review defaults stay aligned with supported identity and scoring bounds', ({
    assert,
  }) => {
    assert.deepEqual(Object.values(AuthMethod).sort(), ['github', 'google'])
    assert.deepEqual(Object.values(OAuthProvider).sort(), Object.values(AuthMethod).sort())
    assert.equal(REVIEW_DEFAULTS.MIN_PEER_REVIEWS, 2)
    assert.isAtLeast(REVIEW_DEFAULTS.INITIAL_CREDIBILITY_SCORE, 0)
    assert.isAtMost(
      REVIEW_DEFAULTS.INITIAL_CREDIBILITY_SCORE,
      REVIEW_DEFAULTS.MAX_CREDIBILITY_SCORE
    )
    assert.equal(REVIEW_DEFAULTS.MIN_RATING, 1)
    assert.equal(REVIEW_DEFAULTS.MAX_RATING, 5)
  })

  test('proficiency and skill category options cover every declared value exactly once', ({
    assert,
  }) => {
    assert.deepEqual(
      proficiencyLevelOptions.map((option) => option.value),
      Object.values(ProficiencyLevel)
    )
    assert.deepEqual(
      skillCategoryOptions.map((option) => option.value).sort(),
      Object.values(SkillCategoryCode).sort()
    )

    for (const [index, current] of proficiencyLevelOptions.entries()) {
      assert.isBelow(current.minPercentage, current.maxPercentage)
      const next = proficiencyLevelOptions[index + 1]
      if (next) {
        assert.equal(current.maxPercentage, next.minPercentage)
        assert.isBelow(current.order, next.order)
      }
    }

    const deliveryOption = skillCategoryOptions.find(
      (option) => option.value === SkillCategoryCode.DELIVERY
    )
    const technicalOption = skillCategoryOptions.find(
      (option) => option.value === SkillCategoryCode.TECHNICAL
    )

    assert.equal(deliveryOption?.displayType, 'list')
    assert.equal(technicalOption?.displayType, 'spider_chart')
  })

  test('default task statuses and workflow transitions preserve one canonical todo and the core terminal graph', ({
    assert,
  }) => {
    const defaultStatuses = DEFAULT_TASK_STATUSES.filter((status) => status.is_default)
    assert.lengthOf(defaultStatuses, 1)
    assert.equal(defaultStatuses[0]?.slug, 'todo')
    assert.equal(defaultStatuses[0]?.category, TaskStatusCategory.TODO)
    assert.deepEqual(
      new Set(DEFAULT_TASK_STATUSES.map((status) => status.slug)).size,
      DEFAULT_TASK_STATUSES.length
    )
    assert.deepEqual(
      new Set(DEFAULT_TASK_STATUSES.map((status) => status.sort_order)).size,
      DEFAULT_TASK_STATUSES.length
    )
    const edges = DEFAULT_WORKFLOW_TRANSITIONS.map(
      (transition) => `${transition.from_slug}->${transition.to_slug}`
    )

    assert.include(edges, 'todo->in_progress')
    assert.include(edges, 'in_progress->done_dev')
    assert.include(edges, 'in_testing->done')
    assert.include(edges, 'cancelled->todo')
    assert.deepEqual(
      [...TERMINAL_STATUS_CATEGORIES].sort(),
      [TaskStatusCategory.CANCELLED, TaskStatusCategory.DONE].sort()
    )
  })
})
