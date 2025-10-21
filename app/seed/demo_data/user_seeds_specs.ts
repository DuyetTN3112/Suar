import type { UserKey } from './types.js'

export interface UserSpec {
  username: string
  email: string
  system_role: 'superadmin' | 'registered_user'
  auth_method: 'google' | 'github'
  bio: string
  is_external_contributor: boolean
  rating: number | null
  completedTasks: number
  headline: string
  preferredJobTypes: string[]
}

export const SEED_USERS_SPECS: Record<UserKey, UserSpec> = {
  owner: {
    username: 'Suar',
    email: 'tranngocduyet31@gmail.com',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'Product operator leading trust review workflows across the primary workspace while contributing to the education guild as a cross-organization member.',
    is_external_contributor: true,
    rating: 4.7,
    completedTasks: 4,
    headline: 'Workspace owner and marketplace contributor focused on review operations',
    preferredJobTypes: ['full-time', 'project-based', 'freelance'],
  },
  superadmin: {
    username: 'DuyetTN3112(edu)',
    email: 'td6622i@gre.ac.uk',
    system_role: 'superadmin',
    auth_method: 'google',
    bio: 'Platform administrator responsible for tenant health, review moderation, and operational governance across Suar workspaces.',
    is_external_contributor: false,
    rating: null,
    completedTasks: 0,
    headline: 'Platform administrator for trust and moderation operations',
    preferredJobTypes: ['admin'],
  },
  member: {
    username: 'duyetlaaithe',
    email: 'duyetlaaithe@gmail.com',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'Full-stack contributor with completed review packages, public profile proof, and ongoing work in the trust review platform.',
    is_external_contributor: true,
    rating: 4.5,
    completedTasks: 3,
    headline: 'Contributor with verified delivery history and public profile proof',
    preferredJobTypes: ['contract', 'part-time'],
  },
  orgAdmin: {
    username: 'LinhPM',
    email: 'linh.pm@suar.local',
    system_role: 'registered_user',
    auth_method: 'google',
    bio: 'Organization admin coordinating project staffing, delivery review, and sprint quality gates for the primary workspace.',
    is_external_contributor: false,
    rating: 4.6,
    completedTasks: 1,
    headline: 'Organization admin and review operations manager',
    preferredJobTypes: ['full-time'],
  },
  peerReviewer: {
    username: 'HaQA',
    email: 'ha.qa@suar.local',
    system_role: 'registered_user',
    auth_method: 'google',
    bio: 'Quality reviewer specializing in evidence-based peer feedback, rubric calibration, and marketplace delivery signals.',
    is_external_contributor: false,
    rating: 4.2,
    completedTasks: 1,
    headline: 'Peer reviewer for quality calibration and delivery proof',
    preferredJobTypes: ['full-time'],
  },
  orgBOwner: {
    username: 'OpenEduOwner',
    email: 'owner.edu@suar.local',
    system_role: 'registered_user',
    auth_method: 'google',
    bio: 'Education program owner building competency-based curriculum operations and cross-workspace collaboration playbooks.',
    is_external_contributor: false,
    rating: 4.4,
    completedTasks: 1,
    headline: 'Education guild owner and curriculum operations lead',
    preferredJobTypes: ['full-time'],
  },
  externalContributorOne: {
    username: 'MaiContributor',
    email: 'mai.contributor@suar.local',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'Independent contributor packaging public portfolio work, marketplace proposals, and delivery proof for client-facing tasks.',
    is_external_contributor: true,
    rating: 4.8,
    completedTasks: 6,
    headline: 'External contributor for marketplace delivery programs',
    preferredJobTypes: ['freelance', 'contract'],
  },
  externalContributorTwo: {
    username: 'NamContributor',
    email: 'nam.contributor@suar.local',
    system_role: 'registered_user',
    auth_method: 'github',
    bio: 'Data operations contributor focused on analytics QA, public task applications, and workflow documentation.',
    is_external_contributor: true,
    rating: 4.3,
    completedTasks: 4,
    headline: 'Marketplace contributor for data quality and analytics workflows',
    preferredJobTypes: ['freelance'],
  },
}
