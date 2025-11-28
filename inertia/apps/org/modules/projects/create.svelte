<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { format } from 'date-fns'
  import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-svelte'

  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardFooter from '@/apps/org/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'

  import ProjectCreateFoundationStep from './components/project_create_foundation_step.svelte'
  import ProjectCreateStaffingStep from './components/project_create_staffing_step.svelte'
  import ProjectCreateLaunchStep from './components/project_create_launch_step.svelte'
  import type { OrganizationCandidate, ProjectCreateProps } from './types'

  type WizardStep = 'foundation' | 'staffing' | 'launch'
  type ProjectSetupPreset = 'delivery_squad' | 'review_pipeline' | 'marketplace_rollout'
  type BlueprintRoleSlot = {
    templateCode: string
    name: string
    skills: string
    note: string
  }
  type BlueprintRoleSlotDefinition = {
    templateCode: string
    nameKey: string
    nameFallback: string
    skillsKey: string
    skillsFallback: string
    noteKey?: string
    noteFallback?: string
  }
  type BlueprintDefinition = {
    labelKey: string
    labelFallback: string
    descriptionKey: string
    descriptionFallback: string
    roles: BlueprintRoleSlotDefinition[]
  }
  type WizardStepConfig = {
    id: WizardStep
    titleKey: string
    titleFallback: string
    descriptionKey: string
    descriptionFallback: string
  }

  const { organizations, organizationMembersByOrg, statuses, auth }: ProjectCreateProps = $props()
  const { t } = $derived(useTranslation())
  const authUser = $derived(auth.user ?? null)

  let formData = $state({
    name: '',
    description: '',
    organization_id: '',
    status: '',
    start_date: '',
    end_date: '',
    manager_id: '',
  })

  let startDate = $state<Date | undefined>(undefined)
  let endDate = $state<Date | undefined>(undefined)
  let errors = $state<Record<string, string>>({})
  let currentStep = $state<WizardStep>('foundation')
  let deliveryModel = $state<'core_team' | 'hybrid' | 'exploration'>('core_team')
  let staffingFocus = $state<'fill_now' | 'fill_after_scope' | 'explore_market'>('fill_now')
  let firstTaskPlan = $state<'launch_immediately' | 'setup_roles_first' | 'collect_people_first'>('setup_roles_first')
  let projectSetupPreset = $state<ProjectSetupPreset>('delivery_squad')
  let initialStaffingAssignments = $state<Record<string, string>>({})

  const foundationStep: WizardStepConfig = {
    id: 'foundation',
    titleKey: 'project.create_page.steps.foundation.title',
    titleFallback: '1. Project foundation',
    descriptionKey: 'project.create_page.steps.foundation.description',
    descriptionFallback: 'Name, organization, status, timeline.',
  }
  const steps: WizardStepConfig[] = [
    foundationStep,
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

  const stepIndex = $derived(steps.findIndex((step) => step.id === currentStep))
  const currentOrganization = $derived(
    organizations.find((organization) => organization.id === formData.organization_id) ?? null
  )
  const hasFoundationReady = $derived(
    Boolean(formData.name.trim()) &&
      Boolean(formData.organization_id) &&
      Boolean(formData.status)
  )
  const currentStepConfig = $derived(
    steps.find((step) => step.id === currentStep) ?? foundationStep
  )
  const launchSummary = $derived(
    firstTaskPlan === 'launch_immediately'
      ? t('project.create_page.launch_summary.launch_immediately', {}, 'Open tasks now')
      : firstTaskPlan === 'collect_people_first'
        ? t('project.create_page.launch_summary.collect_people_first', {}, 'Add people first')
        : t('project.create_page.launch_summary.setup_roles_first', {}, 'Set up roles first')
  )
  const roleBlueprints = {
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
  } satisfies Record<ProjectSetupPreset, BlueprintDefinition>
  const selectedBlueprintDefinition = $derived(roleBlueprints[projectSetupPreset])
  const selectedBlueprint = $derived<{
    label: string
    description: string
    roles: BlueprintRoleSlot[]
  }>({
    label: t(selectedBlueprintDefinition.labelKey, {}, selectedBlueprintDefinition.labelFallback),
    description: t(
      selectedBlueprintDefinition.descriptionKey,
      {},
      selectedBlueprintDefinition.descriptionFallback
    ),
    roles: selectedBlueprintDefinition.roles.map((role) => ({
      templateCode: role.templateCode,
      name: t(role.nameKey, {}, role.nameFallback),
      skills: t(role.skillsKey, {}, role.skillsFallback),
      note: '',
    })),
  })
  const selectedTemplateCodes = $derived(
    selectedBlueprintDefinition.roles.map((role) => role.templateCode)
  )
  const organizationMemberPool = $derived<OrganizationCandidate[]>(
    currentOrganization ? organizationMembersByOrg[currentOrganization.id] ?? [] : []
  )
  const organizationMemberLookup = $derived(
    new Map(organizationMemberPool.map((member) => [member.id, member]))
  )
  const staffingSelections = $derived(
    selectedBlueprint.roles
      .map((role) => {
        const userId = initialStaffingAssignments[role.templateCode] ?? ''
        const member = organizationMemberLookup.get(userId) ?? null
        return {
          role,
          userId,
          member,
        }
      })
      .filter((selection) => selection.userId.length > 0 && selection.member)
  )
  const selectedStaffingUserIds = $derived(
    staffingSelections.map((selection) => selection.userId)
  )
  const uniqueStaffingUserCount = $derived(new Set(selectedStaffingUserIds).size)
  const hasDuplicateStaffingAssignments = $derived(
    selectedStaffingUserIds.length !== uniqueStaffingUserCount
  )
  const staffingCoverageSummary = $derived(
    t(
      'project.create_page.staffing_coverage_summary',
      { assigned: staffingSelections.length, total: selectedBlueprint.roles.length },
      ':assigned/:total roles assigned.'
    )
  )
  $effect(() => {
    if (formData.organization_id) return
    const currentOrganizationId = authUser?.current_organization_id
    if (currentOrganizationId && organizations.some((org) => org.id === currentOrganizationId)) {
      formData = { ...formData, organization_id: currentOrganizationId }
      return
    }
    const [onlyOrganization] = organizations
    if (onlyOrganization && organizations.length === 1) {
      formData = { ...formData, organization_id: onlyOrganization.id }
    }
  })

  $effect(() => {
    const allowedTemplateCodes = new Set(selectedTemplateCodes)
    const allowedUserIds = new Set(organizationMemberPool.map((member) => member.id))
    const filteredAssignments = Object.fromEntries(
      Object.entries(initialStaffingAssignments).filter(
        ([templateCode, userId]) =>
          allowedTemplateCodes.has(templateCode) && allowedUserIds.has(userId)
      )
    )

    const currentKeys = Object.keys(initialStaffingAssignments)
    const filteredKeys = Object.keys(filteredAssignments)

    if (
      currentKeys.length !== filteredKeys.length ||
      currentKeys.some((key) => initialStaffingAssignments[key] !== filteredAssignments[key])
    ) {
      initialStaffingAssignments = filteredAssignments
    }
  })

  function clearError(name: string) {
    if (!errors[name]) return
    const { [name]: _, ...rest } = errors
    errors = rest
  }

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target
    formData = { ...formData, [name]: value }
    clearError(name)
  }

  function handleSelectChange(name: string, value: string) {
    formData = { ...formData, [name]: value }
    clearError(name)
  }

  function handleInitialStaffingChange(templateCode: string, userId: string) {
    if (!userId) {
      const { [templateCode]: _removed, ...rest } = initialStaffingAssignments
      initialStaffingAssignments = rest
      clearError('initialStaffing')
      return
    }

    initialStaffingAssignments = {
      ...initialStaffingAssignments,
      [templateCode]: userId,
    }
    clearError('initialStaffing')
  }

  function handleStartDateChange(date: Date | undefined) {
    startDate = date
    formData = {
      ...formData,
      start_date: date ? format(date, 'yyyy-MM-dd') : '',
    }
    clearError('start_date')
  }

  function handleEndDateChange(date: Date | undefined) {
    endDate = date
    formData = {
      ...formData,
      end_date: date ? format(date, 'yyyy-MM-dd') : '',
    }
    clearError('end_date')
  }

  function validateFoundation(): boolean {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = t('project.create_page.validation.required', {}, 'This field is required')
    }

    if (!formData.organization_id) {
      newErrors.organization_id = t('project.create_page.validation.required', {}, 'This field is required')
    }

    if (!formData.status) {
      newErrors.status = t('project.create_page.validation.required', {}, 'This field is required')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = { ...errors, ...newErrors }
      return false
    }

    return true
  }

  function goToNextStep() {
    if (currentStep === 'foundation' && !validateFoundation()) {
      return
    }

    if (currentStep === 'foundation') {
      currentStep = 'staffing'
      return
    }

    if (currentStep === 'staffing') {
      currentStep = 'launch'
    }
  }

  function goToPreviousStep() {
    if (currentStep === 'launch') {
      currentStep = 'staffing'
      return
    }

    if (currentStep === 'staffing') {
      currentStep = 'foundation'
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault()

    if (!validateFoundation()) {
      currentStep = 'foundation'
      return
    }

    if (hasDuplicateStaffingAssignments) {
      errors = {
        ...errors,
        initialStaffing:
          t(
            'project.create_page.validation.duplicate_staffing',
            {},
            'Each core member should hold only one role slot during setup. If someone needs multiple roles, adjust it later in the project workspace.'
          ),
      }
      currentStep = 'staffing'
      return
    }

    const afterCreateFocus =
      firstTaskPlan === 'collect_people_first'
        ? 'members'
        : firstTaskPlan === 'launch_immediately'
          ? 'tasks'
          : 'roles'

    router.post(
      '/projects',
      {
        ...formData,
        organizationId: formData.organization_id,
        startDate: formData.start_date,
        endDate: formData.end_date,
        managerId: authUser?.id ?? '',
        afterCreateFocus,
        seedRoleTemplates: selectedTemplateCodes,
        initialStaffingAssignments: staffingSelections.map((selection) => ({
          userId: selection.userId,
          templateCode: selection.role.templateCode,
        })),
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  }
</script>

<svelte:head>
  <title>{t('project.create_page.page_title', {}, 'Create new project')}</title>
</svelte:head>

<OrganizationLayout title={t('project.create_page.page_title', {}, 'Create new project')}>
  <div class="space-y-6 p-4 sm:p-6">
    <div class="grid gap-4">
      <div class="rounded-3xl border border-border bg-card p-6 shadow-suar-xs">
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">
          {t('project.create_page.hero_title', {}, 'Create project')}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('project.create_page.steps_heading', {}, 'Steps')}</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-3 md:grid-cols-3">
          {#each steps as step, index}
            <button
              type="button"
              class={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${currentStep === step.id ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-secondary/30'}`}
              onclick={() => {
                if (step.id === 'foundation' || hasFoundationReady) {
                  currentStep = step.id
                }
              }}
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-foreground">
                    {t(step.titleKey, {}, step.titleFallback)}
                  </p>
                  <p class="mt-1 text-xs leading-5 text-muted-foreground">
                    {t(step.descriptionKey, {}, step.descriptionFallback)}
                  </p>
                </div>
                {#if index < stepIndex || (step.id === 'foundation' && hasFoundationReady)}
                  <CheckCircle2 class="mt-0.5 size-4 text-emerald-600" />
                {/if}
              </div>
            </button>
          {/each}
        </CardContent>
      </Card>
    </div>

    <form onsubmit={handleSubmit} class="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {t(currentStepConfig.titleKey, {}, currentStepConfig.titleFallback)}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-5">
          {#if currentStep === 'foundation'}
            <ProjectCreateFoundationStep
              bind:formData
              {organizations}
              {statuses}
              {errors}
              bind:startDate
              bind:endDate
              onStartDateChange={handleStartDateChange}
              onEndDateChange={handleEndDateChange}
              onInputChange={handleChange}
              onSelectChange={handleSelectChange}
            />
          {/if}

          {#if currentStep === 'staffing'}
            <ProjectCreateStaffingStep
              {deliveryModel}
              {staffingFocus}
              {projectSetupPreset}
              {initialStaffingAssignments}
              {selectedBlueprint}
              {organizationMemberPool}
              {staffingCoverageSummary}
              {errors}
              {formData}
              onStaffingModelChange={(model: typeof deliveryModel) => { deliveryModel = model }}
              onStaffingFocusChange={(focus: typeof staffingFocus) => { staffingFocus = focus }}
              onPresetChange={(preset: ProjectSetupPreset) => { projectSetupPreset = preset }}
              onStaffingAssignmentChange={handleInitialStaffingChange}
            />
          {/if}

          {#if currentStep === 'launch'}
            <ProjectCreateLaunchStep
              {firstTaskPlan}
              {launchSummary}
              onLaunchPlanChange={(plan: typeof firstTaskPlan) => { firstTaskPlan = plan }}
            />
          {/if}
        </CardContent>

        <CardFooter class="flex justify-between border-t pt-6">
          <div class="flex gap-2">
            {#if currentStep !== 'foundation'}
              <Button type="button" variant="outline" onclick={goToPreviousStep}>
                <ChevronLeft class="mr-1 h-4 w-4" />
                {t('project.create_page.back', {}, 'Back')}
              </Button>
            {/if}
          </div>

          <div class="flex gap-2">
            {#if currentStep !== 'launch'}
              <Button type="button" onclick={goToNextStep}>
                {t('project.create_page.next', {}, 'Next')}
                <ChevronRight class="ml-1 h-4 w-4" />
              </Button>
            {/if}
            {#if currentStep === 'launch'}
              <Button type="submit">
                {t('project.create_page.submit', {}, 'Create project')}
              </Button>
            {/if}
          </div>
        </CardFooter>
      </Card>
    </form>
  </div>
</OrganizationLayout>
