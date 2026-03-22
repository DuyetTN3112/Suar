/**
 * Test Factories — Create test data for integration tests
 *
 * Each factory creates a valid DB record with sensible defaults.
 * Override any field by passing partial data.
 *
 * Usage:
 *   const user = await UserFactory.create({ system_role: 'superadmin' })
 *   const org = await OrganizationFactory.create({ owner_id: user.id })
 *   const task = await TaskFactory.create({ organization_id: org.id, creator_id: user.id })
 */

import User from '#models/user'
import Organization from '#models/organization'
import OrganizationUser from '#models/organization_user'
import Project from '#models/project'
import ProjectMember from '#models/project_member'
import Task from '#models/task'
import TaskApplication from '#models/task_application'
import TaskAssignment from '#models/task_assignment'
import ReviewSession from '#models/review_session'
import SkillReview from '#models/skill_review'
import Skill from '#models/skill'
import UserSkill from '#models/user_skill'
import FlaggedReview from '#models/flagged_review'
import ReverseReview from '#models/reverse_review'
import { testId, testEmail, testUsername, testSlug } from './test_utils.js'
import { DateTime } from 'luxon'

import type { OrganizationUserStatus } from '#constants/organization_constants'

type OrgUserStatus = `${OrganizationUserStatus}`

// ============================================================================
// User Factory
// ============================================================================
export const UserFactory = {
  async create(
    overrides: Partial<{
      id: string
      username: string
      email: string | null
      status: string
      system_role: string
      auth_method: 'email' | 'google' | 'github'
      is_freelancer: boolean
      current_organization_id: string | null
      timezone: string
      language: string
      credibility_data: import('#types/database').UserCredibilityData | null
    }> = {}
  ): Promise<User> {
    return User.create({
      id: overrides.id ?? testId(),
      username: overrides.username ?? testUsername(),
      email: overrides.email !== undefined ? overrides.email : testEmail(),
      status: overrides.status ?? 'active',
      system_role: overrides.system_role ?? 'registered_user',
      auth_method: overrides.auth_method ?? 'email',
      is_freelancer: overrides.is_freelancer ?? false,
      current_organization_id: overrides.current_organization_id ?? null,
      timezone: overrides.timezone ?? 'Asia/Ho_Chi_Minh',
      language: overrides.language ?? 'vi',
      ...(overrides.credibility_data !== undefined && {
        credibility_data: overrides.credibility_data,
      }),
    })
  },

  async createSuperadmin(
    overrides: Partial<{ id: string; username: string; email: string }> = {}
  ): Promise<User> {
    return this.create({ system_role: 'superadmin', ...overrides })
  },

  async createFreelancer(
    overrides: Partial<{ id: string; username: string; email: string }> = {}
  ): Promise<User> {
    return this.create({ is_freelancer: true, ...overrides })
  },
}

// ============================================================================
// Organization Factory
// ============================================================================
export const OrganizationFactory = {
  async create(
    overrides: Partial<{
      id: string
      name: string
      slug: string
      owner_id: string
      plan: string
      description: string | null
    }> = {}
  ): Promise<Organization> {
    const ownerId = overrides.owner_id ?? (await UserFactory.create()).id
    return Organization.create({
      id: overrides.id ?? testId(),
      name: overrides.name ?? `Test Org ${Math.random().toString(36).substring(2, 6)}`,
      slug: overrides.slug ?? testSlug(),
      owner_id: ownerId,
      plan: overrides.plan ?? 'free',
      description: overrides.description ?? null,
    })
  },

  /**
   * Create org + owner user + owner membership in one call
   */
  async createWithOwner(
    orgOverrides: Partial<{
      name: string
      slug: string
      plan: string
    }> = {},
    userOverrides: Partial<{
      username: string
      email: string
      system_role: string
    }> = {}
  ): Promise<{ org: Organization; owner: User }> {
    const owner = await UserFactory.create(userOverrides)
    const org = await this.create({ owner_id: owner.id, ...orgOverrides })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: org.id }).save()
    return { org, owner }
  },
}

