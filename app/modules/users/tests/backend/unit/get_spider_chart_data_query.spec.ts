import { test } from '@japa/runner'

import { DefaultUserDependencies } from '#modules/users/actions/ports/user_external_dependencies_impl'
import type { UserSkillDetail } from '#modules/users/actions/ports/user_external_dependencies'
import GetSpiderChartDataQuery, {
  GetSpiderChartDataDTO,
} from '#modules/users/actions/queries/get_spider_chart_data_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

class UncachedGetSpiderChartDataQuery extends GetSpiderChartDataQuery {
  protected override async executeWithCache<T>(
    _cacheKey: string,
    _ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    return callback()
  }
}

function userSkillDetail(
  skillCode: string,
  categoryCode: string,
  displayType = 'spider_chart'
): UserSkillDetail {
  return {
    id: `${skillCode}-row`,
    skill_id: `${skillCode}-id`,
    verified_public_proficiency_code: 'l7',
    source: 'reviewed',
    total_reviews: 2,
    avg_score: 77,
    avg_percentage: 77,
    last_reviewed_at: null,
    confidence_signal: null,
    has_active_dispute: false,
    skill: {
      skill_name: skillCode,
      skill_code: skillCode,
      category_code: categoryCode,
      display_type: displayType,
    },
  }
}

test.group('Get spider chart data query', () => {
  test('routes spider chart skills into four canonical category groups', async ({ assert }) => {
    const originalListUserSkillDetails = DefaultUserDependencies.skill.listUserSkillDetails

    DefaultUserDependencies.skill.listUserSkillDetails = async () => [
      userSkillDetail('typescript', 'technology'),
      userSkillDetail('api_design', 'engineering'),
      userSkillDetail('communication', 'soft_skill'),
      userSkillDetail('release_planning', 'delivery'),
      userSkillDetail('legacy_list_item', 'technology', 'list'),
    ]

    try {
      const result = await new UncachedGetSpiderChartDataQuery(
        makeSystemUserActionContext('system-user')
      ).handle(new GetSpiderChartDataDTO('user-1'))

      assert.deepEqual(Object.keys(result), [
        'technology',
        'engineering',
        'soft_skills',
        'delivery',
      ])
      assert.deepEqual(
        result.technology.map((point) => point.skill_code),
        ['typescript']
      )
      assert.deepEqual(
        result.engineering.map((point) => point.skill_code),
        ['api_design']
      )
      assert.deepEqual(
        result.soft_skills.map((point) => point.skill_code),
        ['communication']
      )
      assert.deepEqual(
        result.delivery.map((point) => point.skill_code),
        ['release_planning']
      )
    } finally {
      DefaultUserDependencies.skill.listUserSkillDetails = originalListUserSkillDetails
    }
  })
})
