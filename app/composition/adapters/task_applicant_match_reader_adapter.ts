import db from '@adonisjs/lucid/services/db'

import { OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import { TaskApplicantMatchReader } from '#modules/tasks/actions/ports/outbound/task_applicant_match_reader'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

export class TaskApplicantMatchReaderAdapter extends TaskApplicantMatchReader {
  async load(taskId: string, applicationId?: string) {
    const task = (await db
      .from('tasks')
      .where('id', taskId)
      .select(
        'business_domain',
        'problem_category',
        'task_type',
        'project_id',
        'organization_id',
        'creator_id',
        'assigned_to'
      )
      .first()) as
      | {
          business_domain: string
          problem_category: string
          task_type: string
          project_id: string | null
          organization_id: string | null
          creator_id: string
          assigned_to: string | null
        }
      | null

    if (!task) {
      return { task: null, required_skills: [], applicants: [] }
    }

    const applicationQuery = db
      .from('task_applications as ta')
      .join('users as u', 'u.id', 'ta.applicant_id')
      .where('ta.task_id', taskId)
      .select(
        'ta.id as application_id',
        'ta.applicant_id',
        'u.username as applicant_name',
        'u.trust_data'
      )
    if (applicationId) {
      void applicationQuery.where('ta.id', applicationId)
    } else {
      void applicationQuery.whereIn('ta.application_status', [
        ApplicationStatus.PENDING,
        ApplicationStatus.APPROVED,
        ApplicationStatus.REJECTED,
      ])
    }

    const [applicationRows, requiredSkills] = await Promise.all([
      applicationQuery as Promise<
        Array<{
          application_id: string
          applicant_id: string
          applicant_name: string
          trust_data: unknown
        }>
      >,
      db
        .from('task_required_skills as trs')
        .join('skills as s', 's.id', 'trs.skill_id')
        .where('trs.task_id', taskId)
        .select(
          'trs.skill_id',
          'trs.required_public_proficiency_code',
          'trs.is_mandatory',
          's.skill_name',
          'trs.minimum_level_id',
          'trs.target_level_id',
          'trs.assessment_ceiling_level_id',
          'trs.importance',
          'trs.weight',
          'trs.project_skill_id',
          'trs.rubric_version_id'
        ),
    ])

    const applicantIds = applicationRows.map((row) => row.applicant_id)
    const [skillRows, workHistoryRows, projectMemberRows, organizationMemberRows] =
      applicantIds.length === 0
        ? [[], [], [], []]
        : await Promise.all([
            db
              .from('user_skills')
              .whereIn('user_id', applicantIds)
              .select(
                'user_id',
                'skill_id',
                'verified_public_proficiency_code',
                'source'
              ),
            db
              .from('user_work_history')
              .whereIn('user_id', applicantIds)
              .select(
                'user_id',
                'business_domain',
                'problem_category',
                'task_type',
                'was_on_time'
              ),
            task.project_id
              ? db
                  .from('project_members')
                  .where('project_id', task.project_id)
                  .whereIn('user_id', applicantIds)
                  .select('user_id')
              : Promise.resolve([]),
            task.organization_id
              ? db
                  .from('organization_users')
                  .where('organization_id', task.organization_id)
                  .whereIn('user_id', applicantIds)
                  .where('status', OrganizationUserStatus.APPROVED)
                  .select('user_id')
              : Promise.resolve([]),
          ])

    const projectMembers = new Set(
      (projectMemberRows as Array<{ user_id: string }>).map((row) => row.user_id)
    )
    const organizationMembers = new Set(
      (organizationMemberRows as Array<{ user_id: string }>).map(
        (row) => row.user_id
      )
    )

    return {
      task,
      required_skills: requiredSkills,
      applicants: applicationRows.map((application) => {
        const trustData = (typeof application.trust_data === 'string'
          ? JSON.parse(application.trust_data)
          : (application.trust_data ?? {})) as { calculated_score?: unknown }
        return {
          application_id: application.application_id,
          applicant_id: application.applicant_id,
          applicant_name: application.applicant_name,
          trust_score: Number(trustData.calculated_score ?? 0),
          skills: (skillRows as Array<{
            user_id: string
            skill_id: string
            verified_public_proficiency_code: string
            source: string
          }>)
            .filter((row) => row.user_id === application.applicant_id)
            .map(({ user_id: _userId, ...row }) => row),
          work_history: (workHistoryRows as Array<{
            user_id: string
            business_domain: string
            problem_category: string
            task_type: string
            was_on_time: boolean
          }>)
            .filter((row) => row.user_id === application.applicant_id)
            .map(({ user_id: _userId, ...row }) => row),
          is_project_member: projectMembers.has(application.applicant_id),
          is_organization_member: organizationMembers.has(application.applicant_id),
        }
      }),
    }
  }
}
