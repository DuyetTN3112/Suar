import { TaskSkillReaderAdapter } from '#composition/adapters/tasks/task_skill_reader_adapter'
import type { TaskSearchDocument } from '#modules/search/domain/entity-search/task_search_document'
import type {
  TaskRequirementReferenceFacts,
  TaskRequirementSkillReference,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

export class CountingTaskSkillReader extends TaskSkillReaderAdapter {
  readonly requestedSkillIdBatches: string[][] = []

  constructor(
    private readonly transform: (
      skills: TaskRequirementSkillReference[]
    ) => TaskRequirementSkillReference[] = (skills) => skills
  ) {
    super()
  }

  override async findTaskRequirementReferenceFacts(ids: {
    skillIds: string[]
    proficiencyLevelIds: string[]
  }): Promise<TaskRequirementReferenceFacts> {
    this.requestedSkillIdBatches.push(ids.skillIds)
    const facts = await super.findTaskRequirementReferenceFacts(ids)
    return { ...facts, skills: this.transform(facts.skills) }
  }
}

export function searchDocument(
  overrides: Partial<TaskSearchDocument> & Pick<TaskSearchDocument, 'task_id' | 'title'>
): TaskSearchDocument {
  return {
    organization_id: 'wp03-organization',
    creator_id: 'wp03-creator',
    project_id: null,
    description: '',
    acceptance_criteria: '',
    context_background: null,
    required_skill_ids: [],
    required_skill_ids_known: true,
    required_skill_ids_count: 0,
    required_skill_category_codes: [],
    required_skill_category_codes_known: true,
    required_skill_category_codes_count: 0,
    required_skills_text: '',
    business_domains: [],
    business_domains_coverage: 'missing',
    problem_categories: [],
    problem_categories_coverage: 'missing',
    task_types: [],
    task_types_coverage: 'missing',
    difficulty: null,
    status: 'todo',
    label: 'task',
    priority: 'medium',
    task_visibility: 'external',
    is_public: true,
    is_deleted: false,
    marketplace_visible: true,
    application_eligible: true,
    member_visible: true,
    assigned_to: null,
    verification_method: 'automated_test',
    tech_stack: [],
    tech_stack_known: true,
    tech_stack_count: 0,
    domain_tags: [],
    domain_tags_known: true,
    domain_tags_count: 0,
    learning_objectives: [],
    learning_objectives_known: true,
    learning_objectives_count: 0,
    role_in_task: null,
    autonomy_level: null,
    collaboration_type: null,
    impact_scope: null,
    environment: null,
    application_deadline: null,
    due_date: null,
    created_at: '2026-08-01T00:00:00.000Z',
    estimated_users_affected: null,
    external_applications_count: 0,
    deleted_at: null,
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
    task_id: overrides.task_id,
    title: overrides.title,
  }
}

export async function setupTaskSearchDocGroup(): Promise<void> {
  await setupApp()
}

export async function teardownTaskSearchDocGroup(): Promise<void> {
  await teardownApp()
}

export async function cleanupTaskSearchDocData(): Promise<void> {
  await cleanupTestData()
}
