<script lang="ts">
  import axios from 'axios'
  import { LoaderCircle } from 'lucide-svelte'
  import Dialog from '@/apps/org/shared/ui/dialog.svelte'
  import DialogContent from '@/apps/org/shared/ui/dialog_content.svelte'
  import DialogHeader from '@/apps/org/shared/ui/dialog_header.svelte'
  import DialogTitle from '@/apps/org/shared/ui/dialog_title.svelte'
  import Button from '@/apps/org/shared/ui/button.svelte'
  import Input from '@/apps/org/shared/ui/input.svelte'
  import Label from '@/apps/org/shared/ui/label.svelte'
  import Textarea from '@/apps/org/shared/ui/textarea.svelte'
  import { uiToast } from '@/apps/org/shared/lib/ui_toast'
  import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

  interface RoleTemplate {
    id: string
    code: string
    name: string
    description?: string
  }

  interface Props {
    projectId: string
    open: boolean
    templates: RoleTemplate[]
    onAddSuccess: () => void
  }

  let {
    projectId,
    open = $bindable(),
    templates,
    onAddSuccess,
  }: Props = $props()

  let roleCreationType = $state<'template' | 'custom'>('template')
  let selectedTemplateId = $state('')
  let customCode = $state('')
  let customName = $state('')
  let customDescription = $state('')
  let addingRole = $state(false)
  const { t } = useTranslation()

  function resetForm() {
    selectedTemplateId = ''
    customCode = ''
    customName = ''
    customDescription = ''
    roleCreationType = 'template'
  }

  async function handleAddRole(e: Event) {
    e.preventDefault()
    addingRole = true
    try {
      const payload =
        roleCreationType === 'template'
          ? { templateId: selectedTemplateId }
          : { code: customCode, name: customName, description: customDescription }
      await axios.post(`/api/v1/projects/${projectId}/professional-roles`, payload)
      uiToast.success(t('project.role_dialog.create_success', {}, 'Role created'))
      open = false
      resetForm()
      onAddSuccess()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      uiToast.error(error.response?.data?.message ?? t('project.role_dialog.create_error', {}, 'Unable to create role'))
    } finally {
      addingRole = false
    }
  }

  function handleCancel() {
    open = false
    resetForm()
  }
</script>

{#if open}
  <Dialog bind:open={open}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{t('project.role_dialog.title', {}, 'Add role')}</DialogTitle>
      </DialogHeader>
      <form onsubmit={handleAddRole} class="space-y-4 pt-2">
        <div class="flex gap-1 p-1 rounded-lg bg-secondary text-sm">
          <button
            type="button"
            class="flex-1 py-1.5 rounded-md font-medium transition-colors
              {roleCreationType === 'template' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => { roleCreationType = 'template' }}
          >
            {t('project.role_dialog.clone_template', {}, 'Clone from template')}
          </button>
          <button
            type="button"
            class="flex-1 py-1.5 rounded-md font-medium transition-colors
              {roleCreationType === 'custom' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'}"
            onclick={() => { roleCreationType = 'custom' }}
          >
            {t('project.role_dialog.custom_blank', {}, 'Custom blank')}
          </button>
        </div>

        {#if roleCreationType === 'template'}
          <div class="space-y-1.5">
            <Label for="tpl-select">{t('project.role_dialog.template_label', {}, 'Choose template')}</Label>
            <select
              id="tpl-select"
              bind:value={selectedTemplateId}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              required
            >
              <option value="" disabled>{t('project.role_dialog.template_placeholder', {}, 'Choose template')}</option>
              {#each templates as t (t.id)}
                <option value={t.id}>{t.name} ({t.code})</option>
              {/each}
            </select>
            {#if selectedTemplateId}
              {@const tpl = templates.find((t) => t.id === selectedTemplateId)}
              {#if tpl?.description}
                <p class="text-xs text-muted-foreground">{tpl.description}</p>
              {/if}
            {/if}
          </div>
        {:else}
          <div class="space-y-3">
            <div class="space-y-1.5">
              <Label for="custom-code">{t('project.role_dialog.code_label', {}, 'Role code')}</Label>
              <Input
                id="custom-code"
                bind:value={customCode}
                placeholder={t(
                  'project.role_dialog.code_placeholder',
                  {},
                  'e.g. lead_backend_engineer'
                )}
                required
              />
            </div>
            <div class="space-y-1.5">
              <Label for="custom-name">{t('project.role_dialog.name_label', {}, 'Display name')}</Label>
              <Input
                id="custom-name"
                bind:value={customName}
                placeholder={t(
                  'project.role_dialog.name_placeholder',
                  {},
                  'e.g. Lead Backend Engineer'
                )}
                required
              />
            </div>
            <div class="space-y-1.5">
              <Label for="custom-desc">{t('project.role_dialog.description_label', {}, 'Description (optional)')}</Label>
              <Textarea id="custom-desc" bind:value={customDescription} rows={2} placeholder={t('project.role_dialog.description_placeholder', {}, 'Describe the role...')} />
            </div>
          </div>
        {/if}

        <div class="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onclick={handleCancel}>{t('project.role_dialog.cancel', {}, 'Cancel')}</Button>
          <Button type="submit" disabled={addingRole || (roleCreationType === 'template' && !selectedTemplateId) || (roleCreationType === 'custom' && (!customCode || !customName))}>
            {#if addingRole}<LoaderCircle class="h-4 w-4 animate-spin mr-1.5" />{/if}
            {t('project.role_dialog.submit', {}, 'Create role')}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
{/if}
