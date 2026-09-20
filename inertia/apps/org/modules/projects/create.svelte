<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import { format } from 'date-fns'
  import { ChevronLeft, ChevronRight } from 'lucide-svelte'

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
  import {
    FOUNDATION_STEP,
    WIZARD_STEPS,
    buildProjectCreatePayload,
    resolveBlueprint,
    resolveLaunchSummary,
    type BlueprintRoleSlot,
    type ProjectSetupPreset,
    type WizardStep,
  } from '@/apps/shared/projects/project_create_blueprints'
  import ProjectCreateStepNav from '@/apps/shared/projects/project_create_step_nav.svelte'

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
    business_domains: [] as string[],
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

  const steps = WIZARD_STEPS
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
    steps.find((step) => step.id === currentStep) ?? FOUNDATION_STEP
  )
  const launchSummary = $derived(resolveLaunchSummary(firstTaskPlan, t))
  const selectedBlueprint = $derived(resolveBlueprint(projectSetupPreset, t))
  const selectedTemplateCodes = $derived(
    selectedBlueprint.roles.map((role: BlueprintRoleSlot) => role.templateCode)
  )
  const organizationMemberPool = $derived<OrganizationCandidate[]>(
    currentOrganization ? organizationMembersByOrg[currentOrganization.id] ?? [] : []
  )
  const organizationMemberLookup = $derived(
    new Map(organizationMemberPool.map((member) => [member.id, member]))
  )
  const staffingSelections = $derived(
    selectedBlueprint.roles
      .map((role: BlueprintRoleSlot) => {
        const userId = initialStaffingAssignments[role.templateCode] ?? ''
        const member = organizationMemberLookup.get(userId) ?? null
        return { role, userId, member }
      })
      .filter((selection: { userId: string; member: OrganizationCandidate | null }) => selection.userId.length > 0 && selection.member)
  )
  const selectedStaffingUserIds = $derived(
    staffingSelections.map((selection: { userId: string }) => selection.userId)
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

    const payload = buildProjectCreatePayload({
      formData,
      managerId: authUser?.id ?? '',
      firstTaskPlan,
      selectedTemplateCodes,
      staffingSelections,
    })

    router.post('/projects', payload as never, {
      preserveState: true,
      preserveScroll: true,
    })
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

      <ProjectCreateStepNav
        {steps}
        {currentStep}
        {stepIndex}
        {hasFoundationReady}
        onSelectStep={(stepId: WizardStep) => { currentStep = stepId }}
        {t}
      />
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
              onDomainsChange={(domains: string[]) => {
                formData = { ...formData, business_domains: domains }
                clearError('business_domains')
              }}
            />
          {:else if currentStep === 'staffing'}
            <ProjectCreateStaffingStep
              bind:deliveryModel
              bind:staffingFocus
              bind:projectSetupPreset
              {initialStaffingAssignments}
              {selectedBlueprint}
              {organizationMemberPool}
              {staffingCoverageSummary}
              {hasDuplicateStaffingAssignments}
              {errors}
              onStaffingChange={handleInitialStaffingChange}
            />
          {:else}
            <ProjectCreateLaunchStep
              bind:firstTaskPlan
              {launchSummary}
              {staffingCoverageSummary}
            />
          {/if}
        </CardContent>
        <CardFooter class="flex justify-between gap-3 border-t p-6">
          <div>
            {#if currentStep !== 'foundation'}
              <Button type="button" variant="outline" onclick={goToPreviousStep}>
                <ChevronLeft class="size-4" />
                {t('project.create_page.nav.previous', {}, 'Previous')}
              </Button>
            {/if}
          </div>

          <div class="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onclick={() => router.visit('/projects')}
            >
              {t('common.cancel', {}, 'Cancel')}
            </Button>
            {#if currentStep !== 'launch'}
              <Button type="button" onclick={goToNextStep}>
                {t('project.create_page.nav.next', {}, 'Next')}
                <ChevronRight class="size-4" />
              </Button>
            {:else}
              <Button type="submit">
                {t('project.create_page.nav.submit', {}, 'Create project')}
              </Button>
            {/if}
          </div>
        </CardFooter>
      </Card>
    </form>
  </div>
</OrganizationLayout>
