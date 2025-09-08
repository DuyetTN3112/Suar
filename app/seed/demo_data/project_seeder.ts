import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { OrgKey, ProjectKey, SeededOrg, SeededProject, SeededUser, UserKey } from './types.js'

export async function seedProjects(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  organizations: Record<OrgKey, SeededOrg>
): Promise<Record<ProjectKey, SeededProject>> {
  const specs: Record<
    ProjectKey,
    {
      name: string
      organization: OrgKey
      creator: UserKey
      owner: UserKey
      manager: UserKey
      status: 'in_progress' | 'completed'
      visibility: 'team' | 'private'
    }
  > = {
    orgAPlatform: {
      name: 'Org Context & Profile Platform',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgAOperations: {
      name: 'Admin Quality Control',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'owner',
      status: 'in_progress',
      visibility: 'private',
    },
    orgADesignSystem: {
      name: 'Workspace Design System',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgAAnalytics: {
      name: 'System Metrics & Moderation Hub',
      organization: 'orgA',
      creator: 'owner',
      owner: 'owner',
      manager: 'owner',
      status: 'in_progress',
      visibility: 'private',
    },
    orgBKnowledgeBase: {
      name: 'Org B Knowledge Base',
      organization: 'orgB',
      creator: 'orgBOwner',
      owner: 'orgBOwner',
      manager: 'orgBOwner',
      status: 'in_progress',
      visibility: 'team',
    },
    orgBCurriculumOps: {
      name: 'Org B Curriculum Ops',
      organization: 'orgB',
      creator: 'orgBOwner',
      owner: 'orgBOwner',
      manager: 'orgBOwner',
      status: 'in_progress',
      visibility: 'team',
    },
    orgCMarketplaceLab: {
      name: 'Marketplace Growth Lab',
      organization: 'orgC',
      creator: 'peerReviewer',
      owner: 'peerReviewer',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgDTalentShowcase: {
      name: 'Talent Showcase Portal',
      organization: 'orgD',
      creator: 'freelancerOne',
      owner: 'freelancerOne',
      manager: 'freelancerOne',
      status: 'in_progress',
      visibility: 'team',
    },
    orgEDataOps: {
      name: 'Data Ops Command Center',
      organization: 'orgE',
      creator: 'freelancerTwo',
      owner: 'freelancerTwo',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'team',
    },
    orgEInsightEngine: {
      name: 'Insight Engine Studio',
      organization: 'orgE',
      creator: 'freelancerTwo',
      owner: 'freelancerTwo',
      manager: 'orgAdmin',
      status: 'in_progress',
      visibility: 'private',
    },
  }

  const seeded: Partial<Record<ProjectKey, SeededProject>> = {}

  for (const [key, spec] of Object.entries(specs) as [
    ProjectKey,
    (typeof specs)[ProjectKey],
  ][]) {
    const organizationId = organizations[spec.organization].id
    const existing = (await trx
      .from('projects')
      .where('organization_id', organizationId)
      .where('name', spec.name)
      .first()) as { id: string } | null
    const id = existing?.id ?? runtime.uuid()
    const payload = {
      creator_id: users[spec.creator].id,
      name: spec.name,
      description: `${spec.name} - seeded project for local end-to-end verification.`,
      organization_id: organizationId,
      start_date: runtime.isoDaysAgo(30),
      end_date: runtime.isoDaysAhead(45),
      status: spec.status,
      budget: spec.organization === 'orgA' ? 45000000 : 18000000,
      manager_id: users[spec.manager].id,
      owner_id: users[spec.owner].id,
      visibility: spec.visibility,
      allow_freelancer: ['orgA', 'orgD', 'orgE'].includes(spec.organization),
      approval_required_for_members: true,
      tags: runtime.toJson(
        spec.organization === 'orgA' ? ['rbac', 'profile', 'admin'] : ['handbook', 'member-flow']
      ),
      custom_roles: runtime.toJson([]),
      created_at: runtime.isoDaysAgo(30),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await trx.from('projects').where('id', id).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('projects')
        .insert({ id, ...payload })
    }

    seeded[key] = { id, name: spec.name, organizationId }
  }

  return seeded as Record<ProjectKey, SeededProject>
}

export async function seedProjectMembers(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>
): Promise<void> {
  const rows: { project: ProjectKey; user: UserKey; role: string }[] = [
    { project: 'orgAPlatform', user: 'owner', role: 'project_owner' },
    { project: 'orgAPlatform', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgAPlatform', user: 'member', role: 'project_member' },
    { project: 'orgAPlatform', user: 'peerReviewer', role: 'project_member' },
    { project: 'orgAOperations', user: 'owner', role: 'project_owner' },
    { project: 'orgAOperations', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgAOperations', user: 'member', role: 'project_viewer' },
    { project: 'orgADesignSystem', user: 'owner', role: 'project_owner' },
    { project: 'orgADesignSystem', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgADesignSystem', user: 'member', role: 'project_member' },
    { project: 'orgAAnalytics', user: 'owner', role: 'project_owner' },
    { project: 'orgAAnalytics', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgAAnalytics', user: 'peerReviewer', role: 'project_member' },
    { project: 'orgBKnowledgeBase', user: 'orgBOwner', role: 'project_owner' },
    { project: 'orgBKnowledgeBase', user: 'owner', role: 'project_member' },
    { project: 'orgBKnowledgeBase', user: 'member', role: 'project_member' },
    { project: 'orgBCurriculumOps', user: 'orgBOwner', role: 'project_owner' },
    { project: 'orgBCurriculumOps', user: 'owner', role: 'project_member' },
    { project: 'orgCMarketplaceLab', user: 'peerReviewer', role: 'project_owner' },
    { project: 'orgCMarketplaceLab', user: 'owner', role: 'project_member' },
    { project: 'orgCMarketplaceLab', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgDTalentShowcase', user: 'freelancerOne', role: 'project_owner' },
    { project: 'orgDTalentShowcase', user: 'owner', role: 'project_member' },
    { project: 'orgDTalentShowcase', user: 'freelancerTwo', role: 'project_member' },
    { project: 'orgEDataOps', user: 'freelancerTwo', role: 'project_owner' },
    { project: 'orgEDataOps', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgEDataOps', user: 'owner', role: 'project_member' },
    { project: 'orgEDataOps', user: 'member', role: 'project_member' },
    { project: 'orgEInsightEngine', user: 'freelancerTwo', role: 'project_owner' },
    { project: 'orgEInsightEngine', user: 'orgAdmin', role: 'project_manager' },
    { project: 'orgEInsightEngine', user: 'owner', role: 'project_member' },
  ]

  for (const row of rows) {
    const where = {
      project_id: projects[row.project].id,
      user_id: users[row.user].id,
    }
    const existing = await findRow(trx, 'project_members', where)
    const payload = {
      project_role: row.role,
      created_at: runtime.isoDaysAgo(20),
    }

    if (existing) {
      await applyWhere(trx.from('project_members'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('project_members')
        .insert({ ...where, ...payload })
    }
  }
}
