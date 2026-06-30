import type { ProjectContextFactV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

/** Public Projects boundary consumed by Task resolution; never exposes Project infra models. */
export interface ProjectContextFactReader {
  readProjectContextFact(input: {
    projectId: string
    organizationId: string
  }): Promise<ProjectContextFactV1 | null>
}
