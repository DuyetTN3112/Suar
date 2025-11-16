import { test } from '@japa/runner'

import {
  DISPUTE_SCENARIO_SPECS,
  EXPECTED_DISPUTE_REVIEW_TYPES,
} from '../../../../../seed/demo_data/dispute_scenario_specs.js'
import {
  getSeededTaskSpecs,
  getTaskRequiredSkillCategory,
} from '../../../../../seed/demo_data/task_specs.js'

test.group('Seed dispute scenario specs', () => {
  test('cover all dispute review types', ({ assert }) => {
    const presentTypes = new Set(DISPUTE_SCENARIO_SPECS.map((scenario) => scenario.reviewType))

    for (const reviewType of EXPECTED_DISPUTE_REVIEW_TYPES) {
      assert.isTrue(presentTypes.has(reviewType), `missing ${reviewType}`)
    }
  })

  test('declare hierarchy and party context for every scenario', ({ assert }) => {
    for (const scenario of DISPUTE_SCENARIO_SPECS) {
      assert.isNotEmpty(scenario.organization)
      assert.isNotEmpty(scenario.project)
      assert.isNotEmpty(scenario.primaryTask)
      assert.isAtLeast(scenario.relatedTasks.length, 1)
      assert.isNotEmpty(scenario.taskGiver)
      assert.isNotEmpty(scenario.worker)
      assert.isNotEmpty(scenario.counterparty)
    }
  })

  test('reference existing task specs with all four required skill categories', ({ assert }) => {
    const taskSpecs = getSeededTaskSpecs({ dense: true })
    const taskSpecsByKey = new Map(taskSpecs.map((task) => [task.key, task]))
    const requiredCategories = ['technology', 'engineering', 'soft_skill', 'delivery']

    for (const scenario of DISPUTE_SCENARIO_SPECS) {
      for (const taskKey of [scenario.primaryTask, ...scenario.relatedTasks]) {
        const task = taskSpecsByKey.get(taskKey)

        assert.exists(task, `missing task ${taskKey}`)
        if (!task) {
          continue
        }

        for (const category of requiredCategories) {
          assert.isTrue(
            task.requiredSkills.some(
              (skillCode) => getTaskRequiredSkillCategory(skillCode) === category
            ),
            `task ${taskKey} missing ${category} required skill`
          )
        }
      }
    }
  })
})
