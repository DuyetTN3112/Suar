import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { GetPublicTasksDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import { makeGetPublicTasksQuery } from '#modules/tasks/bootstrap/task_query_factory'

export interface PublicTaskListingInput {
  page?: number
  per_page?: number
  task_ids?: string[] | null
  skill_categories?: string[] | null
  skill_ids?: string[] | null
  keyword?: string | null
  difficulty?: string | null
  task_type?: string | null
  business_domain?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  verification_method?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  accepting_applications?: 'open' | 'closed' | null
  sort_by?: 'created_at' | 'due_date' | 'recommended'
  sort_order?: 'asc' | 'desc'
}

export type PublicTaskListingResult = Awaited<
  ReturnType<ReturnType<typeof makeGetPublicTasksQuery>['handle']>
>

export async function listPublicTasks(
  input: PublicTaskListingInput,
  execCtx: HttpActionContext
): Promise<PublicTaskListingResult> {
  return makeGetPublicTasksQuery(execCtx).handle(GetPublicTasksDTO.fromFilters(input))
}
