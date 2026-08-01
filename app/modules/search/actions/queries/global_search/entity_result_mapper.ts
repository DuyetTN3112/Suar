import { buildCommentResult } from './comment_result_mapper.js'
import { asSearchRecord } from './entity_record_reader.js'
import { buildOrganizationSearchResults } from './organization_result_mapper.js'
import { buildProjectSearchResults } from './project_result_mapper.js'
import { buildSkillSearchResults } from './skill_result_mapper.js'
import { buildTalentSearchResults } from './talent_result_mapper.js'
import { buildTaskSearchResults } from './task_result_mapper.js'

import type {
  GlobalSearchCenterResult,
  GlobalSearchResult,
} from '#modules/search/public_contracts/global_search_contract'

export function buildSearchCandidates(
  grouped: Omit<GlobalSearchResult, 'results'>,
  query: string
): GlobalSearchCenterResult[] {
  return [
    ...grouped.tasks.flatMap((task) => buildTaskSearchResults(asSearchRecord(task), query)),
    ...grouped.projects.flatMap((project) =>
      buildProjectSearchResults(asSearchRecord(project), query)
    ),
    ...grouped.comments.map((comment) => buildCommentResult(comment, query)),
    ...grouped.talents.flatMap((talent) => buildTalentSearchResults(asSearchRecord(talent), query)),
    ...grouped.skills.flatMap((skill) => buildSkillSearchResults(asSearchRecord(skill), query)),
    ...grouped.organizations.flatMap((organization) =>
      buildOrganizationSearchResults(asSearchRecord(organization), query)
    ),
  ]
}
