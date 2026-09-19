import {
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

export async function buildRecruiterScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const recruiter = await UserFactory.create({
    current_organization_id: org.id,
  })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: recruiter.id,
    org_role: 'org_admin',
    status: 'approved',
  })

  const talent = await UserFactory.createExternalContributor({
    current_organization_id: org.id,
    email: `talent-${Date.now()}@test.example.com`,
  })
  await talent
    .merge({
      profile_settings: {
        is_searchable: true,
        show_contact_info: true,
        show_organizations: true,
        show_projects: true,
        show_spider_chart: true,
        show_technical_skills: true,
        custom_headline: 'Searchable talent',
        preferred_job_types: [],
        preferred_locations: [],
        min_salary_expectation: null,
        salary_currency: 'USD',
        available_from: null,
      },
      trust_data: {
        current_tier_code: 'gold',
        calculated_score: 88,
        raw_score: 88,
        total_verified_reviews: 1,
        last_calculated_at: null,
      },
    })
    .save()

  return { org, owner, recruiter, talent }
}
