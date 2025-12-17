<script lang="ts">
  import Button from '@/apps/user/shared/ui/button.svelte'
  import Input from '@/apps/user/shared/ui/input.svelte'
  import Label from '@/apps/user/shared/ui/label.svelte'
  import Tabs from '@/apps/user/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/user/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/user/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/user/shared/ui/tabs_trigger.svelte'
  import Textarea from '@/apps/user/shared/ui/textarea.svelte'
  import {
    getTaskContractPreset,
    getTaskContractPresets,
    mergeTaskContractPreset,
  } from '@/apps/user/modules/tasks/lib/rules/task_contract_presets'
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
  import TaskVerificationMethodsField from '@/apps/user/modules/tasks/components/shared/task_verification_methods_field.svelte'

  interface Props {
    formData: TaskCreateFormData
    setFormData: (updater: (prev: typeof formData) => typeof formData) => void
    errors: Record<string, string>
    statuses: { value: string; label: string }[]
    priorities: { value: string; label: string }[]
    labels: { value: string; label: string }[]
    users: { id: string; username: string; email: string }[]
    assigneeGroups?: TaskCreateAssigneeGroups
    parentTasks: { id: string; title: string; task_status_id: string | null }[]
    availableSkills?: { id: string; name: string; categoryCode?: string | null }[]
    projects?: { id: string; name: string }[]
    proficiencyLevels?: { value: string; label: string }[]
    selectedProjectVisibility?: string | null
    formError?: string
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
    projects,
    proficiencyLevels,
    selectedProjectVisibility = null,
    formError,
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
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const [dueDate] = date.toISOString().split('T')
      setFormData(prev => ({
        ...prev,
        due_date: dueDate ?? ''
      }))
    } else {
      setFormData(prev => ({ ...prev, due_date: '' }))
    }
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

  const contractPresets = $derived(getTaskContractPresets(t))
  const selectedContractPreset = $derived(getTaskContractPreset(formData.task_type, t))
  let activeTab = $state<'setup' | 'skills' | 'contract'>('setup')

  function applyContractPreset(taskType: string) {
    const preset = getTaskContractPreset(taskType, t)
    if (!preset) return

    setFormData((prev) => mergeTaskContractPreset(prev, preset))
  }

</script>