// ============================================================================
// OrganizationUser Factory
// ============================================================================
export const OrganizationUserFactory = {
  async create(
    overrides: Partial<{
      organization_id: string
      user_id: string
      org_role: string
      status: OrgUserStatus
      invited_by: string | null
    }> = {}
  ): Promise<OrganizationUser> {
    return OrganizationUser.create({
      organization_id: overrides.organization_id ?? testId(),
      user_id: overrides.user_id ?? testId(),
      org_role: overrides.org_role ?? 'org_member',
      status: (overrides.status ?? 'approved') as OrganizationUserStatus,
      invited_by: overrides.invited_by ?? null,
    })
  },
}

// ============================================================================
// Project Factory
// ============================================================================
export const ProjectFactory = {
  async create(
    overrides: Partial<{
      id: string
      name: string
      organization_id: string
      creator_id: string
      owner_id: string
      status: string
      visibility: string
      allow_freelancer: boolean
      budget: number
      start_date: any
      end_date: any
      deleted_at: any
      manager_id: string | null
    }> = {}
  ): Promise<Project> {
    return Project.create({
      id: overrides.id ?? testId(),
      name: overrides.name ?? `Test Project ${Math.random().toString(36).substring(2, 6)}`,
      organization_id: overrides.organization_id ?? testId(),
      creator_id: overrides.creator_id ?? testId(),
      owner_id: overrides.owner_id ?? overrides.creator_id ?? testId(),
      status: overrides.status ?? 'in_progress',
      visibility: overrides.visibility ?? 'team',
      allow_freelancer: overrides.allow_freelancer ?? false,
      budget: overrides.budget ?? 0,
      ...(overrides.start_date && { start_date: overrides.start_date }),
      ...(overrides.end_date && { end_date: overrides.end_date }),
      ...(overrides.deleted_at && { deleted_at: overrides.deleted_at }),
      ...(overrides.manager_id && { manager_id: overrides.manager_id }),
    })
  },
}

// ============================================================================
// ProjectMember Factory
// ============================================================================
export const ProjectMemberFactory = {
  async create(
    overrides: Partial<{
      project_id: string
      user_id: string
      project_role: string
    }> = {}
  ): Promise<ProjectMember> {
    return ProjectMember.create({
      project_id: overrides.project_id ?? testId(),
      user_id: overrides.user_id ?? testId(),
      project_role: overrides.project_role ?? 'project_member',
    })
  },
}

// ============================================================================
// Task Factory
// ============================================================================
export const TaskFactory = {
  async create(
    overrides: Partial<{
      id: string
      title: string
      description: string
      status: string
      label: string
      priority: string
      difficulty: string | null
      organization_id: string
      creator_id: string
      assigned_to: string | null
      project_id: string | null
      parent_task_id: string | null
      estimated_time: number
      actual_time: number
      task_visibility: string
      sort_order: number
      due_date: any
      task_status_id: string | null
    }> = {}
  ): Promise<Task> {
    return Task.create({
      id: overrides.id ?? testId(),
      title: overrides.title ?? `Test Task ${Math.random().toString(36).substring(2, 6)}`,
      description: overrides.description ?? 'Test task description',
      status: overrides.status ?? 'todo',
      label: overrides.label ?? 'feature',
      priority: overrides.priority ?? 'medium',
      difficulty: overrides.difficulty ?? null,
      organization_id: overrides.organization_id ?? testId(),
      creator_id: overrides.creator_id ?? testId(),
      assigned_to: overrides.assigned_to ?? null,
      project_id: overrides.project_id ?? null,
      parent_task_id: overrides.parent_task_id ?? null,
      estimated_time: overrides.estimated_time ?? 0,
      actual_time: overrides.actual_time ?? 0,
      task_visibility: overrides.task_visibility ?? 'internal',
      sort_order: overrides.sort_order ?? 0,
      due_date: overrides.due_date ?? DateTime.now().plus({ days: 7 }),
      ...(overrides.task_status_id ? { task_status_id: overrides.task_status_id } : {}),
    })
  },
}

