import { ProjectDetailReaderAdapter } from '#composition/adapters/projects/project_detail_reader_adapter'
import { ProjectTaskReaderWriterAdapter } from '#composition/adapters/projects/project_task_reader_writer_adapter'
import { projectContextFactReader } from '#composition/projects/project-context/project_context_fact_reader_composition'
import {
  projectDetailProjectionReader,
  projectLifecycleRepository,
  projectMembershipRepository,
} from '#composition/projects/project-membership/project_persistence_composition'
import { taskUserReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  GetProjectDetailInput,
  GetProjectDetailResult,
} from '#modules/projects/public_contracts/project_detail'

export async function getProjectDetail(
  input: GetProjectDetailInput,
  execCtx: HttpActionContext
): Promise<GetProjectDetailResult> {
  const taskReader = new ProjectTaskReaderWriterAdapter(taskUserReader)
  return new ProjectDetailReaderAdapter(
    taskReader,
    projectLifecycleRepository,
    projectMembershipRepository,
    projectDetailProjectionReader,
    projectContextFactReader
  ).get(input, execCtx)
}
