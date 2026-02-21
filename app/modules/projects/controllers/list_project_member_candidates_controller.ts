import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetProjectMemberCandidatesQuery from '#modules/projects/actions/queries/get_project_member_candidates_query'

function mapMemberCandidate(candidate: {
  user_id: string
  username: string
  email: string
  org_role: string
  reviewed_skills_count: number
  imported_skills_count: number
  under_dispute_skills_count: number
  latest_confidence_signal: 'low' | 'medium' | 'high' | null
}) {
  return {
    userId: candidate.user_id,
    username: candidate.username,
    email: candidate.email,
    orgRole: candidate.org_role,
    reviewedSkillsCount: candidate.reviewed_skills_count,
    importedSkillsCount: candidate.imported_skills_count,
    underDisputeSkillsCount: candidate.under_dispute_skills_count,
    latestConfidenceSignal: candidate.latest_confidence_signal,
  }
}

/**
 * GET /api/projects/:id/member-candidates → List org members not already in project
 */
export default class ListProjectMemberCandidatesController {
  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const query = new GetProjectMemberCandidatesQuery(actionContextFromHttp(ctx))
    const result = await query.handle(omitUndefined({
      project_id: params['projectId'] as string,
      search: request.input('search') as string | undefined,
    }))
    return wrapApiV1Data(result.map((candidate) => mapMemberCandidate(candidate)))
  }
}
