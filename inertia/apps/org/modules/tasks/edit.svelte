<script lang="ts">
  import { router } from '@inertiajs/svelte'

  import Badge from '@/apps/org/shared/ui/badge.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import CardFooter from '@/apps/org/shared/ui/card_footer.svelte'
  import CardHeader from '@/apps/org/shared/ui/card_header.svelte'
  import CardTitle from '@/apps/org/shared/ui/card_title.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Tabs from '@/apps/org/shared/ui/tabs.svelte'
  import TabsContent from '@/apps/org/shared/ui/tabs_content.svelte'
  import TabsList from '@/apps/org/shared/ui/tabs_list.svelte'
  import TabsTrigger from '@/apps/org/shared/ui/tabs_trigger.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import OrganizationLayout from '@/apps/org/shared/layouts/organization_layout.svelte'
  import {
    BUSINESS_DOMAIN_OPTIONS,
    PROBLEM_CATEGORY_OPTIONS,
    ROLE_IN_TASK_OPTIONS,
    TASK_TYPE_OPTIONS,
  } from '@/apps/org/modules/tasks/lib/task_taxonomy'
  import TaskVerificationMethodsField from '@/apps/org/modules/tasks/components/shared/task_verification_methods_field.svelte'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  import TaskAssignmentFields from '@/apps/org/modules/tasks/components/forms/task_assignment_fields.svelte'
  import TaskPriorityLabelFields from '@/apps/org/modules/tasks/components/forms/task_priority_label_fields.svelte'
  import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'

  interface Props {
    shellMode?: 'app' | 'organization'
    auth?: { user?: { current_organization_role?: string | null } }
    task: TaskDetail
    metadata: {
      statuses: { value: string; label: string }[]
      labels: { value: string; label: string }[]
      priorities: { value: string; label: string }[]
      users: { id: string; username: string; email: string }[]
      parentTasks?: { id: string; title: string; task_status_id: string | null }[]
      projects?: { id: string; name: string }[]
    }
    permissions: {
      canEdit: boolean
      canDelete: boolean
      canAssign: boolean
      canChangeStatus: boolean
    }
  }

  interface TaskEditFormData {
    title: string
    description: string
    priority: string
    label: string
    project_id: string
    assigned_to: string
    task_visibility: 'internal' | 'external' | 'all'
    due_date: string
    estimated_time: string
    actual_time: string
    parent_task_id: string
    task_type: string
    verification_method: string
    acceptance_criteria: string
    context_background: string
    tech_stack_text: string
    learning_objectives_text: string
    domain_tags_text: string
    environment: string
    collaboration_type: string
    complexity_notes: string
    role_in_task: string
    autonomy_level: string
    problem_category: string
    business_domain: string
    estimated_users_affected: string
  }

  const { task, metadata, permissions }: Props = $props()
  
  const { t } = useTranslation()

  const buildInitialFormData = (): TaskEditFormData => ({
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    label: task.label,
    project_id: task.project_id,
    assigned_to: task.assigned_to ?? '',
    task_visibility: task.task_visibility ?? 'internal',
    due_date: task.due_date ?? '',
    estimated_time: task.estimated_time != null ? String(task.estimated_time) : '',
    actual_time: task.actual_time != null ? String(task.actual_time) : '',
    parent_task_id: task.parent_task_id ?? '',
    task_type: task.task_type ?? 'feature_development',
    verification_method: task.verification_method ?? '',
    acceptance_criteria: task.acceptance_criteria ?? '',
    context_background: task.context_background ?? '',
    tech_stack_text: task.tech_stack ? task.tech_stack.join(', ') : '',
    learning_objectives_text: task.learning_objectives ? task.learning_objectives.join('\n') : '',
    domain_tags_text: task.domain_tags ? task.domain_tags.join(', ') : '',
    environment: task.environment ?? '',
    collaboration_type: task.collaboration_type ?? '',
    complexity_notes: task.complexity_notes ?? '',
    role_in_task: task.role_in_task ?? '',
    autonomy_level: task.autonomy_level ?? '',
    problem_category: task.problem_category ?? '',
    business_domain: task.business_domain ?? '',
    estimated_users_affected: task.estimated_users_affected != null ? String(task.estimated_users_affected) : '',
  })

  let formData = $state(buildInitialFormData())
  let activeTab = $state<'basic' | 'context'>('basic')

  let errors = $state<Record<string, string>>({})
  let submitting = $state(false)

  const pageTitle = $derived(t('task.edit_task', {}, 'Edit Task'))
  const currentStatusLabel = $derived(
    metadata.statuses.find((status) => status.value === task.task_status_id)?.label ?? task.status
  )
  const selectedAssignee = $derived(
    metadata.users.find((user) => user.id === formData.assigned_to) ?? null
  )

  const handleChange = (event: Event) => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement
    formData = { ...formData, [target.name]: target.value }
  }

  const handleSelectChange = (name: string, value: string) => {
    formData = { ...formData, [name]: value }
  }

  function taskVisibilityLabel(value: TaskEditFormData['task_visibility']): string {
    switch (value) {
      case 'internal':
        return t('task.edit.visibility_internal', {}, 'Organization only')
      case 'external':
        return t('task.edit.visibility_external', {}, 'Marketplace')
      case 'all':
        return t('task.edit.visibility_all', {}, 'Hybrid: internal + marketplace')
    }
  }

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = t('task.edit.title_required', {}, 'Title is required')
    }

    if (!formData.project_id) {
      newErrors.project_id = t('task.edit.project_required', {}, 'Project is required')
    }

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      return
    }

    const parseListInput = (raw: string) =>
      raw
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

    const {
      tech_stack_text: techStackText,
      learning_objectives_text: learningObjectivesText,
      domain_tags_text: domainTagsText,
      ...payloadBase
    } = formData

    const payload = {
      ...payloadBase,
      role_in_task: formData.role_in_task || undefined,
      business_domain: formData.business_domain || undefined,
      problem_category: formData.problem_category || undefined,
      tech_stack: parseListInput(techStackText),
      learning_objectives: parseListInput(learningObjectivesText),
      domain_tags: parseListInput(domainTagsText),
      estimated_users_affected: formData.estimated_users_affected ? Number(formData.estimated_users_affected) : undefined,
    }

    submitting = true

    router.put(`/tasks/${task.id}`, payload, {
      preserveState: true,
      preserveScroll: true,
      onSuccess: () => {
        submitting = false
      },
      onError: (errorResponse) => {
        submitting = false
        errors = errorResponse
      },
    })
  }

  const handleCancel = () => {
    router.visit(`/tasks/${task.id}`)
  }
