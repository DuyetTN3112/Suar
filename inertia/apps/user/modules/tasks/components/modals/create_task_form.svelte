<script lang="ts">
  import { tick } from 'svelte'
  import type { Snippet } from 'svelte'

  import {
    TASK_CREATE_FIELD_FOCUS_ID,
    TASK_CREATE_FIELD_TAB,
    TASK_CREATE_VALIDATION_ORDER,
    getFirstTaskCreateErrorField,
    getTaskCreateTabErrorCounts,
  } from '@/apps/shared/tasks/task_create_validation'
  import { isDocumentationTaskStatusId } from '@/apps/shared/tasks/documentation_task_status'
  import {
    calculateDueDateFromEstimate,
    calculateEstimateFromDueDate,
    formatLocalDate,
  } from '@/apps/shared/tasks/task_schedule'
  import { createEmptyTaskBrief, type TaskBriefV2 } from '@/apps/shared/tasks/task_brief_contract'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Tabs from '@/apps/user/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/user/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/user/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/user/shared/ui/tabs_trigger.svelte'
  import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'
  import type {
    TaskCreateAssigneeGroups,
    TaskCreateFormData,
    TaskCreateSkill,
  } from '@/apps/user/modules/tasks/types/create_form_types'

  import BasicFields from '@/apps/user/modules/tasks/components/modals/create_task_form/basic_fields.svelte'
  import DueDateField from '@/apps/user/modules/tasks/components/modals/create_task_form/due_date_field.svelte'
  import MetadataFields from '@/apps/user/modules/tasks/components/modals/create_task_form/metadata_fields.svelte'
  import TaskSkillsField from '@/apps/user/modules/tasks/components/modals/create_task_form/task_skills_field.svelte'
  import TaskBriefFields from '@/apps/user/modules/tasks/components/modals/create_task_form/task_brief_fields.svelte'
  import TaskVerificationMethodsField from '@/apps/user/modules/tasks/components/shared/task_verification_methods_field.svelte'

  interface Props {
    formData: TaskCreateFormData
    setFormData: (updater: (prev: typeof formData) => typeof formData) => void
    errors: Record<string, string>
    statuses: { value: string; label: string; slug?: string; category?: string }[]
    priorities: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    assigneeGroups?: TaskCreateAssigneeGroups
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    availableSkills?: {
      id: string
      name: string
      categoryCode?: string | null
      rubricVersionId?: string | null
      rubric_version_id?: string | null
    }[]
    proficiencyLevels?: { value: string; label: string }[]
    selectedProjectVisibility?: string | null
    formError?: string
    assignmentContent?: Snippet
  }

  const {
    formData,
    setFormData,
    errors,
    statuses,
    priorities,
    labels,
    users,
    assigneeGroups,
    parentTasks,
    availableSkills,
    proficiencyLevels,
    formError,
    assignmentContent,
  }: Props = $props()
  const { t } = useTranslation()

  function fieldError(...keys: string[]): string | undefined {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(errors, key) && errors[key]) {
        return errors[key]
      }
    }

    return undefined
  }

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    const { name, value } = target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const dueDate = formatLocalDate(date)
      setFormData(prev => ({
        ...prev,
        // Keep the calendar date in the user's local timezone. ISO conversion
        // here would shift the selected day backwards in UTC+ timezones.
        due_date: dueDate,
        estimated_time: calculateEstimateFromDueDate(dueDate) ?? prev.estimated_time,
      }))
    } else {
      setFormData(prev => ({ ...prev, due_date: '' }))
    }
  }

  const handleEstimatedTimeChange = (value: string) => {
    const hours = Number(value)
    const dueDate = value.trim() && Number.isFinite(hours) && hours >= 0
      ? calculateDueDateFromEstimate(hours)
      : null
    setFormData(prev => ({
      ...prev,
      estimated_time: value,
      ...(dueDate ? { due_date: dueDate } : {}),
    }))
  }

  function parseDateInput(value: string): Date | undefined {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) return undefined
    return new Date(year, month - 1, day)
  }

  function handleAddSkill(skill: TaskCreateSkill) {
    setFormData(prev => ({
      ...prev,
      required_skills: [...prev.required_skills, skill]
    }))
  }

  function handleRemoveSkill(skillId: string) {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s.id !== skillId)
    }))
  }

  const handleTextareaInput = (name: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const isPublish = $derived((formData.authoring_intent ?? 'publish') === 'publish')
  const isDocumentationItem = $derived(
    isDocumentationTaskStatusId(formData.task_status_id, statuses)
  )
  const tabErrorCounts = $derived(getTaskCreateTabErrorCounts(errors))
  const knownErrorCount = $derived(
    TASK_CREATE_VALIDATION_ORDER.filter((field) => Boolean(errors[field])).length
  )

  function ensureRequiredBriefItems(brief: TaskBriefV2): TaskBriefV2 {
    let changed = false
    const next = { ...brief }

    if (next.workItems.length === 0) {
      next.workItems = [{
        id: 'initial-work-item',
        affectedArea: '',
        requiredChange: '',
        resultingBehaviour: '',
      }]
      changed = true
    }
    if (next.scope.length === 0) {
      next.scope = [{ id: 'initial-scope-item', text: '' }]
      changed = true
    }
    if (next.outOfScope.length === 0) {
      next.outOfScope = [{ id: 'initial-out-of-scope-item', text: '' }]
      changed = true
    }
    if (next.businessRules.length === 0) {
      next.businessRules = [{
        id: 'initial-business-rule',
        actor: '',
        condition: '',
        permission: '',
        systemResult: '',
      }]
      changed = true
    }
    if (next.constraints.length === 0) {
      next.constraints = [{ id: 'initial-constraint', text: '' }]
      changed = true
    }
    if (next.dependencies.length === 0) {
      next.dependencies = [{
        id: 'initial-dependency',
        dependency: '',
        owner: '',
        state: 'available',
      }]
      changed = true
    }
    if (next.deliverables.length === 0) {
      next.deliverables = [{
        id: 'initial-deliverable',
        outputType: '',
        locationOrRecipient: '',
        minimumState: '',
      }]
      changed = true
    }
    if (next.acceptanceCriteria.length === 0) {
      next.acceptanceCriteria = [{
        id: 'initial-acceptance-criterion',
        condition: '',
        action: '',
        observableResult: '',
      }]
      changed = true
    }
    if (next.qualityRequirements.length === 0) {
      next.qualityRequirements = [{
        id: 'initial-quality-requirement',
        property: '',
        appliesTo: '',
        observableCheck: '',
      }]
      changed = true
    }
    if (next.desiredValue === null) {
      next.desiredValue = { beneficiary: '', usefulState: '' }
      changed = true
    }

    return changed ? next : brief
  }

  const taskBrief = $derived(
    isDocumentationItem
      ? (formData.brief ?? createEmptyTaskBrief())
      : ensureRequiredBriefItems(formData.brief ?? createEmptyTaskBrief())
  )

  $effect(() => {
    if (isDocumentationItem) return
    const brief = formData.brief ?? createEmptyTaskBrief()
    if (ensureRequiredBriefItems(brief) === brief) return

    setFormData((previous) => ({
      ...previous,
      brief: ensureRequiredBriefItems(previous.brief ?? createEmptyTaskBrief()),
    }))
  })

  function updateBrief(updater: (previous: TaskBriefV2) => TaskBriefV2) {
    setFormData((previous) => ({
      ...previous,
      brief: updater(previous.brief ?? createEmptyTaskBrief()),
    }))
  }

  let activeTab = $state<'setup' | 'skills' | 'assignment' | 'planning' | 'contract'>('setup')

  $effect(() => {
    if (isDocumentationItem) {
      activeTab = 'setup'
      return
    }
    const firstErrorField = getFirstTaskCreateErrorField(errors)
    if (!firstErrorField) return

    activeTab = TASK_CREATE_FIELD_TAB[firstErrorField]
    void tick().then(() => {
      const target = document.getElementById(TASK_CREATE_FIELD_FOCUS_ID[firstErrorField])
      target?.focus()
    })
  })

</script>

<div class="space-y-6 py-2">
  {#if formError}
    <div
      class="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
      role="alert"
    >
      {formError}
    </div>
  {/if}

  {#if knownErrorCount > 0}
    <div
      class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      role="alert"
      aria-live="assertive"
      data-testid="task-create-validation-summary"
    >
      <p class="font-semibold">
        {t(
          'task.create.validation_summary',
          { count: knownErrorCount },
          ':count fields need your attention.'
        )}
      </p>
      <p class="mt-1 text-xs">
        {t(
          'task.create.validation_summary_help',
          {},
          'The first field is focused automatically. Each tab shows its remaining error count.'
        )}
      </p>
    </div>
  {/if}

  <Tabs
    value={activeTab}
    onValueChange={(value) => {
      activeTab = value as typeof activeTab
    }}
    class="space-y-4"
  >
    <TabsList class="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
      <TabsTrigger value="setup" class="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
        Nội dung Task
        {#if tabErrorCounts.setup > 0}<span class="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground" aria-label={t('task.create.tab_error_count', { count: tabErrorCounts.setup }, ':count errors')}>{tabErrorCounts.setup}</span>{/if}
      </TabsTrigger>
      {#if !isDocumentationItem}
        <TabsTrigger value="contract" class="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          Nghiệm thu
          {#if tabErrorCounts.contract > 0}<span class="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground" aria-label={t('task.create.tab_error_count', { count: tabErrorCounts.contract }, ':count errors')}>{tabErrorCounts.contract}</span>{/if}
        </TabsTrigger>
        <TabsTrigger value="skills" class="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          Kỹ năng
          {#if tabErrorCounts.skills > 0}<span class="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground" aria-label={t('task.create.tab_error_count', { count: tabErrorCounts.skills }, ':count errors')}>{tabErrorCounts.skills}</span>{/if}
        </TabsTrigger>
        <TabsTrigger value="assignment" class="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          Phân công
          {#if tabErrorCounts.assignment > 0}<span class="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground" aria-label={t('task.create.tab_error_count', { count: tabErrorCounts.assignment }, ':count errors')}>{tabErrorCounts.assignment}</span>{/if}
        </TabsTrigger>
        <TabsTrigger value="planning" class="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
          Kế hoạch
          {#if tabErrorCounts.planning > 0}<span class="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground" aria-label={t('task.create.tab_error_count', { count: tabErrorCounts.planning }, ':count errors')}>{tabErrorCounts.planning}</span>{/if}
        </TabsTrigger>
      {/if}
    </TabsList>

    <TabsContent value="setup" class="space-y-8 pt-2">
      <section class="space-y-8">
        <BasicFields
          {formData}
          {handleChange}
          {handleSelectChange}
          {statuses}
          {errors}
          {isPublish}
          {isDocumentationItem}
        />

        {#if isDocumentationItem}
          <div class="rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-4 text-sm text-foreground" role="status">
            <p class="font-semibold">{t('task.create.docs_status_title', {}, 'Mục Docs trên board')}</p>
          </div>
        {:else}
          <TaskBriefFields brief={taskBrief} section="brief" {errors} onChange={updateBrief} />
          <TaskBriefFields brief={taskBrief} section="scope" {errors} onChange={updateBrief} />
        {/if}
      </section>
    </TabsContent>

    {#if !isDocumentationItem}
    <TabsContent value="skills" class="space-y-4">
      <div class="space-y-8 pt-2">
        <TaskSkillsField
          required={!isDocumentationItem}
          requireRubric={!isDocumentationItem}
          requiredSkills={formData.required_skills}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
          availableSkills={availableSkills ?? []}
          proficiencyLevels={proficiencyLevels ?? []}
          error={fieldError('required_skills', 'required_skills.0.id', 'required_skills.0.skill_id', 'required_skills.0.level')}
        />

      </div>
    </TabsContent>

    <TabsContent value="assignment" class="space-y-6 pt-2">
      {#if assignmentContent}
        {@render assignmentContent()}
      {/if}
      <MetadataFields
        {formData}
        {handleSelectChange}
        {errors}
        {priorities}
        {labels}
        {users}
        assigneeGroups={assigneeGroups ?? { projectMembers: [], orgMembersOutsideProject: [] }}
        {parentTasks}
        {isPublish}
        {isDocumentationItem}
        section="assignment"
      />
    </TabsContent>

    <TabsContent value="planning" class="space-y-6 pt-2">
      <MetadataFields
        {formData}
        {handleSelectChange}
        {errors}
        {priorities}
        {labels}
        {users}
        assigneeGroups={assigneeGroups ?? { projectMembers: [], orgMembersOutsideProject: [] }}
        {parentTasks}
        {isPublish}
        {isDocumentationItem}
        section="planning"
        onEstimatedTimeChange={handleEstimatedTimeChange}
      />
      <DueDateField
        dueDate={parseDateInput(formData.due_date)}
        onDateChange={handleDateChange}
        error={errors.due_date}
      />
    </TabsContent>

    <TabsContent value="contract" class="space-y-8 pt-2">
      <TaskBriefFields
        brief={taskBrief}
        section="acceptance"
        {errors}
        onChange={updateBrief}
      />

      <section class="space-y-6 border-t border-border pt-7">
        <div>
          <TaskVerificationMethodsField
            value={formData.verification_method}
            error={errors.verification_method}
            required={!isDocumentationItem}
            onChange={(value: string) => {
              handleSelectChange('verification_method', value)
            }}
          />
        </div>

        <details class="rounded-xl border border-border bg-muted/10 p-4">
          <summary class="cursor-pointer text-sm font-medium text-foreground">Tài liệu tham khảo (tùy chọn)</summary>
          <div class="mt-4 grid gap-4 md:grid-cols-2">
            <div class="grid gap-2">
              <Label for="supporting_reference_title">{t('task.create.reference_title', {}, 'Reference title')}</Label>
              <input id="supporting_reference_title" class="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={formData.supporting_reference_title ?? ''} oninput={(event: Event) => handleTextareaInput('supporting_reference_title', (event.target as HTMLInputElement).value)} />
            </div>
            <div class="grid gap-2">
              <Label for="supporting_reference_uri">{t('task.create.supporting_reference_url', {}, 'Supporting reference URL (optional)')}</Label>
              <input id="supporting_reference_uri" type="url" class="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={formData.supporting_reference_uri ?? ''} placeholder="https://" oninput={(event: Event) => handleTextareaInput('supporting_reference_uri', (event.target as HTMLInputElement).value)} />
            </div>
          </div>

        </details>

        <div class="border-t border-border/70 pt-4">
            <label class="flex items-start gap-3 text-sm" for="creator_confirmed">
              <input id="creator_confirmed" class="mt-0.5 size-4 shrink-0" type="checkbox" required={!isDocumentationItem} aria-invalid={errors.creator_confirmed ? 'true' : undefined} aria-describedby={errors.creator_confirmed ? 'creator_confirmed-error' : undefined} checked={formData.creator_confirmed ?? false} onchange={(event: Event) => setFormData((prev) => ({ ...prev, creator_confirmed: (event.target as HTMLInputElement).checked }))} />
              <span class="leading-6">{t('task.create.creator_confirmed', {}, 'I confirm that this task has enough information for the assignee to start work')}<span class="ml-1 text-[#ef4444]" aria-hidden="true">*</span></span>
            </label>
            {#if errors.creator_confirmed}<p id="creator_confirmed-error" class="mt-2 text-xs font-medium text-destructive" role="alert">{errors.creator_confirmed}</p>{/if}
          </div>
      </section>
    </TabsContent>
    {/if}
  </Tabs>

</div>
