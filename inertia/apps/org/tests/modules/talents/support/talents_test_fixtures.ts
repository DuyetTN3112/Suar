import { render } from '@testing-library/svelte'

import OrgTalentsPage from '@/apps/org/modules/talents/index.svelte'

export const availableSkills = [
  { id: 'skill-1', skill_name: 'TypeScript', category_code: 'technology' },
  { id: 'skill-2', skill_name: 'Release Planning', category_code: 'delivery' },
  { id: 'skill-3', skill_name: 'Stakeholder Facilitation', category_code: 'soft_skill' },
  { id: 'skill-4', skill_name: 'API Design', category_code: 'engineering' },
]

export const availableTasks = [
  { id: 'task-1', title: 'Build billing API' },
  { id: 'task-2', title: 'Review settlement ledger' },
]

export const defaultTalents = [
  {
    id: 'talent-1',
    username: 'duyet',
    status: 'active',
    public_accomplishments: [
      {
        title: 'Checkout reliability',
        concise_statement: 'Reduced payment failure rate',
        action: 'improved',
        object: 'checkout',
        role: 'owner',
        ownership_level: 'primary_owner',
        verification_status: 'verified' as const,
        confidence_band: 'high' as const,
        published_at: '2026-07-01T00:00:00.000Z',
      },
    ],
    bookmark: {
      id: null,
      isSaved: false,
      notes: null,
      folder: null,
      rating: null,
    },
  },
]

export const defaultFilters = {
  q: 'backend',
  task_id: 'task-1',
  skill_categories: ['technology'],
  skill_ids: ['skill-1'],
  business_domain: 'fintech',
  task_type: 'api_design',
  problem_category: 'compliance',
  role_in_task: 'architect',
  tech_stack: 'AdonisJS',
  domain_tags: 'settlement',
  sort_by: 'trust_score',
  sort_order: 'desc',
  saved: null,
  min_trust_score: null,
  min_completed_tasks: null,
}

export function renderPage(overrides: Record<string, unknown> = {}) {
  return render(OrgTalentsPage, {
    props: {
      talents: defaultTalents,
      filters: defaultFilters,
      availableSkills,
      availableTasks,
      stats: {
        total: 25,
        saved: 2,
      },
      pagination: {
        mode: 'offset',
        page: 2,
        perPage: 10,
        total: 25,
        lastPage: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      },
      ...overrides,
    },
  })
}
