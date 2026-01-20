import db from '@adonisjs/lucid/services/db'

import type {
  ProjectMemberCandidateReader,
  ProjectMemberCandidateRecord,
} from '#modules/projects/actions/ports/outbound/project_member_candidate_reader'

export class LucidProjectMemberCandidateReader implements ProjectMemberCandidateReader {
  async listApprovedNonMembers(
    projectId: string,
    organizationId: string
  ): Promise<ProjectMemberCandidateRecord[]> {
    const rows = (await db
      .from('organization_users as membership')
      .join('users as user', 'user.id', 'membership.user_id')
      .where('membership.organization_id', organizationId)
      .where('membership.status', 'approved')
      .whereNotExists((query) => {
        void query
          .from('project_members as project_member')
          .select('project_member.user_id')
          .whereRaw('project_member.user_id = membership.user_id')
          .where('project_member.project_id', projectId)
      })
      .select(
        'user.id as user_id',
        'user.username',
        'user.email',
        'membership.org_role'
      )) as Array<{
      user_id: string
      username: string
      email: string | null
      org_role: string
    }>

    return rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      email: row.email ?? '',
      organizationRole: row.org_role,
    }))
  }
}
