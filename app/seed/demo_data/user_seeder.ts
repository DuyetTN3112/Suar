import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { SeededUser, UserKey } from './types.js'
import { SEED_USERS_SPECS } from './user_seeds_specs.js'

export async function seedUsers(
  runtime: SeedRuntime,
  trx: TransactionClientContract
): Promise<Record<UserKey, SeededUser>> {
  const specs = SEED_USERS_SPECS
  const seeded: Partial<Record<UserKey, SeededUser>> = {}

  for (const [key, spec] of Object.entries(specs) as [UserKey, (typeof specs)[UserKey]][]) {
    const existing = await findRow(trx, 'users', { email: spec.email })
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
      phone: '+84900000000',
      address: 'Ho Chi Minh City, Vietnam',
      timezone: 'Asia/Ho_Chi_Minh',
      language: 'vi',
      is_freelancer: spec.is_freelancer,
      freelancer_rating: spec.rating,
      freelancer_completed_tasks_count: spec.completedTasks,
      ranking_priority: spec.system_role === 'superadmin' ? 1 : 2,
      is_verified_badge: true,
      profile_settings: runtime.toJson({
        is_searchable: spec.is_freelancer,
        show_contact_info: false,
        show_organizations: true,
        show_projects: true,
        show_spider_chart: true,
        show_technical_skills: true,
        custom_headline: spec.headline,
        preferred_job_types: spec.preferredJobTypes,
        preferred_locations: ['remote', 'Ho Chi Minh'],
        min_salary_expectation: spec.is_freelancer ? 25000000 : null,
        salary_currency: 'VND',
        available_from: spec.is_freelancer ? runtime.isoDaysAhead(7) : null,
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
        scoring_version: key === 'owner' || key === 'member' ? 'seed-performance-v1' : null,
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

    if (existing) {
      await trx.from('users').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('users')
        .insert({ id, ...payload })
    }

    seeded[key] = {
      id,
      username: spec.username,
      email: spec.email,
      authMethod: spec.auth_method,
      systemRole: spec.system_role,
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
    await trx
      .from('user_oauth_providers')
      .where('user_id', user.id)
      .whereNot('provider', user.authMethod)
      .delete()

    const where = {
      user_id: user.id,
      provider: user.authMethod,
    }
    const existing = await findRow(trx, 'user_oauth_providers', where)
    const payload = {
      provider_id: `seed-${user.authMethod}-${key}`,
      email: user.email,
      access_token: `seed-access-token-${key}`,
      refresh_token: `seed-refresh-token-${key}`,
      created_at: runtime.isoDaysAgo(90),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await applyWhere(trx.from('user_oauth_providers'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('user_oauth_providers')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }
  }
}
