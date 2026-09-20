export type WizardStep = 'foundation' | 'staffing' | 'launch'
export type ProjectSetupPreset = 'delivery_squad' | 'review_pipeline' | 'marketplace_rollout'

export type BlueprintRoleSlot = {
  templateCode: string
  name: string
  skills: string
  note: string
}

export type BlueprintRoleSlotDefinition = {
  templateCode: string
  nameKey: string
  nameFallback: string
  skillsKey: string
  skillsFallback: string
  noteKey?: string
  noteFallback?: string
}

export type BlueprintDefinition = {
  labelKey: string
  labelFallback: string
  descriptionKey: string
  descriptionFallback: string
  roles: BlueprintRoleSlotDefinition[]
}

export type WizardStepConfig = {
  id: WizardStep
  titleKey: string
  titleFallback: string
  descriptionKey: string
  descriptionFallback: string
}

export const FOUNDATION_STEP: WizardStepConfig = {
  id: 'foundation',
  titleKey: 'project.create_page.steps.foundation.title',
  titleFallback: '1. Project foundation',
  descriptionKey: 'project.create_page.steps.foundation.description',
  descriptionFallback: 'Name, organization, status, timeline.',
}

export const WIZARD_STEPS: WizardStepConfig[] = [
  FOUNDATION_STEP,
  {
    id: 'staffing',
    titleKey: 'project.create_page.steps.staffing.title',
    titleFallback: '2. Staffing',
    descriptionKey: 'project.create_page.steps.staffing.description',
    descriptionFallback: 'Initial roles and first owners.',
  },
  {
    id: 'launch',
    titleKey: 'project.create_page.steps.launch.title',
    titleFallback: '3. After create',
    descriptionKey: 'project.create_page.steps.launch.description',
    descriptionFallback: 'Choose the next step.',
  },
]

export const ROLE_BLUEPRINTS: Record<ProjectSetupPreset, BlueprintDefinition> = {
  delivery_squad: {
    labelKey: 'project.create_page.blueprints.delivery_squad.label',
    labelFallback: 'Delivery squad',
    descriptionKey: 'project.create_page.blueprints.delivery_squad.description',
    descriptionFallback: '',
    roles: [
      {
        templateCode: 'frontend_engineer',
        nameKey: 'project.create_page.blueprints.delivery_squad.roles.frontend_engineer.name',
        nameFallback: 'Frontend engineer',
        skillsKey: 'project.create_page.blueprints.delivery_squad.roles.frontend_engineer.skills',
        skillsFallback: 'React L7, Testing L6, UI quality L6',
      },
      {
        templateCode: 'fullstack_engineer',
        nameKey: 'project.create_page.blueprints.delivery_squad.roles.fullstack_engineer.name',
        nameFallback: 'Fullstack engineer',
        skillsKey: 'project.create_page.blueprints.delivery_squad.roles.fullstack_engineer.skills',
        skillsFallback: 'API delivery L6, Integration L6, Scope ownership L6',
      },
      {
        templateCode: 'qa_engineer',
        nameKey: 'project.create_page.blueprints.delivery_squad.roles.qa_engineer.name',
        nameFallback: 'QA / reviewer',
        skillsKey: 'project.create_page.blueprints.delivery_squad.roles.qa_engineer.skills',
        skillsFallback: 'Test design L6, Review discipline L7, Bug triage L6',
      },
    ],
  },
  review_pipeline: {
    labelKey: 'project.create_page.blueprints.review_pipeline.label',
    labelFallback: 'Review pipeline',
    descriptionKey: 'project.create_page.blueprints.review_pipeline.description',
    descriptionFallback: '',
    roles: [
      {
        templateCode: 'frontend_engineer',
        nameKey: 'project.create_page.blueprints.review_pipeline.roles.frontend_engineer.name',
        nameFallback: 'Delivery contributor',
        skillsKey: 'project.create_page.blueprints.review_pipeline.roles.frontend_engineer.skills',
        skillsFallback: 'Execution L6, Evidence quality L6, Review response L6',
      },
      {
        templateCode: 'backend_engineer',
        nameKey: 'project.create_page.blueprints.review_pipeline.roles.backend_engineer.name',
        nameFallback: 'System contributor',
        skillsKey: 'project.create_page.blueprints.review_pipeline.roles.backend_engineer.skills',
        skillsFallback: 'Implementation L6, Reliability L6, Handover quality L6',
      },
      {
        templateCode: 'qa_engineer',
        nameKey: 'project.create_page.blueprints.review_pipeline.roles.qa_engineer.name',
        nameFallback: 'Reviewer / approver',
        skillsKey: 'project.create_page.blueprints.review_pipeline.roles.qa_engineer.skills',
        skillsFallback: 'Domain review L7, Rubric judgment L7, Dispute awareness L6',
      },
    ],
  },
  marketplace_rollout: {
    labelKey: 'project.create_page.blueprints.marketplace_rollout.label',
    labelFallback: 'Marketplace rollout',
    descriptionKey: 'project.create_page.blueprints.marketplace_rollout.description',
    descriptionFallback: '',
    roles: [
      {
        templateCode: 'fullstack_engineer',
        nameKey: 'project.create_page.blueprints.marketplace_rollout.roles.fullstack_engineer.name',
        nameFallback: 'Core specialist',
        skillsKey: 'project.create_page.blueprints.marketplace_rollout.roles.fullstack_engineer.skills',
        skillsFallback: 'Primary domain L7, Delivery autonomy L6, Collaboration L6',
      },
      {
        templateCode: 'qa_engineer',
        nameKey: 'project.create_page.blueprints.marketplace_rollout.roles.qa_engineer.name',
        nameFallback: 'Quality / reviewer',
        skillsKey: 'project.create_page.blueprints.marketplace_rollout.roles.qa_engineer.skills',
        skillsFallback: 'Review responsiveness L6, Evidence quality L6, Acceptance clarity L6',
      },
      {
        templateCode: 'devops_engineer',
        nameKey: 'project.create_page.blueprints.marketplace_rollout.roles.devops_engineer.name',
        nameFallback: 'Operations specialist',
        skillsKey: 'project.create_page.blueprints.marketplace_rollout.roles.devops_engineer.skills',
        skillsFallback: 'Release readiness L6, Ops continuity L6, Environment control L6',
      },
    ],
  },
}

