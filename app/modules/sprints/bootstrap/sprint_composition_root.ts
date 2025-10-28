import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/sprint_external_dependencies'
import { MonolithSprintProjectAccessReader } from '#modules/sprints/bootstrap/adapters/monolith_sprint_project_access_reader'

export const sprintExternalDeps: SprintExternalDependencies = {
  projectAccess: new MonolithSprintProjectAccessReader(),
}
