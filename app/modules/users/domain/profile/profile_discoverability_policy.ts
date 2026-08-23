import type { UserProfileSettings } from '#modules/users/types/user_profile_data'

export function withProfileDiscoverability(
  settings: UserProfileSettings | null,
  isSearchable: boolean
): UserProfileSettings {
  return {
    ...(settings ?? {
      show_contact_info: false,
      show_organizations: true,
      show_projects: true,
      show_spider_chart: true,
      show_technical_skills: true,
      custom_headline: null,
      preferred_job_types: [],
      preferred_locations: [],
      min_salary_expectation: null,
      salary_currency: 'USD',
      available_from: null,
    }),
    is_searchable: isSearchable,
  }
}