export function resolveBlueprint(
  preset: ProjectSetupPreset,
  t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
): { label: string; description: string; roles: BlueprintRoleSlot[] } {
  const definition = ROLE_BLUEPRINTS[preset]
  return {
    label: t(definition.labelKey, {}, definition.labelFallback),
    description: t(definition.descriptionKey, {}, definition.descriptionFallback),
    roles: definition.roles.map((role) => ({
      templateCode: role.templateCode,
      name: t(role.nameKey, {}, role.nameFallback),
      skills: t(role.skillsKey, {}, role.skillsFallback),
      note: '',
    })),
  }
}

export function resolveLaunchSummary(
  firstTaskPlan: 'launch_immediately' | 'setup_roles_first' | 'collect_people_first',
  t: (key: string, params?: Record<string, unknown>, fallback?: string) => string
): string {
  if (firstTaskPlan === 'launch_immediately') {
    return t('project.create_page.launch_summary.launch_immediately', {}, 'Open tasks now')
  }
  if (firstTaskPlan === 'collect_people_first') {
    return t('project.create_page.launch_summary.collect_people_first', {}, 'Add people first')
  }
  return t('project.create_page.launch_summary.setup_roles_first', {}, 'Set up roles first')
}

export function buildProjectCreatePayload(params: {
  formData: {
    name: string
    description: string
    organization_id: string
    status: string
    start_date: string
    end_date: string
    manager_id: string
    business_domains: string[]
  }
  managerId: string
  firstTaskPlan: 'launch_immediately' | 'setup_roles_first' | 'collect_people_first'
  selectedTemplateCodes: string[]
  staffingSelections: Array<{ userId: string; role: { templateCode: string } }>
}): Record<string, unknown> {
  const { formData, managerId, firstTaskPlan, selectedTemplateCodes, staffingSelections } = params
  const afterCreateFocus =
    firstTaskPlan === 'collect_people_first'
      ? 'members'
      : firstTaskPlan === 'launch_immediately'
        ? 'tasks'
        : 'roles'

  return {
    ...formData,
    organizationId: formData.organization_id,
    startDate: formData.start_date,
    endDate: formData.end_date,
    managerId,
    afterCreateFocus,
    seedRoleTemplates: selectedTemplateCodes,
    initialStaffingAssignments: staffingSelections.map((selection) => ({
      userId: selection.userId,
      templateCode: selection.role.templateCode,
    })),
  }
}