// ============================================================================
// TaskApplication Factory
// ============================================================================
export const TaskApplicationFactory = {
  async create(
    overrides: Partial<{
      id: string
      task_id: string
      applicant_id: string
      application_status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
      application_source: 'public_listing' | 'invitation' | 'referral'
      message: string | null
      expected_rate: number | null
      portfolio_links: string[] | null
      rejection_reason: string | null
    }> = {}
  ): Promise<TaskApplication> {
    return TaskApplication.create({
      id: overrides.id ?? testId(),
      task_id: overrides.task_id ?? testId(),
      applicant_id: overrides.applicant_id ?? testId(),
      application_status: overrides.application_status ?? 'pending',
      application_source: overrides.application_source ?? 'public_listing',
      message: overrides.message ?? null,
      expected_rate: overrides.expected_rate ?? null,
      portfolio_links: overrides.portfolio_links ?? null,
      rejection_reason: overrides.rejection_reason ?? null,
    })
  },
}

// ============================================================================
// TaskAssignment Factory
// ============================================================================
export const TaskAssignmentFactory = {
  async create(
    overrides: Partial<{
      id: string
      task_id: string
      assignee_id: string
      assigned_by: string
      assignment_type: 'member' | 'freelancer' | 'volunteer'
      assignment_status: 'active' | 'completed' | 'cancelled'
      estimated_hours: number | null
      progress_percentage: number
    }> = {}
  ): Promise<TaskAssignment> {
    return TaskAssignment.create({
      id: overrides.id ?? testId(),
      task_id: overrides.task_id ?? testId(),
      assignee_id: overrides.assignee_id ?? testId(),
      assigned_by: overrides.assigned_by ?? testId(),
      assignment_type: overrides.assignment_type ?? 'member',
      assignment_status: overrides.assignment_status ?? 'active',
      estimated_hours: overrides.estimated_hours ?? null,
      progress_percentage: overrides.progress_percentage ?? 0,
    })
  },
}

// ============================================================================
// Skill Factory
// ============================================================================
export const SkillFactory = {
  async create(
    overrides: Partial<{
      id: string
      skill_code: string
      skill_name: string
      category_code: string
      display_type: string
      is_active: boolean
      sort_order: number
    }> = {}
  ): Promise<Skill> {
    const code = Math.random().toString(36).substring(2, 8)
    return Skill.create({
      id: overrides.id ?? testId(),
      skill_code: overrides.skill_code ?? `skill_${code}`,
      skill_name: overrides.skill_name ?? `Test Skill ${code}`,
      category_code: overrides.category_code ?? 'technical',
      display_type: overrides.display_type ?? 'spider_chart',
      is_active: overrides.is_active ?? true,
      sort_order: overrides.sort_order ?? 0,
    })
  },
}

// ============================================================================
// ReviewSession Factory
// ============================================================================
export const ReviewSessionFactory = {
  async create(
    overrides: Partial<{
      id: string
      task_assignment_id: string
      reviewee_id: string
      status: 'pending' | 'in_progress' | 'completed' | 'disputed'
      manager_review_completed: boolean
      peer_reviews_count: number
      required_peer_reviews: number
      confirmations: any[] | null
    }> = {}
  ): Promise<ReviewSession> {
    return ReviewSession.create({
      id: overrides.id ?? testId(),
      task_assignment_id: overrides.task_assignment_id ?? testId(),
      reviewee_id: overrides.reviewee_id ?? testId(),
      status: overrides.status ?? 'pending',
      manager_review_completed: overrides.manager_review_completed ?? false,
      peer_reviews_count: overrides.peer_reviews_count ?? 0,
      required_peer_reviews: overrides.required_peer_reviews ?? 2,
      confirmations: overrides.confirmations ?? null,
    })
  },
}