</script>

<svelte:head>
  <title>{pageTitle}</title>
</svelte:head>

<OrganizationLayout title={pageTitle}>
  <div class="mx-auto max-w-4xl p-4 sm:p-6">
    <Card class="border border-border shadow-xs">
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
        <div class="rounded-lg border bg-muted/20 p-3">
          <p class="font-medium text-foreground">
            {t('task.edit.current_status', {}, 'Current status')}:
            <Badge variant="outline" class="ml-2">{currentStatusLabel}</Badge>
          </p>
        </div>
        <div class="grid gap-3 md:grid-cols-3">
          <div class="rounded-2xl border border-border bg-background/80 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('task.edit.organization', {}, 'Organization')}</p>
            <p class="mt-2 text-sm text-foreground">{t('task.edit.organization_scope_label', {}, 'Organization-level public/private access is not configured. Tasks are always created inside the current organization.')}</p>
          </div>
          <div class="rounded-2xl border border-border bg-background/80 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('task.edit.task_access', {}, 'Task access')}</p>
            <p class="mt-2 text-sm text-foreground">{taskVisibilityLabel(formData.task_visibility)}</p>
          </div>
          <div class="rounded-2xl border border-border bg-background/80 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('task.edit.assignee', {}, 'Assignee')}</p>
            <p class="mt-2 text-sm text-foreground">
              {selectedAssignee?.username ?? selectedAssignee?.email ?? t('task.edit.unassigned_assignee', {}, 'No assignee')}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => { activeTab = value as 'basic' | 'context' }} class="space-y-4">
          <TabsList class="h-auto w-full justify-start overflow-x-auto rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="basic">{t('task.edit.basic_tab', {}, 'Basic')}</TabsTrigger>
            <TabsTrigger value="context">{t('task.edit.context_tab', {}, 'Acceptance & context')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" class="space-y-6">
            <div class="grid gap-2">
              <Label for="title" class="font-bold">
                {t('task.title', {}, 'Title')} <span class="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onchange={handleChange}
                placeholder={t('task.enter_title', {}, 'Enter task title')}
                class={errors.title ? 'border-destructive' : ''}
                autofocus
              />
              {#if errors.title}
                <p class="text-xs font-bold text-destructive">{errors.title}</p>
              {/if}
            </div>

            <div class="grid gap-2">
              <Label for="description" class="font-bold">{t('task.description', {}, 'Description')}</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onchange={handleChange}
                placeholder={t('task.enter_description', {}, 'Enter detailed description for this task')}
                rows={8}
              />
            </div>

            <TaskPriorityLabelFields
              formData={{
                priority: formData.priority,
                label: formData.label,
              }}
              priorities={metadata.priorities}
              labels={metadata.labels}
              onSelectChange={handleSelectChange}
            />

            <TaskAssignmentFields
              formData={{
                project_id: formData.project_id,
                assigned_to: formData.assigned_to,
                parent_task_id: formData.parent_task_id,
                task_visibility: formData.task_visibility,
              }}
              projects={metadata.projects ?? []}
              users={metadata.users}
              parentTasks={metadata.parentTasks ?? []}
              taskId={task.id}
              canAssign={permissions.canAssign}
              projectError={errors.project_id}
              onSelectChange={handleSelectChange}
            />

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div class="grid gap-2">
                <Label for="due_date" class="font-bold">{t('task.due_date', {}, 'Due date')}</Label>
                <Input id="due_date" name="due_date" type="date" value={formData.due_date} onchange={handleChange} />
              </div>

              <div class="grid gap-2">
                <Label for="estimated_time" class="font-bold">{t('task.estimated_time', {}, 'Estimated time (hours)')}</Label>
                <Input
                  id="estimated_time"
                  name="estimated_time"
                  type="number"
                  value={formData.estimated_time}
                  onchange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>

              <div class="grid gap-2">
                <Label for="actual_time" class="font-bold">{t('task.actual_time', {}, 'Actual time (hours)')}</Label>
                <Input
                  id="actual_time"
                  name="actual_time"
                  type="number"
                  value={formData.actual_time}
                  onchange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="context" class="space-y-4">
            <div class="grid gap-4 rounded-lg border bg-muted/10 p-4">
              <div class="space-y-1 col-span-full">
                <h3 class="text-sm font-semibold">{t('task.edit.task_context', {}, 'Task context')}</h3>
              </div>

              <div class="grid gap-4 md:grid-cols-2 col-span-full">
                <div class="grid gap-2">
                  <Label for="task_type" class="font-bold">{t('task.edit.task_type', {}, 'Task type')}</Label>
                  <select
                    id="task_type"
                    name="task_type"
                    class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.task_type}
                    onchange={(event: Event) => {
                      handleSelectChange('task_type', (event.target as HTMLSelectElement).value)
                    }}
                  >
                    {#each TASK_TYPE_OPTIONS as option (option.value)}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </div>
                <div class="grid gap-2">
                  <TaskVerificationMethodsField
                    value={formData.verification_method}
                    error={errors.verification_method}
                    onChange={(value: string) => {
                      handleSelectChange('verification_method', value)
                    }}
                  />
                </div>
              </div>

              <div class="grid gap-2 col-span-full">
                <Label for="acceptance_criteria" class="font-bold">{t('task.edit.acceptance_criteria', {}, 'Acceptance criteria')}</Label>
                <Textarea
                  id="acceptance_criteria"
                  name="acceptance_criteria"
                  value={formData.acceptance_criteria}
                  onchange={handleChange}
                  rows={3}
                  placeholder={t('task.edit.acceptance_criteria_placeholder', {}, 'Task acceptance criteria...')}
                />
              </div>

              <div class="grid gap-2 col-span-full">
                <Label for="context_background" class="font-bold">{t('task.edit.context_background', {}, 'Business context')}</Label>
                <Textarea
                  id="context_background"
                  name="context_background"
                  value={formData.context_background}
                  onchange={handleChange}
                  rows={3}
                  placeholder={t('task.edit.context_background_placeholder', {}, 'Why this task exists...')}
                />
              </div>

              <div class="grid gap-4 md:grid-cols-2 col-span-full">
                <div class="grid gap-2">
                  <Label for="tech_stack_text" class="font-bold">{t('task.edit.tech_stack', {}, 'Tech stack')}</Label>
                  <Input id="tech_stack_text" name="tech_stack_text" value={formData.tech_stack_text} onchange={handleChange} placeholder={t('task.edit.tech_stack_placeholder', {}, 'e.g. React, AdonisJS...')} />
                </div>
                <div class="grid gap-2">
                  <Label for="domain_tags_text" class="font-bold">{t('task.edit.domain_tags', {}, 'Domain tags')}</Label>
                  <Input id="domain_tags_text" name="domain_tags_text" value={formData.domain_tags_text} onchange={handleChange} placeholder={t('task.edit.domain_tags_placeholder', {}, 'e.g. auth, payment...')} />
                </div>
              </div>

              <div class="grid gap-2 col-span-full">
                <Label for="learning_objectives_text" class="font-bold">{t('task.edit.learning_objectives', {}, 'Learning objectives')}</Label>
                <Textarea
                  id="learning_objectives_text"
                  name="learning_objectives_text"
                  value={formData.learning_objectives_text}
                  onchange={handleChange}
                  rows={2}
                  placeholder={t('task.edit.learning_objectives_placeholder', {}, 'One objective per line...')}
                />
              </div>

              <div class="grid gap-4 md:grid-cols-3 col-span-full">
                <div class="grid gap-2">
                  <Label for="environment" class="font-bold">{t('task.edit.environment', {}, 'Environment')}</Label>
                  <Input id="environment" name="environment" value={formData.environment} onchange={handleChange} placeholder={t('task.edit.environment_placeholder', {}, 'e.g. staging, production...')} />
                </div>
                <div class="grid gap-2">
                  <Label for="collaboration_type" class="font-bold">{t('task.edit.collaboration_type', {}, 'Collaboration type')}</Label>
                  <Input id="collaboration_type" name="collaboration_type" value={formData.collaboration_type} onchange={handleChange} placeholder={t('task.edit.collaboration_type_placeholder', {}, 'e.g. solo, pair...')} />
                </div>
                <div class="grid gap-2">
                  <Label for="complexity_notes" class="font-bold">{t('task.edit.complexity_notes', {}, 'Complexity notes')}</Label>
                  <Input id="complexity_notes" name="complexity_notes" value={formData.complexity_notes} onchange={handleChange} placeholder={t('task.edit.complexity_notes_placeholder', {}, 'Additional notes...')} />
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-3 col-span-full">
                <div class="grid gap-2">
                  <Label for="role_in_task" class="font-bold">{t('task.edit.role_in_task', {}, 'Role in task')}</Label>
                  <select
                    id="role_in_task"
                    name="role_in_task"
                    class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.role_in_task}
                    onchange={(event: Event) => {
                      handleSelectChange('role_in_task', (event.target as HTMLSelectElement).value)
                    }}
                  >
                    <option value="">{t('task.edit.no_selection', {}, 'No selection')}</option>
                    {#each ROLE_IN_TASK_OPTIONS as option (option.value)}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </div>
                <div class="grid gap-2">
                  <Label for="autonomy_level" class="font-bold">{t('task.edit.autonomy_level', {}, 'Autonomy level')}</Label>
                  <Input id="autonomy_level" name="autonomy_level" value={formData.autonomy_level} onchange={handleChange} placeholder={t('task.edit.autonomy_level_placeholder', {}, 'e.g. high, medium...')} />
                </div>
                <div class="grid gap-2">
                  <Label for="problem_category" class="font-bold">{t('task.edit.problem_category', {}, 'Problem category')}</Label>
                  <select
                    id="problem_category"
                    name="problem_category"
                    class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.problem_category}
                    onchange={(event: Event) => {
                      handleSelectChange('problem_category', (event.target as HTMLSelectElement).value)
                    }}
                  >
                    <option value="">{t('task.edit.no_selection', {}, 'No selection')}</option>
                    {#each PROBLEM_CATEGORY_OPTIONS as option (option.value)}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2 col-span-full">
                <div class="grid gap-2">
                  <Label for="business_domain" class="font-bold">{t('task.edit.business_domain', {}, 'Business domain')}</Label>
                  <select
                    id="business_domain"
                    name="business_domain"
                    class="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.business_domain}
                    onchange={(event: Event) => {
                      handleSelectChange('business_domain', (event.target as HTMLSelectElement).value)
                    }}
                  >
                    <option value="">{t('task.edit.no_selection', {}, 'No selection')}</option>
                    {#each BUSINESS_DOMAIN_OPTIONS as option (option.value)}
                      <option value={option.value}>{option.label}</option>
                    {/each}
                  </select>
                </div>
                <div class="grid gap-2">
                  <Label for="estimated_users_affected" class="font-bold">{t('task.edit.estimated_users_affected', {}, 'Estimated affected users')}</Label>
                  <Input id="estimated_users_affected" name="estimated_users_affected" type="number" value={formData.estimated_users_affected} onchange={handleChange} placeholder="0" />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter class="flex justify-end gap-3 border-t-2 border-border pt-6">
        <Button variant="outline" onclick={handleCancel} disabled={submitting}>
          {t('common.cancel', {}, 'Cancel')}
        </Button>
        <Button onclick={handleSubmit} disabled={submitting}>
          {submitting ? t('common.saving', {}, 'Saving...') : t('common.save', {}, 'Save changes')}
        </Button>
      </CardFooter>
    </Card>
  </div>
</OrganizationLayout>
