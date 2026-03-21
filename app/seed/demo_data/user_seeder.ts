import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { findRow } from './seed_utils.js'
import type { SeededUser, UserKey } from './types.js'
import { SEED_USERS_SPECS } from './user_seeds_specs.js'

const SEED_USER_PHONES: Record<UserKey, string> = {
  owner: '+84903114531',
  superadmin: '+84287300668',
  member: '+84987224156',
  orgAdmin: '+84912873402',
  peerReviewer: '+84936550187',
  orgBOwner: '+84908341275',
  externalContributorOne: '+84979046318',
  externalContributorTwo: '+84918725640',
  securityOwner: '+84901142001',
  securityEngineer: '+84901142002',
  productResearcher: '+84901142003',
  frontendSpecialist: '+84901142004',
  backendSpecialist: '+84901142005',
  mobileEngineer: '+84901142006',
  dataAnalyst: '+84901142007',
  mlEngineer: '+84901142008',
  devopsEngineer: '+84901142009',
  uxDesigner: '+84901142010',
  qaAutomation: '+84901142011',
  technicalWriter: '+84901142012',
  communityManager: '+84901142013',
  agriProductOwner: '+84901142014',
  civicServiceLead: '+84901142015',
  commerceOwner: '+84901142016',
}

const SEED_USER_ADDRESSES: Partial<Record<UserKey, string>> = {
  member: 'Hà Nội, Việt Nam',
  orgBOwner: 'Đà Nẵng, Việt Nam',
  externalContributorOne: 'Cần Thơ, Việt Nam',
  productResearcher: 'Huế, Việt Nam',
  mobileEngineer: 'Đồng Tháp, Việt Nam',
  agriProductOwner: 'An Giang, Việt Nam',
  civicServiceLead: 'Đà Nẵng, Việt Nam',
  communityManager: 'Cần Thơ, Việt Nam',
}

export async function seedUsers(
  runtime: SeedRuntime,
  trx: TransactionClientContract
): Promise<Record<UserKey, SeededUser>> {
  const specs = SEED_USERS_SPECS
  const seeded: Partial<Record<UserKey, SeededUser>> = {}

  for (const [key, spec] of Object.entries(specs) as [UserKey, (typeof specs)[UserKey]][]) {
    const existing = await findRow<{
      id: string
      username: string
      email: string
      auth_method: 'google' | 'github'
      system_role: 'superadmin' | 'registered_user'
    }>(trx, 'users', { email: spec.email })
    const id = existing?.id ?? runtime.uuid()

    const payload = {
      username: spec.username,
      email: spec.email,
      status: 'active',
      system_role: spec.system_role,
      current_organization_id: null,
      auth_method: spec.auth_method,
      avatar_url: `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(spec.username)}`,
      bio: spec.bio,
      phone: SEED_USER_PHONES[key],
      address: SEED_USER_ADDRESSES[key] ?? 'TP. Hồ Chí Minh, Việt Nam',
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      is_external_contributor: spec.is_external_contributor,
      external_contributor_rating: spec.rating,
      external_contributor_completed_tasks_count: spec.completedTasks,
      ranking_priority: spec.system_role === 'superadmin' ? 1 : 2,
      is_verified_badge: true,
      profile_settings: runtime.toJson({
        is_searchable: spec.is_external_contributor,
        show_contact_info: false,
        show_organizations: true,
        show_projects: true,
        show_spider_chart: true,
        show_technical_skills: true,
        custom_headline: spec.headline,
        preferred_job_types: spec.preferredJobTypes,
        preferred_locations: ['remote', 'Ho Chi Minh'],
        min_salary_expectation: spec.is_external_contributor ? 25000000 : null,
        salary_currency: 'VND',
        available_from: spec.is_external_contributor ? runtime.isoDaysAhead(7) : null,
      }),
      trust_data: runtime.toJson({
        current_tier_code: spec.system_role === 'superadmin' ? 'partner' : 'organization',
        calculated_score: spec.system_role === 'superadmin' ? 99 : 82,
        raw_score: spec.system_role === 'superadmin' ? 120 : 94,
        total_verified_reviews: spec.completedTasks,
        performance_score:
          key === 'owner'
            ? 86.5
            : key === 'member'
              ? 81.75
              : spec.system_role === 'superadmin'
                ? 98
                : null,
        scoring_version: key === 'owner' || key === 'member' ? 'performance_v1' : null,
        last_calculated_at: runtime.isoDaysAgo(1),
      }),
      credibility_data: runtime.toJson({
        credibility_score: spec.system_role === 'superadmin' ? 98 : 84,
        total_reviews_given: spec.completedTasks + 2,
        accurate_reviews: spec.completedTasks + 1,
        disputed_reviews: key === 'peerReviewer' || key === 'owner' ? 1 : 0,
        last_calculated_at: runtime.isoDaysAgo(1),
      }),
      created_at: runtime.isoDaysAgo(120),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing && key !== 'owner') {
      await trx.from('users').where('id', id).update(payload)
    } else if (!existing) {
      await trx
        .insertQuery()
        .table('users')
        .insert({ id, ...payload })
    }

    seeded[key] = {
      id,
      username: existing?.username ?? spec.username,
      email: existing?.email ?? spec.email,
      authMethod: existing?.auth_method ?? spec.auth_method,
      systemRole: existing?.system_role ?? spec.system_role,
    }
  }

  return seeded as Record<UserKey, SeededUser>
}

export async function seedUserOAuthProviders(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  for (const [key, user] of Object.entries(users) as [UserKey, SeededUser][]) {
    const existingForUserProvider = (await trx
      .from('user_oauth_providers')
      .where('user_id', user.id)
      .where('provider', user.authMethod)
      .first()) as { id: string } | null

    if (existingForUserProvider) {
      continue
    }

    await trx
      .insertQuery()
      .table('user_oauth_providers')
      .insert({
        id: runtime.uuid(),
        user_id: user.id,
        provider: user.authMethod,
        provider_id: `seed-${user.authMethod}-${key}-${user.id}`,
        email: user.email,
        access_token: null,
        refresh_token: null,
        created_at: runtime.isoDaysAgo(90),
        updated_at: runtime.isoDaysAgo(1),
      })
  }
}