// ============================================================================
// SkillReview Factory
// ============================================================================
export const SkillReviewFactory = {
  async create(
    overrides: Partial<{
      id: string
      review_session_id: string
      reviewer_id: string
      reviewer_type: 'manager' | 'peer'
      skill_id: string
      assigned_level_code: string
      comment: string | null
    }> = {}
  ): Promise<SkillReview> {
    return SkillReview.create({
      id: overrides.id ?? testId(),
      review_session_id: overrides.review_session_id ?? testId(),
      reviewer_id: overrides.reviewer_id ?? testId(),
      reviewer_type: overrides.reviewer_type ?? 'peer',
      skill_id: overrides.skill_id ?? testId(),
      assigned_level_code: overrides.assigned_level_code ?? 'middle',
      comment: overrides.comment ?? null,
    })
  },
}

// ============================================================================
// UserSkill Factory
// ============================================================================
export const UserSkillFactory = {
  async create(
    overrides: Partial<{
      id: string
      user_id: string
      skill_id: string
      level_code: string
      total_reviews: number
      avg_score: number | null
      avg_percentage: number | null
    }> = {}
  ): Promise<UserSkill> {
    return UserSkill.create({
      id: overrides.id ?? testId(),
      user_id: overrides.user_id ?? testId(),
      skill_id: overrides.skill_id ?? testId(),
      level_code: overrides.level_code ?? 'middle',
      total_reviews: overrides.total_reviews ?? 0,
      avg_score: overrides.avg_score ?? null,
      avg_percentage: overrides.avg_percentage ?? null,
    })
  },
}

// ============================================================================
// FlaggedReview Factory
// ============================================================================
export const FlaggedReviewFactory = {
  async create(
    overrides: Partial<{
      id: string
      skill_review_id: string
      flag_type: string
      severity: string
      status: 'pending' | 'reviewed' | 'dismissed' | 'confirmed'
      notes: string | null
    }> = {}
  ): Promise<FlaggedReview> {
    return FlaggedReview.create({
      id: overrides.id ?? testId(),
      skill_review_id: overrides.skill_review_id ?? testId(),
      flag_type: overrides.flag_type ?? 'bulk_same_level',
      severity: overrides.severity ?? 'medium',
      status: overrides.status ?? 'pending',
      notes: overrides.notes ?? null,
    })
  },
}

// ============================================================================
// ReverseReview Factory
// ============================================================================
export const ReverseReviewFactory = {
  async create(
    overrides: Partial<{
      id: string
      review_session_id: string
      reviewer_id: string
      target_type: 'organization' | 'project' | 'manager' | 'peer'
      target_id: string
      rating: number
      comment: string | null
      is_anonymous: boolean
    }> = {}
  ): Promise<ReverseReview> {
    return ReverseReview.create({
      id: overrides.id ?? testId(),
      review_session_id: overrides.review_session_id ?? testId(),
      reviewer_id: overrides.reviewer_id ?? testId(),
      target_type: overrides.target_type ?? 'peer',
      target_id: overrides.target_id ?? testId(),
      rating: overrides.rating ?? 4,
      comment: overrides.comment ?? null,
      is_anonymous: overrides.is_anonymous ?? false,
    })
  },
}

// ============================================================================
// Cleanup Utility
// ============================================================================
/**
 * Truncate all test tables. Call in group.each.teardown or group.teardown.
 * Order matters for foreign key-like constraints (even with NO FK, referential data).
 */
export async function cleanupTestData(): Promise<void> {
  const { default: db } = await import('@adonisjs/lucid/services/db')

  // Delete in reverse dependency order
  await db.from('flagged_reviews').delete()
  await db.from('reverse_reviews').delete()
  await db.from('skill_reviews').delete()
  await db.from('review_sessions').delete()
  await db.from('user_skills').delete()
  await db.from('recruiter_bookmarks').delete()
  await db.from('user_subscriptions').delete()
  await db.from('task_required_skills').delete()
  await db.from('task_versions').delete()
  await db.from('task_assignments').delete()
  await db.from('task_applications').delete()
  await db.from('project_attachments').delete()
  await db.from('project_members').delete()
  await db.from('projects').delete()
  await db.from('tasks').delete()
  await db.from('task_workflow_transitions').delete()
  await db.from('task_statuses').delete()
  await db.from('organization_users').delete()
  await db.from('organizations').delete()
  await db.from('user_oauth_providers').delete()
  await db.from('skills').delete()
  await db.from('users').delete()
}
