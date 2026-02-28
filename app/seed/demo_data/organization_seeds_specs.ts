import type { OrgKey, UserKey } from './types.js'

export interface OrgSpec {
  name: string
  slug: string
  owner: UserKey
  plan: 'starter' | 'professional'
  description: string
}

export const SEED_ORGANIZATIONS_SPECS: Record<OrgKey, OrgSpec> = {
  orgA: {
    name: 'Suar Workspace Lab',
    slug: 'suar-workspace-lab',
    owner: 'owner',
    plan: 'professional',
    description:
      'Primary product workspace operating Suar trust reviews, profile proof, sprint review governance, and marketplace delivery.',
  },
  orgB: {
    name: 'Open Education Guild',
    slug: 'open-education-guild',
    owner: 'orgBOwner',
    plan: 'starter',
    description:
      'Education guild building competency rubrics, curriculum delivery operations, and cross-workspace contributor programs.',
  },
  orgC: {
    name: 'Creator Circle Studio',
    slug: 'creator-circle-studio',
    owner: 'peerReviewer',
    plan: 'starter',
    description:
      'Creator operations studio measuring marketplace package adoption, contributor reputation, and portfolio growth signals.',
  },
  orgD: {
    name: 'Remote Talent Pool',
    slug: 'remote-talent-pool',
    owner: 'externalContributorOne',
    plan: 'professional',
    description:
      'Remote talent studio publishing public portfolio work and managing contributor proposals for client-facing projects.',
  },
  orgE: {
    name: 'Data Ops Research Guild',
    slug: 'data-ops-research-guild',
    owner: 'externalContributorTwo',
    plan: 'professional',
    description:
      'Data operations research guild focused on analytics QA, insight workflows, and evidence-backed delivery decisions.',
  },
}
