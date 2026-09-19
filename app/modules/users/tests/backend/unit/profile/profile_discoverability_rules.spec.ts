import { test } from '@japa/runner'

import { UpdateProfileDiscoverabilityDTO } from '#modules/users/actions/dtos/request/update_profile_discoverability_dto'
import { withProfileDiscoverability } from '#modules/users/domain/profile/profile_discoverability_policy'
import type { UserProfileSettings } from '#modules/users/types/user_profile_data'

const fullSettings: UserProfileSettings = {
  is_searchable: false,
  show_contact_info: true,
  show_organizations: false,
  show_projects: true,
  show_spider_chart: false,
  show_technical_skills: true,
  custom_headline: 'Backend reviewer',
  preferred_job_types: ['contract'],
  preferred_locations: ['remote'],
  min_salary_expectation: 1000,
  salary_currency: 'VND',
  available_from: '2026-08-01',
}

test.group('Profile discoverability rules', () => {
  test('discoverability DTO accepts only real booleans', ({ assert }) => {
    assert.equal(new UpdateProfileDiscoverabilityDTO(true).isSearchable, true)
    assert.equal(new UpdateProfileDiscoverabilityDTO(false).isSearchable, false)

    for (const value of ['true', '1', 1, null, undefined]) {
      assert.throws(() => new UpdateProfileDiscoverabilityDTO(value))
    }
  })

  test('writing discoverability preserves sibling profile settings', ({ assert }) => {
    const next = withProfileDiscoverability(fullSettings, true)

    assert.deepEqual(next, {
      ...fullSettings,
      is_searchable: true,
    })
  })
})
