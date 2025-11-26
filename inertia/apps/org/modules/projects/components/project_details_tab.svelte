<script lang="ts">
  import Card from '@/apps/org/shared/ui/card.svelte'
  import CardContent from '@/apps/org/shared/ui/card_content.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import { useTranslation } from '@/apps/org/shared/hooks/use_translation.svelte'
  import type { Project } from '../types'

  interface Props {
    projectState: Project
    editing: boolean
    editForm: {
      name: string
      description: string
      status: string
    }
    formatDate: (d: string, options?: Intl.DateTimeFormatOptions) => string
  }

  let {
    projectState = $bindable(),
    editing = $bindable(),
    editForm = $bindable(),
    formatDate,
  }: Props = $props()

  const { t } = $derived(useTranslation())

  function statusLabel(status?: string | null): string {
    if (!status) return t('project.details_tab.empty_value', {}, 'None')
    return t(`project.status_${status}`, {}, status)
  }
</script>

<Card>
  <CardContent class="pt-6">
    <h2 class="mb-4 text-lg font-semibold">{t('project.details_tab.info_title', {}, 'Project information')}</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.description', {}, 'Description')}</p>
        {#if editing}
          <Textarea
            value={editForm.description}
            rows={4}
            oninput={(event: Event) => {
              editForm.description = (event.currentTarget as HTMLTextAreaElement).value
            }}
          />
        {:else}
          <p>{projectState.description ?? t('project.details_tab.empty_value', {}, 'None')}</p>
        {/if}
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.status', {}, 'Status')}</p>
        {#if editing}
          <select bind:value={editForm.status} class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="pending">{t('project.status_pending', {}, 'Pending')}</option>
            <option value="in_progress">{t('project.status_in_progress', {}, 'In progress')}</option>
            <option value="completed">{t('project.status_completed', {}, 'Completed')}</option>
            <option value="cancelled">{t('project.status_cancelled', {}, 'Cancelled')}</option>
          </select>
        {:else}
          <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
            {statusLabel(projectState.status)}
          </div>
        {/if}
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.start_date', {}, 'Start Date')}</p>
        <p>{projectState.start_date ? formatDate(projectState.start_date) : t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.end_date', {}, 'End Date')}</p>
        <p>{projectState.end_date ? formatDate(projectState.end_date) : t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.creator', {}, 'Creator')}</p>
        <p>{projectState.creator_name ?? t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>

      <div>
        <p class="mb-1 text-sm font-medium text-foreground/80">{t('project.manager', {}, 'Manager')}</p>
        <p>{projectState.manager_name ?? t('project.details_tab.empty_value', {}, 'None')}</p>
      </div>
    </div>
    {#if editing}
      <div class="mt-4 space-y-2">
        <Label for="project-name">{t('project.name', {}, 'Project Name')}</Label>
        <Input
          id="project-name"
          value={editForm.name}
          oninput={(event: Event) => {
            editForm.name = (event.currentTarget as HTMLInputElement).value
          }}
        />
      </div>
    {/if}
  </CardContent>
</Card>
