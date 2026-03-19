import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'

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
@inject()
export default class ListProjectMemberCandidatesController {
  constructor(private readonly queries: ProjectQueryFactory) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const result = await this.queries.makeMemberCandidates(actionContextFromHttp(ctx)).handle(
      omitUndefined({
        project_id: params['projectId'] as string,
        search: request.input('search') as string | undefined,
      })
    )
    return wrapApiV1Data(result.map((candidate) => mapMemberCandidate(candidate)))
  }
}