<div class="space-y-4 py-4">
  {#if formError}
    <div
      class="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
      role="alert"
    >
      {formError}
    </div>
  {/if}

  <Tabs
    value={activeTab}
    onValueChange={(value) => {
      activeTab = value as typeof activeTab
    }}
    class="space-y-4"
  >
    <TabsList class="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/50 p-1">
      <TabsTrigger value="setup">{t('task.create.setup_tab', {}, 'Setup')}</TabsTrigger>
      <TabsTrigger value="skills">{t('task.create.skills_tab', {}, 'Skills')}</TabsTrigger>
      <TabsTrigger value="contract">{t('task.create.contract_tab', {}, 'Acceptance')}</TabsTrigger>
    </TabsList>

    <TabsContent value="setup" class="space-y-4">
      <div class="rounded-lg border bg-muted/10 p-4">
        <h3 class="mb-4 text-sm font-semibold">{t('task.create.task_info', {}, 'Task information')}</h3>

        <div class="space-y-4">
          <BasicFields
            {formData}
            {handleChange}
            {errors}
          />

          <MetadataFields
            {formData}
            {handleSelectChange}
            {errors}
            {statuses}
            {priorities}
            {labels}
            {users}
            assigneeGroups={assigneeGroups ?? { projectMembers: [], orgMembersOutsideProject: [] }}
            {parentTasks}
            projects={projects ?? []}
            {selectedProjectVisibility}
          />

          <DueDateField
            dueDate={formData.due_date ? new Date(formData.due_date) : undefined}
            onDateChange={handleDateChange}
            error={errors.due_date}
          />
        </div>
      </div>
    </TabsContent>

    <TabsContent value="skills" class="space-y-4">
      <div class="rounded-lg border bg-muted/10 p-4">
        <h3 class="mb-4 text-sm font-semibold">{t('task.create.skills_heading', {}, 'Skills')}</h3>

        <TaskSkillsField
          requiredSkills={formData.required_skills}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
          availableSkills={availableSkills ?? []}
          proficiencyLevels={proficiencyLevels ?? []}
          error={fieldError('required_skills', 'required_skills.0.id', 'required_skills.0.skill_id', 'required_skills.0.level')}
        />
      </div>
    </TabsContent>

    <TabsContent value="contract" class="space-y-4">
      <div class="grid gap-4 rounded-lg border bg-muted/10 p-4">
        <h3 class="text-sm font-semibold">{t('task.create.contract_details', {}, 'Acceptance criteria and context')}</h3>

        <div class="rounded-lg border border-border bg-background/80 p-3">
          <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('task.create.contract_preset', {}, 'Contract preset')}
              </p>
              {#if selectedContractPreset}
                <p class="mt-2 text-xs text-muted-foreground">
                  <span class="font-semibold text-foreground">{selectedContractPreset.label}</span>
                </p>
              {/if}
            </div>
            {#if selectedContractPreset}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onclick={() => {
                  applyContractPreset(selectedContractPreset.taskType)
                }}
              >
                {t('task.create.apply_current_preset', {}, 'Apply current preset')}
              </Button>
            {/if}
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each contractPresets as preset (preset.taskType)}
              <Button
                type="button"
                size="sm"
                variant={formData.task_type === preset.taskType ? 'default' : 'outline'}
                onclick={() => {
                  applyContractPreset(preset.taskType)
                }}
              >
                {preset.label}
              </Button>
            {/each}
          </div>
        </div>

        <TaskVerificationMethodsField
          value={formData.verification_method}
          error={errors.verification_method}
          onChange={(value: string) => {
            handleSelectChange('verification_method', value)
          }}
        />

        <div class="grid gap-2">
          <Label for="acceptance_criteria">
            {t('task.create.acceptance_criteria', {}, 'Acceptance criteria')}<span class="ml-1 text-destructive">*</span>
          </Label>
          <Textarea
            id="acceptance_criteria"
            value={formData.acceptance_criteria}
            rows={4}
            placeholder={t('task.create.acceptance_criteria_placeholder', {}, 'Completion and acceptance conditions')}
            oninput={(event: Event) => {
              handleTextareaInput(
                'acceptance_criteria',
                (event.target as HTMLTextAreaElement).value
              )
            }}
          />
          {#if errors.acceptance_criteria}
            <p class="text-xs text-destructive">{errors.acceptance_criteria}</p>
          {/if}
        </div>

        <div class="grid gap-2">
          <Label for="context_background">{t('task.create.context_background', {}, 'Additional context')}</Label>
          <Textarea
            id="context_background"
            value={formData.context_background}
            rows={3}
            placeholder={t('task.create.context_background_placeholder', {}, 'Additional background context')}
            oninput={(event: Event) => {
              handleTextareaInput(
                'context_background',
                (event.target as HTMLTextAreaElement).value
              )
            }}
          />
          {#if errors.context_background}
            <p class="text-xs text-destructive">{errors.context_background}</p>
          {/if}
        </div>

        <div class="grid gap-4 md:grid-cols-2">
        <div class="grid gap-2">
          <Label for="tech_stack_text">{t('task.create.tech_stack', {}, 'Tech stack')}</Label>
          <Input
              id="tech_stack_text"
              value={formData.tech_stack_text}
              placeholder="React, AdonisJS, PostgreSQL, Docker"
            oninput={(event: Event) => {
              handleTextareaInput(
                'tech_stack_text',
                (event.target as HTMLInputElement).value
              )
            }}
          />
          {#if fieldError('tech_stack', 'tech_stack.0')}
            <p class="text-xs text-destructive">{fieldError('tech_stack', 'tech_stack.0')}</p>
          {/if}
          </div>

          <div class="grid gap-2">
            <Label for="domain_tags_text">{t('task.create.domain_tags', {}, 'Domain tags')}</Label>
            <Input
              id="domain_tags_text"
              value={formData.domain_tags_text}
              placeholder="marketplace, auth, billing"
              oninput={(event: Event) => {
                handleTextareaInput(
                  'domain_tags_text',
                  (event.target as HTMLInputElement).value
                )
              }}
            />
            {#if fieldError('domain_tags', 'domain_tags.0')}
              <p class="text-xs text-destructive">{fieldError('domain_tags', 'domain_tags.0')}</p>
            {/if}
          </div>
        </div>

        <div class="grid gap-2">
          <Label for="learning_objectives_text">{t('task.create.learning_objectives', {}, 'Learning objectives')}</Label>
          <Textarea
            id="learning_objectives_text"
            value={formData.learning_objectives_text}
            rows={3}
            placeholder={t('task.create.learning_objectives_placeholder', {}, 'One objective per line')}
            oninput={(event: Event) => {
              handleTextareaInput(
                'learning_objectives_text',
                (event.target as HTMLTextAreaElement).value
              )
            }}
          />
          {#if fieldError('learning_objectives', 'learning_objectives.0')}
            <p class="text-xs text-destructive">{fieldError('learning_objectives', 'learning_objectives.0')}</p>
          {/if}
        </div>
      </div>
    </TabsContent>
  </Tabs>
</div>
