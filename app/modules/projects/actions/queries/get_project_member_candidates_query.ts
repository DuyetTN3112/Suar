/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import db from '@adonisjs/lucid/services/db'

import { BaseQuery } from '#modules/projects/actions/base_query'

export interface GetProjectMemberCandidatesDTO {
  project_id: string
  search?: string
}

export interface ProjectMemberCandidate {
  user_id: string
  username: string
  email: string
  org_role: string
}

export default class GetProjectMemberCandidatesQuery extends BaseQuery<
  GetProjectMemberCandidatesDTO,
  ProjectMemberCandidate[]
> {
  async handle(dto: GetProjectMemberCandidatesDTO): Promise<ProjectMemberCandidate[]> {
    const projectRow = await db
      .from('projects')
      .where('id', dto.project_id)
      .select('organization_id')
      .first()

    if (!projectRow) {
      throw new Error('Project not found')
    }

    const projectMemberIds = await db
      .from('project_members')
      .where('project_id', dto.project_id)
      .select('user_id')
    const excludeIds = new Set<string>(
      projectMemberIds.map((r: { user_id: string }) => r.user_id)
    )

    const rows = (await db
      .from('organization_users as ou')
      .join('users as u', 'u.id', 'ou.user_id')
      .where('ou.organization_id', (projectRow as { organization_id: string }).organization_id)
      .where('ou.status', 'approved')
      .select('u.id as user_id', 'u.username', 'u.email', 'ou.org_role')) as unknown as {
      user_id: string
      username: string
      email: string
      org_role: string
    }[]

    return rows
      .filter((r) => !excludeIds.has(r.user_id))
      .filter((r) => {
        if (!dto.search || dto.search.trim().length === 0) return true
        const term = dto.search.trim().toLowerCase()
        return r.username.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)
      })
      .map((r) => ({
        user_id: r.user_id,
        username: r.username,
        email: r.email,
        org_role: r.org_role,
      }))
  }
}
