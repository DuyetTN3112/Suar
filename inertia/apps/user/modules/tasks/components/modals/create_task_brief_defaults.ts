import {
  createEmptyTaskBrief,
  type TaskBriefV2,
} from '@/apps/shared/tasks/task_brief_contract'
import type { TaskCreateFormData } from '@/apps/user/modules/tasks/types/create_form_types'

export function createInitialTaskBrief(): TaskBriefV2 {
  return {
    ...createEmptyTaskBrief(),
    workItems: [
      {
        id: 'initial-work-item',
        affectedArea: '',
        requiredChange: '',
        resultingBehaviour: '',
      },
    ],
    scope: [{ id: 'initial-scope-item', text: '' }],
    outOfScope: [{ id: 'initial-out-of-scope-item', text: '' }],
    businessRules: [
      {
        id: 'initial-business-rule',
        actor: '',
        condition: '',
        permission: '',
        systemResult: '',
      },
    ],
    constraints: [{ id: 'initial-constraint', text: '' }],
    dependencies: [
      {
        id: 'initial-dependency',
        dependency: '',
        owner: '',
        state: 'available',
      },
    ],
    deliverables: [
      {
        id: 'initial-deliverable',
        outputType: '',
        locationOrRecipient: '',
        minimumState: '',
      },
    ],
    acceptanceCriteria: [
      {
        id: 'initial-acceptance-criterion',
        condition: '',
        action: '',
        observableResult: '',
      },
    ],
    qualityRequirements: [
      {
        id: 'initial-quality-requirement',
        property: '',
        appliesTo: '',
        observableCheck: '',
      },
    ],
    desiredValue: { beneficiary: '', usefulState: '' },
  }
}

export function getDefaultTaskCreateFormData(): TaskCreateFormData {
  return {
    title: '',
    description: '',
    task_status_id: '',
    task_type: 'feature_development',
    verification_method: 'code_review',
    project_id: '',
    priority: '',
    label: '',
    task_visibility: 'internal',
    reviewer_visibility: 'project',
    assigned_to: '',
    reviewer_user_id: '',
    due_date: '',
    parent_task_id: '',
    estimated_time: '0',
    required_skills: [],
    acceptance_criteria: '',
    context_background: '',
    role_in_task: '',
    business_domain: '',
    problem_category: '',
    tech_stack_text: '',
    learning_objectives_text: '',
    domain_tags_text: '',
    scope_text: '',
    out_of_scope_text: '',
    deliverables_text: '',
    quality_requirements_text: '',
    constraints_text: '',
    dependencies_text: '',
    authoring_mode: 'evidence_enabled',
    // A newly opened form is a draft until the creator deliberately chooses
    // “Publish and assign”. Do not present publish-only required fields first.
    authoring_intent: 'save_draft',
    creator_confirmed: false,
    constraints_addressed: false,
    dependencies_addressed: false,
    supporting_reference_uri: '',
    supporting_reference_title: '',
    reviewer_role_code: 'org_owner',
    profile_eligibility: true,
    brief: createInitialTaskBrief(),
  }
}
