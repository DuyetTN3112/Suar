import { ProjectDetailReaderAdapter } from './adapters/project_detail_reader_adapter.js'
import { ProjectTaskReaderWriterAdapter } from './adapters/project_task_reader_writer_adapter.js'
import {
  projectDetailProjectionReader,
  projectLifecycleRepository,
  projectMembershipRepository,
} from './project_persistence_composition.js'
import { taskUserReader } from './task_external_dependencies_composition.js'

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
    projectDetailProjectionReader
  ).get(input, execCtx)
}
